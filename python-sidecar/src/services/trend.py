import asyncio
from collections import Counter
import json
import re
from typing import List, Dict
import uuid
import dspy
from src.repositories.trend import TrendRepository 
from src.services.arxiv import ArxivService
from src.models.trend import TrendAnalysis, PaperTagCache
from src.dto.trend import TrendGenerateRequest, TrendAnalysisResponse, TrendTaskResponse, TrendStatusResponse
from src.core.logger import get_logger
from src.services.lm_setting import LMSettingService, get_lm_for_task
from src.models.lm_setting import LMTask
from src.dto.local_paper import LocalPaperResponse
from src.core.state import SystemState

_logger = get_logger("[PythonSidecar - Trend Service]")

# In-memory job store: task_id -> TrendStatusResponse
# Note: For production at scale, use Redis, but for a desktop app with 1 user, a dict is sufficient.
_JOB_STORE: Dict[str, TrendStatusResponse] = {}

class PaperTaggerSignature(dspy.Signature):
    """
    TASK: Extract high-level metadata from a research paper abstract.
    
    STRICT RULES:
    1. DOMAIN: Choose the closest one from this list: [NLP, Computer Vision, Multimodal, Reinforcement Learning, Robotics, Audio/Speech, Optimization, AI Safety, Medical AI, Graph Neural Networks].
    2. RESEARCH TASK: A very short noun phrase (max 3 words). Example: "Image Generation", "Long-context Reasoning".
    3. TECHNIQUES: List 2-3 specific technical names. 
       - NO explanations, NO parentheses, NO verbs.
       - Example: ["LoRA", "Transformer", "Quantization"] - NOT ["Using LoRA for adaptation"].
    """
    
    abstract: str = dspy.InputField(desc="The abstract of the research paper.")
    
    domain: str = dspy.OutputField(desc="One category from the allowed list.")
    research_task: str = dspy.OutputField(desc="Short task name (max 3 words).")
    techniques: List[str] = dspy.OutputField(desc="List of 2-3 technical keywords.")
    
class TrendSynthesizerSignature(dspy.Signature):
    """
    You are a senior AI Research Intelligence Analyst.

    TASK:
    Write a long-form, structured weekly intelligence report from:
    - stats_data (JSON statistics)
    - exemplar_data (paper titles/examples)
    - time_window

    CRITICAL OUTPUT RULES (MUST FOLLOW):
    1) Output in Markdown with EXACT section headings below (same order):
        ## Executive Summary
        ## Domain Analysis
        ## Emerging Techniques
        ## Strategic Recommendations
        ## Implementation Roadmap
        ## Risks and Watchlist

    2) Minimum length: 1500 words.
        Target range: 1500-3000 words.
        Do NOT output a short summary.

    3) Evidence requirement:
        - In "Domain Analysis", mention specific paper titles from exemplar_data.
        - Cite at least 1-2 concrete paper titles per major domain when available.
        - If evidence is missing, explicitly state: "Insufficient evidence from exemplar_data".

    4) Section requirements:
        - Executive Summary: exactly 1 paragraph, 120-180 words.
        - Domain Analysis: at least 3 paragraphs, each focused on one major domain trend.
        - Emerging Techniques: at least 2 paragraphs, explain why each technique is rising and practical engineering impact.
        - Strategic Recommendations: exactly 3 numbered recommendations (1,2,3), each 60-100 words.
        - Implementation Roadmap: 3 phases (Now, Next, Later) with concrete actions.
        - Risks and Watchlist: at least 3 risks with mitigation notes.

    5) Writing style:
        - Professional, analytical, and practical for IT engineering leaders.
        - Use concrete language, avoid vague claims.
        - Avoid repeating the same sentence pattern.

    6) Final self-check before finishing:
        - Ensure all 6 required headings are present.
        - Ensure word count is >= 1500.
        - Ensure recommendations are exactly 3 items.
    """
    
    stats_data: str = dspy.InputField(desc="JSON string containing frequencies of domains and techniques.")
    exemplar_data: str = dspy.InputField(desc="A summary of top paper titles for each major domain/technique.")
    time_window: str = dspy.InputField(desc="The analysis period.")
    
    trend_report: str = dspy.OutputField(desc="The comprehensive Markdown report.")

