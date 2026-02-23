"""
Trend analysis service for generating AI-powered research trend reports.

This module provides the TrendService class for orchestrating the complete
trend analysis pipeline, including:
- **Paper Acquisition**: Fetching papers from ArXiv API.
- **AI Tagging**: Extracting domain, research task, and techniques using DSPy.
- **Statistical Aggregation**: Computing domain distributions and top techniques.
- **AI Report Synthesis**: Generating markdown reports using a multi-stage agent workflow.
- **Async Task Management**: Background job processing with progress tracking.

The service uses a Map-Reduce pattern:
1. **Map Phase**: Tag papers in parallel with AI.
2. **Reduce Phase**: Aggregate statistics and synthesize insights.

DSPy Components:
- **PaperTaggerSignature**: Signature for extracting metadata from abstracts.
- **TrendPlannerSignature**: Signature for creating report outlines.
- **TrendSectionWriterSignature**: Signature for writing individual report sections.
- **TrendSynthesizerAgent**: Multi-stage agent for report generation.
"""

import asyncio
from collections import Counter, defaultdict
import json
import json_repair
import re
from typing import List, Dict
import uuid
from pydantic import BaseModel, Field
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

class ReportSection(BaseModel):
    """
    Model representing a single section of a trend report.

    Attributes:
        title (str): The title of the report section (max 5 words recommended).
        brief (str): Detailed instructions on what content to cover in this section.
    """
    title: str = Field(..., description="The title of the report section.")
    brief: str = Field(..., description="Detailed instructions on what to cover in this section.")

class ReportPlan(BaseModel):
    """
    Model representing the complete outline of a trend report.

    Attributes:
        sections (List[ReportSection]): A list of sections that the report should contain.
    """
    sections: List[ReportSection] = Field(..., description="A list of sections that the report should contain.")

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

class TrendPlannerSignature(dspy.Signature):
    """
    ROLE: Senior Research Strategist.
    TASK: Create a 5-section outline for a weekly AI Research Report.

    INSTRUCTIONS:
    1. Study 'stats_data' to find which domains are growing.
    2. Study 'exemplar_data' to find specific papers to cite.
    3. You MUST produce a plan with exactly 5 sections.
    4. Each section must have a 'title' (max 5 words) and a 'brief' (detailed instructions).

    MANDATORY OUTPUT FORMAT:
    Your output must be a VALID JSON object inside a code block.
    Strictly follow this structure:
    ```json
    {
      "sections": [
        {"title": "Section 1 Name", "brief": "Instructions for this section..."},
        {"title": "Section 2 Name", "brief": "Instructions for this section..."},
        {"title": "Section 3 Name", "brief": "Instructions for this section..."},
        {"title": "Section 4 Name", "brief": "Instructions for this section..."},
        {"title": "Section 5 Name", "brief": "Instructions for this section..."}
      ]
    }
    ```
    IMPORTANT: Use DOUBLE QUOTES (") for all keys and string values.
    """
    stats_data: str = dspy.InputField(desc="JSON string of domain/technique counts. Use this for statistical context.")
    exemplar_data: str = dspy.InputField(desc="List of paper titles grouped by domain. Use these as evidence.")
    time_window: str = dspy.InputField(desc="The time range (e.g., 'Last 7 days').")

    report_plan: str = dspy.OutputField(desc="A single JSON object containing a 'sections' list with 'title' and 'brief' for each.")

class TrendSectionWriterSignature(dspy.Signature):
    """
    ROLE: Professional Technical Writer.
    TASK: Write ONE specific section of a research report.

    STRICT RULES:
    1. Focus ONLY on the 'current_section_title'.
    2. Follow the 'section_brief' strictly.
    3. MENTION at least 2-3 paper titles from 'exemplar_data' as evidence.
    4. LENGTH: Write at least 3-4 detailed paragraphs (300+ words).
    5. COHERENCE: Read 'context_memory' to see what was already written. DO NOT REPEAT those points.
    6. FORMAT: RICH MARKDOWN: Use bullet points, bold text for key terms, and MARKDOWN TABLES to compare data if relevant.
    7. DO NOT write the section title or any headers at the beginning.
    8. CITATIONS: Use the format [Paper Title] when referencing studies from 'exemplar_data'.
    """
    stats_data: str = dspy.InputField(desc="Global statistics for context.")
    exemplar_data: str = dspy.InputField(desc="Source paper titles to be cited in the text.")
    current_section_title: str = dspy.InputField(desc="The heading of the section you are writing now.")
    section_brief: str = dspy.InputField(desc="Detailed instructions on what points to cover in this section.")
    context_memory: str = dspy.InputField(desc="Summary of previously written sections. Use this to avoid repetition.")

    section_markdown: str = dspy.OutputField(desc="The complete Markdown content for this section. No preamble. DO NOT include the title header.")

def extract_json_helper(raw_text: str) -> ReportPlan:
    """
    Helper function to parse JSON from AI-generated text.

    This function uses json_repair to robustly parse potentially malformed JSON
    output from the AI model. If parsing fails, it returns an empty ReportPlan.

    Args:
        raw_text (str): The raw text output from the AI model.

    Returns:
        ReportPlan: The parsed report plan, or an empty plan if parsing failed.
    """
    try:
        data = json_repair.loads(raw_text)

        return ReportPlan.model_validate(data)
    except Exception as e:
        _logger.warning(f"Failed to parse AI JSON plan: {e}. Raw text was: {raw_text[:]}...")

    return ReportPlan(sections=[])

def planner_reward_fn(args, pred: dspy.Prediction) -> float:
    """
    Reward function for evaluating the quality of AI-generated report plans.

    This function scores plans based on:
    1. Successful JSON parsing (0.7 points).
    2. Number of sections (up to 0.3 points for 5 sections).

    Args:
        args: DSPy internal arguments.
        pred (dspy.Prediction): The AI-generated prediction containing report_plan.

    Returns:
        float: The reward score (0.0 to 1.0).
    """
    raw_text = pred.report_plan
    _logger.info(f"Evaluating plan reward for AI output: {raw_text}...")
    score = 0.0

    # Sử dụng chính bộ parser "nồi đồng cối đá" để check
    # (Giả sử hàm _extract_json_plan được tách ra làm helper)
    plan = extract_json_helper(raw_text)

    if plan and plan.sections:
        score += 0.7 # Parse thành công JSON
        score += min(len(plan.sections), 5) * 0.06

    _logger.info(f"Calculated reward score: {score} for plan with {len(plan.sections) if plan else 0} sections.")

    return score