class TrendService:
    def __init__(self, arxiv_service: ArxivService, lm_setting_service: LMSettingService,
                 trend_repo: TrendRepository, system_state: SystemState):
        self.arxiv_service = arxiv_service
        self.trend_repo = trend_repo
        self.lm_setting_service = lm_setting_service
        self.system_state = system_state
        # Initialize the DSPy module
        self.tagger = dspy.ChainOfThought(PaperTaggerSignature)
        self.synthesizer = dspy.ChainOfThought(TrendSynthesizerSignature)

    async def generate_trend_radar(self, req: TrendGenerateRequest) -> TrendAnalysisResponse:
        """
        Legacy method for synchronous trend generation.
        This method is kept for backward compatibility but is not recommended for long-running tasks.
        Use start_trend_generation() instead for better UX with polling.
        """
        # Step 1: Acquisition (Sprint 2.1)
        papers = await self.arxiv_service.fetch_bulk_papers(
            days=req.days,
            query=req.query,
            categories=req.categories,
            max_results=req.max_papers
        )
        
        # Step 2: Map Phase - Tagging (Sprint 2.2)
        tagged_results = await self._tag_papers_parallel(papers, task_id=None)
        
        if not tagged_results:
            raise ValueError("Failed to extract tags from papers.")

        # --- STEP 3: REDUCE PHASE (Synthesis) ---
        return await self._execute_reduce_phase(tagged_results, req.days, task_id=None)

    async def start_trend_generation(self, req: TrendGenerateRequest) -> TrendTaskResponse:
        """
        Starts the generation process in the background and returns a Task ID.
        """
        task_id = str(uuid.uuid4())
        
        # Init job status
        _JOB_STORE[task_id] = TrendStatusResponse(
            task_id=task_id,
            status="pending",
            progress=0,
            message="Initializing..."
        )
        
        # Start background task
        asyncio.create_task(self._run_trend_pipeline(task_id, req))
        
        return TrendTaskResponse(task_id=task_id, message="Analysis started")

    async def get_task_status(self, task_id: str) -> TrendStatusResponse:
        """
        Retrieves the current status of a task.
        """
        task = _JOB_STORE.get(task_id)
        if not task:
            return TrendStatusResponse(
                task_id=task_id, 
                status="failed", 
                progress=0, 
                message="Task not found", 
                error="Invalid Task ID"
            )
        return task

    async def _run_trend_pipeline(self, task_id: str, req: TrendGenerateRequest):
        """
        The heavy lifting function running in background.
        Updates _JOB_STORE periodically.
        """
        await self.system_state.increment_background_tasks()
        try:
            _logger.info(f"🚀 [Task {task_id[:8]}] Starting Trend Analysis Pipeline")
            _logger.info(f"📋 [Task {task_id[:8]}] Config: {req.days} days, {req.max_papers} papers, categories={req.categories}")
            
            # Update: Fetching
            _JOB_STORE[task_id].status = "processing"
            _JOB_STORE[task_id].message = "Fetching papers from ArXiv..."
            _JOB_STORE[task_id].progress = 10
            _logger.info(f"📡 [Task {task_id[:8]}] Phase 1: Fetching papers from ArXiv...")
            
            papers = await self.arxiv_service.fetch_bulk_papers(
                days=req.days, 
                query=req.query, 
                categories=req.categories, 
                max_results=req.max_papers
            )
            
            if not papers:
                _logger.warning(f"❌ [Task {task_id[:8]}] No papers found matching criteria")
                _JOB_STORE[task_id].status = "failed"
                _JOB_STORE[task_id].error = "No papers found matching criteria."
                return
            
            _logger.info(f"✅ [Task {task_id[:8]}] Fetched {len(papers)} papers successfully")

            # Update: Tagging
            _JOB_STORE[task_id].message = f"AI Tagging {len(papers)} papers..."
            _logger.info(f"🏷️  [Task {task_id[:8]}] Phase 2: AI Tagging phase started for {len(papers)} papers")
            
            tagged_results = await self._tag_papers_parallel(papers, task_id)
            
            if not tagged_results:
                _logger.error(f"❌ [Task {task_id[:8]}] Failed to extract tags from papers")
                _JOB_STORE[task_id].status = "failed"
                _JOB_STORE[task_id].error = "Failed to extract tags from papers."
                return
            
            _logger.info(f"✅ [Task {task_id[:8]}] Successfully tagged {len(tagged_results)}/{len(papers)} papers")
            
            # Update: Synthesis
            _JOB_STORE[task_id].message = "Synthesizing report..."
            _JOB_STORE[task_id].progress = 80
            _logger.info(f"📊 [Task {task_id[:8]}] Phase 3: Synthesis & Report Generation...")
            
            # Execute Reduce Phase
            final_result = await self._execute_reduce_phase(tagged_results, req.days, task_id)
            
            # Complete
            _JOB_STORE[task_id].status = "completed"
            _JOB_STORE[task_id].progress = 100
            _JOB_STORE[task_id].message = "Done"
            _JOB_STORE[task_id].result = final_result
            _logger.info(f"🎉 [Task {task_id[:8]}] Pipeline completed successfully!")
            
        except Exception as e:
            _logger.error(f"💥 [Task {task_id[:8]}] Pipeline failed with error: {e}", exc_info=True)
            _JOB_STORE[task_id].status = "failed"
            _JOB_STORE[task_id].error = str(e)
        finally:
            await self.system_state.decrement_background_tasks()

    async def _execute_reduce_phase(self, tagged_results: List[Dict], days: int, task_id: str = None) -> TrendAnalysisResponse:
        """
        Executes the Reduce Phase (Statistical Aggregation + AI Synthesis).
        This logic was extracted from generate_trend_radar for reusability.
        """
        from collections import defaultdict

        task_prefix = f"[Task {task_id[:8]}] " if task_id else ""

        # Update progress to Synthesis phase (80%)
        if task_id:
            _JOB_STORE[task_id].progress = 80
            _JOB_STORE[task_id].message = "Aggregating statistics and building references..."

        # 3.1. Statistical Aggregation
        _logger.info(f"📈 {task_prefix}Aggregating statistics from {len(tagged_results)} tagged papers...")
        clean_domains = []
        clean_techniques = []

        # Reference maps with uniqueness guards
        # domain_ref_map: { "Domain": [{"id": "...", "title": "..."}, ...] }
        # tech_ref_map: { "Technique": [{"id": "...", "title": "..."}, ...] }
        domain_ref_map = defaultdict(list)
        tech_ref_map = defaultdict(list)
        domain_ref_seen = defaultdict(set)
        tech_ref_seen = defaultdict(set)

        # Bản đồ quy đổi nhanh để gom nhóm các biến thể phổ biến
        semantic_map = {
            "llms": "NLP", "large language models": "NLP",
            "computer vision": "CV", "vision": "CV",
            "multi-modal": "Multimodal", "vlm": "Multimodal"
        }

        # 2. Process data and build Reference Index
        for r in tagged_results:
            # 1. Chuẩn hóa Domain (Cắt ngắn và ánh xạ)
            d = r['domain'].strip().split(' (')[0] # Xóa phần chú thích trong ngoặc
            d_lower = d.lower()
            d_final = semantic_map.get(d_lower, d)
            clean_domains.append(d_final)

            # Build paper reference (minimal payload)
            paper_ref = {
                "id": r['paper_id'],
                "title": r['title']
            }

            # Attach paper to Domain (unique by paper_id, limit 15 per group)
            if r['paper_id'] not in domain_ref_seen[d_final] and len(domain_ref_map[d_final]) < 15:
                domain_ref_seen[d_final].add(r['paper_id'])
                domain_ref_map[d_final].append(paper_ref)

            # 2. Chuẩn hóa Techniques (Xóa rác và giới hạn từ)
            for tech in r['techniques']:
                # Xóa ngoặc đơn và nội dung bên trong: "LoRA (Low-rank...)" -> "LoRA"
                t = re.sub(r'\(.*?\)', '', tech).strip()
                # Chỉ lấy cụm từ nếu nó ngắn (tránh model giải thích dài dòng)
                if len(t.split()) <= 4:
                    t_clean = t.title()
                    clean_techniques.append(t_clean)
                    # Attach paper to Technique (unique by paper_id, limit 15 per group)
                    if r['paper_id'] not in tech_ref_seen[t_clean] and len(tech_ref_map[t_clean]) < 15:
                        tech_ref_seen[t_clean].add(r['paper_id'])
                        tech_ref_map[t_clean].append(paper_ref)

        # --- BƯỚC MỚI: THUẬT TOÁN TOP-K CHO RADAR ---
        # Chỉ lấy Top 8 Domain phổ biến nhất
        domain_counts_all = Counter(clean_domains)
        top_8_domains = dict(domain_counts_all.most_common(8))

        # Nếu có quá nhiều domain nhỏ, gom vào "Others"
        if len(domain_counts_all) > 8:
            others_count = sum(count for dom, count in domain_counts_all.items() if dom not in top_8_domains)
            top_8_domains["Others"] = others_count

        tech_counts = dict(Counter(clean_techniques).most_common(12))

        # --- BƯỚC MỚI: CHUẨN BỊ "THỊT" CHO AI (Exemplar Data) ---
        exemplar_list = []
        for domain in top_8_domains.keys():
            # Lấy 3 bài báo đầu tiên của mỗi domain chính để làm ví dụ
            titles = [ref['title'] for ref in domain_ref_map[domain][:3]]
            if titles:
                exemplar_list.append(f"- **{domain}**: {', '.join(titles)}")
        
        exemplar_str = "\n".join(exemplar_list)

        # 3.3. AI Report Generation
        # Dùng model chuyên biệt cho task TREND (thường là model mạnh để viết report hay)
        lm_synthesis = await get_lm_for_task(LMTask.TREND)

        # Update progress to 90% before AI synthesis
        if task_id:
            _JOB_STORE[task_id].progress = 90
            _JOB_STORE[task_id].message = "AI Intelligence Agent is synthesizing deep insights..."

        _logger.info(f"🧠 {task_prefix}Calling AI to synthesize report for {len(tagged_results)} papers...")
        _logger.info(f"🤖 {task_prefix}Using model: {lm_synthesis.__class__.__name__}")

        stats_summary = {
            "total_papers": len(tagged_results),
            "domain_distribution": top_8_domains,
            "top_techniques": tech_counts
        }

        try:    
            synthesis_res = await asyncio.to_thread(self._run_synthesis_task,
                stats_data=json.dumps(stats_summary),
                exemplar_data=exemplar_str,
                time_window=f"Last {days} days",
                lm=lm_synthesis
            )
            report_content = synthesis_res.trend_report
            _logger.info(f"✅ {task_prefix}AI synthesis completed, report length: {len(report_content)} chars")
        except Exception as e:
            _logger.error(f"💥 {task_prefix}AI Synthesis failed: {e}")
            report_content = f"Error generating deep report. Summary: {json.dumps(stats_summary)}"

        # 3.4. Persistence (Save to DB with Reference JSON)
        _logger.info(f"💾 {task_prefix}Saving analysis to database...")
        analysis_record = TrendAnalysis(
            time_window_days=days,
            paper_count=len(tagged_results),
            domain_distribution_json=json.dumps(top_8_domains),
            top_techniques_json=json.dumps(tech_counts),
            domain_references_json=json.dumps(dict(domain_ref_map)),
            technique_references_json=json.dumps(dict(tech_ref_map)),
            report_markdown=report_content
        )
        saved_record = self.trend_repo.save_analysis(analysis_record)

        _logger.info(f"✅ {task_prefix}Trend Radar analysis #{saved_record.id} saved to database.")

        return TrendAnalysisResponse(
            id=saved_record.id,
            time_window_days=saved_record.time_window_days,
            paper_count=saved_record.paper_count,
            domain_distribution=top_8_domains,
            top_techniques=tech_counts,
            domain_references=dict(domain_ref_map),
            technique_references=dict(tech_ref_map),
            report_markdown=report_content,
            created_at=saved_record.created_at
        )

    async def _tag_papers_parallel(self, papers: List[LocalPaperResponse], task_id: str = None):
        """
        Runs the tagging pipeline in parallel with a concurrency limit.
        """
        task_prefix = f"[Task {task_id[:8]}] " if task_id else ""

        lm = await get_lm_for_task(LMTask.TREND)
        if not lm:
            raise ValueError("AI Model for TREND task not configured.")

        limit = await self.lm_setting_service.get_concurrency_limit(LMTask.TREND)
        _logger.info(f"🚦 {task_prefix}Using concurrency limit: {limit} for AI tagging")
        semaphore = asyncio.Semaphore(limit)

        # Progress tracking
        completed_count = 0
        cached_count = 0
        failed_count = 0
        total = len(papers)

        async def tagged_task(paper: LocalPaperResponse):
            nonlocal completed_count, cached_count, failed_count
            async with semaphore:
                # Yield control to event loop (allows health checks to process)
                await asyncio.sleep(0)

                # 1. Check Cache
                cached = self.trend_repo.get_tag_cache(paper.paper_id)
                if cached:
                    cached_count += 1
                    completed_count += 1
                    # UPDATE PROGRESS SMOOTHLY
                    if task_id and task_id in _JOB_STORE:
                        # Formula: 10% (fetch) + 70% (tagging)
                        new_progress = int(10 + (completed_count / total * 70))
                        _JOB_STORE[task_id].progress = new_progress
                        _JOB_STORE[task_id].message = f"Analyzing paper {completed_count}/{total}: {paper.title[:50]}..."
                    
                    # Log progress every 10 papers or at milestones
                    if completed_count % 10 == 0 or completed_count in [1, total]:
                        _logger.info(f"⏳ {task_prefix}Tagging progress: {completed_count}/{total} ({completed_count*100//total}%) | Cached: {cached_count}, Failed: {failed_count}")
                    return json.loads(cached.tags_json)

                # 2. Call AI
                try:
                    # Yield control before heavy AI operation
                    await asyncio.sleep(0)

                    res = await asyncio.to_thread(self._run_tag_task, paper, lm)

                    # Yield control after AI operation
                    await asyncio.sleep(0)

                    tags = {
                        "paper_id": paper.paper_id,
                        "title": paper.title,
                        "pdf_link": paper.pdf_link,  # Store link for reference
                        "domain": res.domain,
                        "task": res.research_task,
                        "techniques": res.techniques if isinstance(res.techniques, list) else [res.techniques]
                    }

                    # 3. Save Cache
                    self.trend_repo.save_tag_cache(PaperTagCache(
                        paper_id=paper.paper_id,
                        tags_json=json.dumps(tags)
                    ))

                    completed_count += 1
                    # UPDATE PROGRESS SMOOTHLY
                    if task_id and task_id in _JOB_STORE:
                        # Formula: 10% (fetch) + 70% (tagging)
                        new_progress = int(10 + (completed_count / total * 70))
                        _JOB_STORE[task_id].progress = new_progress
                        _JOB_STORE[task_id].message = f"Analyzing paper {completed_count}/{total}: {paper.title[:50]}..."
                    
                    # Log progress every 10 papers or at milestones
                    if completed_count % 10 == 0 or completed_count in [1, total]:
                        _logger.info(f"⏳ {task_prefix}Tagging progress: {completed_count}/{total} ({completed_count*100//total}%) | Cached: {cached_count}, Failed: {failed_count}")

                    return tags
                except Exception as e:
                    failed_count += 1
                    completed_count += 1
                    # UPDATE PROGRESS EVEN ON FAILURE (prevent stuck progress)
                    if task_id and task_id in _JOB_STORE:
                        new_progress = int(10 + (completed_count / total * 70))
                        _JOB_STORE[task_id].progress = new_progress
                        _JOB_STORE[task_id].message = f"Error on paper {completed_count}/{total}: {paper.title[:50]}..."
                    
                    _logger.error(f"❌ {task_prefix}Error tagging paper {paper.paper_id}: {e}")
                    if completed_count % 10 == 0 or completed_count in [1, total]:
                        _logger.info(f"⏳ {task_prefix}Tagging progress: {completed_count}/{total} ({completed_count*100//total}%) | Cached: {cached_count}, Failed: {failed_count}")
                    return None

        # Execute all tasks
        tasks = [tagged_task(p) for p in papers]
        results = await asyncio.gather(*tasks)

        # Filter out failed tasks
        successful_results = [r for r in results if r is not None]

        _logger.info(f"📊 {task_prefix}Tagging completed: {len(successful_results)}/{total} successful, {cached_count} from cache, {failed_count} failed")

        return successful_results
        
    async def get_history(self) -> List[TrendAnalysisResponse]:
        """Retrieves history of analyses with proper DTO conversion."""
        records = self.trend_repo.get_all_analyses()
        return [
            TrendAnalysisResponse(
                id=r.id,
                time_window_days=r.time_window_days,
                paper_count=r.paper_count,
                domain_distribution=json.loads(r.domain_distribution_json),
                top_techniques=json.loads(r.top_techniques_json),
                domain_references=json.loads(r.domain_references_json),
                technique_references=json.loads(r.technique_references_json),
                report_markdown=r.report_markdown,
                created_at=r.created_at
            ) for r in records
        ]
        
    def _run_tag_task(self, paper: LocalPaperResponse, lm: dspy.LM):
        with dspy.context(lm=lm):
            return self.tagger(abstract=paper.summary[:2000])
        
    def _run_synthesis_task(self, stats_data: str, exemplar_data: str, time_window: str, lm: dspy.LM):
        with dspy.context(lm=lm):
            return self.synthesizer(
                stats_data=stats_data,
                exemplar_data=exemplar_data,
                time_window=time_window
            )