class TrendSynthesizerAgent(dspy.Module):
    """
    Agentic module that breaks down report generation into a multi-stage workflow.

    This DSPy module orchestrates the trend report generation process:
    1. **Planning Stage**: Uses BestOfN to generate and select the best 5-section outline.
    2. **Writing Stage**: Iteratively writes each section with context awareness.

    The agent is designed to help Small Language Models (SLMs) produce long-form,
    high-quality content by breaking the task into manageable subtasks.

    Attributes:
        planner_base (dspy.ChainOfThought): Base planner using ChainOfThought.
        planner (dspy.BestOfN): Planner with BestOfN optimization (N=5 candidates).
        writer (dspy.ChainOfThought): Section writer using ChainOfThought.
    """
    def __init__(self):
        """Initialize the synthesizer agent with planner and writer components."""
        super().__init__()
        self.planner_base = dspy.ChainOfThought(TrendPlannerSignature)
        self.planner = dspy.BestOfN(
            module=self.planner_base,
            N=5,  # Generate 5 different plans and pick the best one
            reward_fn=planner_reward_fn,
            threshold=0.85
        )
        self.writer = dspy.ChainOfThought(TrendSectionWriterSignature)

    def forward(self, stats_data: str, exemplar_data: str, time_window: str, callback=None):
        """
        Execute the multi-stage report generation workflow.

        Args:
            stats_data (str): JSON string of domain/technique statistics.
            exemplar_data (str): List of paper titles for evidence.
            time_window (str): Time range description (e.g., 'Last 7 days').
            callback (Callable, optional): Progress callback function with
                signature (step, total, title).

        Returns:
            dspy.Prediction: Prediction containing the final report content.
        """
        _logger.info("📋 Agent is planning the report structure...")

        plan_res = self.planner(
            stats_data=stats_data,
            exemplar_data=exemplar_data,
            time_window=time_window
        )

        _logger.info(f"📑 Raw plan from AI: {plan_res.report_plan}...")

        # Parse thủ công
        plan = extract_json_helper(plan_res.report_plan)
        sections = plan.sections if plan else []
        _logger.info(f"✅ Extracted {len(sections)} sections from AI plan.")

        # FALLBACK SKELETON (Cực kỳ quan trọng cho SLM 1.2B)
        if not sections or len(sections) < 3:
            _logger.warning("⚠️ AI Plan was invalid or too short. Using Safety Skeleton.")
            sections = [
                {"title": "Executive Summary", "brief": "Provide a high-level overview of the week's research momentum."},
                {"title": "Domain & Sector Analysis", "brief": "Analyze the distribution of research across NLP, CV, and other fields."},
                {"title": "Breakthrough Techniques", "brief": "Focus on the most cited methods like LoRA, RAG, or new architectures."},
                {"title": "Engineering Implications", "brief": "How these findings affect real-world software and AI deployment."},
                {"title": "Future Outlook", "brief": "Predicted shifts for the coming month based on current data."}
            ]
            raise ValueError("AI Plan parsing failed. Used fallback skeleton instead.")

        report_parts = []
        context_memory = "Report started."
        total_sections = len(sections)

        for i, section in enumerate(sections, 1):
            title = section.title
            brief = section.brief
            
            if callback:
                callback(i, total_sections, title)

            _logger.info(f"✍️ Writing Section {i}/{total_sections}: {title}")
            
            # Gọi Writer cho từng phần
            write_res = self.writer(
                stats_data=stats_data,
                exemplar_data=exemplar_data,
                current_section_title=title,
                section_brief=brief,
                context_memory=context_memory
            )
            
            content = write_res.section_markdown
            content = write_res.section_markdown.strip()
            
            # 🚀 FIX LẶP TITLE: Xóa bỏ các dòng bắt đầu bằng # (nếu AI lỡ viết tiêu đề)
            content = re.sub(r'^#+.*?\n', '', content, flags=re.MULTILINE).strip()
            report_parts.append(f"## {title}\n\n{content}")
            
            # Update memory để tránh lặp ý
            context_memory += f"\n- Section '{title}' completed. Focus was: {brief[:50]}."

        final_report = f"# Research Intelligence Report: {time_window}\n\n"
        final_report += "\n\n".join(report_parts)
        
        return dspy.Prediction(content=final_report)

class TrendService:
    """
    Service for orchestrating the complete trend analysis pipeline.

    This class manages the end-to-end process of generating AI-powered research
    trend reports, including:
    - **Paper Acquisition**: Fetching papers from ArXiv API.
    - **AI Tagging**: Extracting domain, task, and techniques using DSPy.
    - **Statistical Aggregation**: Computing domain distributions and top techniques.
    - **AI Report Synthesis**: Generating markdown reports using multi-stage agents.
    - **Async Task Management**: Background job processing with progress tracking.

    The service supports both synchronous (legacy) and asynchronous (recommended)
    execution modes for trend generation.

    Attributes:
        arxiv_service (ArxivService): Service for fetching papers from ArXiv.
        trend_repo (TrendRepository): Repository for database operations.
        lm_setting_service (LMSettingService): Service for LLM configuration.
        system_state (SystemState): Shared application state for health tracking.
        tagger (dspy.ChainOfThought): DSPy module for paper tagging.
    """

    def __init__(self, arxiv_service: ArxivService, lm_setting_service: LMSettingService,
                 trend_repo: TrendRepository, system_state: SystemState):
        """
        Initialize the TrendService with its dependencies.

        Args:
            arxiv_service (ArxivService): Service for fetching papers from ArXiv.
            lm_setting_service (LMSettingService): Service for LLM configuration.
            trend_repo (TrendRepository): Repository for database operations.
            system_state (SystemState): Shared application state for health tracking.
        """
        self.arxiv_service = arxiv_service
        self.trend_repo = trend_repo
        self.lm_setting_service = lm_setting_service
        self.system_state = system_state
        # Initialize the DSPy module
        self.tagger = dspy.ChainOfThought(PaperTaggerSignature)

    def create_synthesizer_agent(self):
        """
        Create a new instance of the synthesizer agent.

        Returns:
            TrendSynthesizerAgent: A fresh agent instance for report generation.

        Note:
            A new instance is created for each request to avoid state contamination
            between concurrent trend generation tasks.
        """
        # Create a new instance of the agent for each request to avoid state issues
        return TrendSynthesizerAgent()

    async def generate_trend_radar(self, req: TrendGenerateRequest) -> TrendAnalysisResponse:
        """
        Generate a trend analysis report synchronously (legacy method).

        This method executes the complete trend analysis pipeline:
        1. Fetch papers from ArXiv.
        2. Tag papers in parallel using AI.
        3. Aggregate statistics and synthesize the report.

        Args:
            req (TrendGenerateRequest): Request containing analysis parameters
                (days, query, categories, max_papers).

        Returns:
            TrendAnalysisResponse: The complete trend analysis result.

        Note:
            This method is kept for backward compatibility but is not recommended
            for long-running tasks. Use start_trend_generation() instead for
            better UX with polling.
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
        Start trend generation as a background task and return a task ID.

        This method initiates the analysis pipeline asynchronously, allowing
        clients to poll for progress updates without blocking.

        Args:
            req (TrendGenerateRequest): Request containing analysis parameters.

        Returns:
            TrendTaskResponse: Response containing the task ID for polling.

        Example:
            >>> response = await service.start_trend_generation(request)
            >>> task_id = response.task_id
            >>> # Poll for status using get_task_status(task_id)
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
        Retrieve the current status of an async trend generation task.

        This method is used by clients to poll for progress updates during
        the background analysis pipeline execution.

        Args:
            task_id (str): The unique identifier of the background task.

        Returns:
            TrendStatusResponse: Response containing status, progress, and
                result (if completed) or error (if failed).

        Example:
            >>> status = await service.get_task_status("abc-123")
            >>> print(f"Progress: {status.progress}% - {status.status}")
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
        Execute the complete trend analysis pipeline in the background.

        This internal method orchestrates the three-phase pipeline:
        1. **Fetching**: Retrieve papers from ArXiv API.
        2. **Tagging**: Extract metadata using AI in parallel.
        3. **Synthesis**: Aggregate statistics and generate the report.

        The method updates the job store (_JOB_STORE) periodically to reflect
        progress, allowing clients to poll for real-time updates.

        Args:
            task_id (str): The unique identifier for this task.
            req (TrendGenerateRequest): Request containing analysis parameters.

        Note:
            This method increments/decrements the background task counter in
            system_state to coordinate with the watchdog for process lifecycle.
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
        Execute the Reduce Phase: statistical aggregation and AI synthesis.

        This method processes the tagged papers to:
        1. Aggregate domain and technique statistics.
        2. Build reference paper mappings for evidence.
        3. Call the AI synthesizer agent to generate the report.
        4. Persist the analysis result to the database.

        Args:
            tagged_results (List[Dict]): List of papers with AI-extracted tags.
            days (int): Time window in days for the analysis.
            task_id (str, optional): Task ID for progress updates.

        Returns:
            TrendAnalysisResponse: The complete trend analysis result.

        Note:
            This method was extracted from generate_trend_radar for reusability
            between sync and async execution modes.
        """

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

            for tech in r['techniques']:
                t = re.sub(r'\(.*?\)', '', tech).strip()
                if len(t.split()) <= 4:
                    t_clean = t.title()
                    clean_techniques.append(t_clean)
                    # Attach paper to Technique (unique by paper_id, limit 15 per group)
                    if r['paper_id'] not in tech_ref_seen[t_clean] and len(tech_ref_map[t_clean]) < 15:
                        tech_ref_seen[t_clean].add(r['paper_id'])
                        tech_ref_map[t_clean].append(paper_ref)

        domain_counts_all = Counter(clean_domains)
        top_8_domains = dict(domain_counts_all.most_common(8))

        if len(domain_counts_all) > 8:
            others_count = sum(count for dom, count in domain_counts_all.items() if dom not in top_8_domains)
            top_8_domains["Others"] = others_count

        tech_counts = dict(Counter(clean_techniques).most_common(12))

        exemplar_list = []
        for domain in top_8_domains.keys():
            # Lấy 3 bài báo đầu tiên của mỗi domain chính để làm ví dụ
            titles = [ref['title'] for ref in domain_ref_map[domain][:3]]
            if titles:
                exemplar_list.append(f"- **{domain}**: {', '.join(titles)}")
        
        exemplar_str = "\n".join(exemplar_list)

        # 3.3. AI Report Generation
        lm_synthesis = await get_lm_for_task(LMTask.TREND)
        
        agent = self.create_synthesizer_agent()
        
        # 2. Callback để cập nhật SSE Progress
        def update_progress(step, total, title):
            if task_id and task_id in _JOB_STORE:
                # Progress từ 80% đến 98%
                sub_progress = int(80 + (step / total * 18))
                _JOB_STORE[task_id].progress = sub_progress
                _JOB_STORE[task_id].message = f"Writing Section {step}/{total}: {title}..."

        # Update progress to 90% before AI synthesis
        if task_id:
            _JOB_STORE[task_id].progress = 80
            _JOB_STORE[task_id].message = "AI Intelligence Agent is synthesizing deep insights..."

        _logger.info(f"🧠 {task_prefix}Calling AI to synthesize report for {len(tagged_results)} papers...")
        _logger.info(f"🤖 {task_prefix}Using model: {lm_synthesis}")

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
                lm=lm_synthesis,
                synthesizer_agent=agent,
                callback=update_progress
            )
            report_content = synthesis_res.content
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
        Tag papers in parallel using AI with a concurrency limit.

        This method orchestrates the parallel tagging of papers:
        1. Checks the cache for existing tags (avoids redundant API calls).
        2. Calls the AI model for papers not in cache.
        3. Saves newly extracted tags to the cache.
        4. Updates progress in the job store for real-time feedback.

        The method uses a semaphore to limit concurrent AI requests based on
        the configured concurrency limit for the TREND task.

        Args:
            papers (List[LocalPaperResponse]): List of papers to tag.
            task_id (str, optional): Task ID for progress updates.

        Returns:
            List[Dict]: List of successfully tagged papers with extracted metadata.
                Each dict contains: paper_id, title, pdf_link, domain, task, techniques.

        Note:
            Failed papers are filtered out from the results. The method logs
            progress every 10 papers and at milestones (first/last).
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
        """
        Retrieve all historical trend analyses from the database.

        This method fetches all stored trend analyses and converts them
        to response DTOs with parsed JSON fields.

        Returns:
            List[TrendAnalysisResponse]: List of all trend analysis records,
                ordered by creation date (newest first).
        """
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
        """
        Execute the AI tagging task for a single paper.

        This internal method runs the DSPy tagger with the specified language model.

        Args:
            paper (LocalPaperResponse): The paper to tag.
            lm (dspy.LM): The language model to use for inference.

        Returns:
            dspy.Prediction: Prediction containing domain, research_task, and techniques.
        """
        with dspy.context(lm=lm):
            return self.tagger(abstract=paper.summary[:2000])

    def _run_synthesis_task(self, stats_data: str, exemplar_data: str, time_window: str,
                            lm: dspy.LM, synthesizer_agent: TrendSynthesizerAgent, callback=None):
        """
        Execute the AI synthesis task to generate the full report.

        This internal method runs the DSPy synthesizer agent with the specified
        language model and callback for progress updates.

        Args:
            stats_data (str): JSON string of domain/technique statistics.
            exemplar_data (str): List of paper titles for evidence.
            time_window (str): Time range description (e.g., 'Last 7 days').
            lm (dspy.LM): The language model to use for inference.
            synthesizer_agent (TrendSynthesizerAgent): The agent for report generation.
            callback (Callable, optional): Progress callback with (step, total, title).

        Returns:
            dspy.Prediction: Prediction containing the final report content.
        """
        with dspy.context(lm=lm):
            return synthesizer_agent(
                stats_data=stats_data,
                exemplar_data=exemplar_data,
                time_window=time_window,
                callback=callback
            )