# python-sidecar/src/services/rag_service.py
import dspy
import json
from typing import List, Dict

from src.core.logger import get_logger
from src.dto.chat_dto import ChatRequest, ChatResponse
from src.dto.rag_dto import ParsedDocument, TocNode
from src.services.pdf_service import PDFService
from src.services.lm_setting_service import get_active_lm

logger = get_logger("[PythonSidecar RAGService]")

# --- DSPy Signature 1: Selector (Chọn phần cần đọc) ---
class SectionSelectorSignature(dspy.Signature):
    """
    ROLE: Expert Research Assistant.
    TASK: Analyze the Table of Contents (ToC) and the User Question. Identify which sections contain the information needed to answer the question.
    
    RULES:
    1. Select ONLY the most relevant sections (max 3-5).
    2. Return the list of 'section_id's exactly as they appear in the ToC.
    3. If the answer is likely in the Introduction or Conclusion, include them.
    4. Output format: A comma-separated list of IDs (e.g., "sec_1, sec_3.2").
    """
    
    toc_structure: str = dspy.InputField(desc="The JSON structure of the paper's Table of Contents (Titles + Previews).")
    question: str = dspy.InputField(desc="The user's question.")
    selected_ids: str = dspy.OutputField(desc="Comma-separated list of section_ids.")

# --- DSPy Signature 2: Reader (Đọc và Trả lời) ---
class AnswerGeneratorSignature(dspy.Signature):
    """
    ROLE: Expert Research Assistant.
    TASK: Answer the user's question based STRICTLY on the provided Context.
    
    RULES:
    1. Use Markdown formatting.
    2. Cite the sections you used (e.g., "According to Section 3...").
    3. If the context does not contain the answer, say "I cannot find specific information about this in the selected sections."
    4. Be concise but comprehensive.
    """
    
    context_text: str = dspy.InputField(desc="Full text content of the relevant sections.")
    question: str = dspy.InputField(desc="The user's question.")
    answer: str = dspy.OutputField(desc="The final answer in Markdown.")

# --- SERVICE ---
class RAGService:
    def __init__(self, pdf_service: PDFService):
        self.pdf_service = pdf_service
        self.selector = dspy.ChainOfThought(SectionSelectorSignature)
        self.reader = dspy.ChainOfThought(AnswerGeneratorSignature)

    def chat(self, req: ChatRequest) -> ChatResponse:
        # 1. Đảm bảo LM đã sẵn sàng
        lm = get_active_lm()
        if not lm:
            raise ValueError("AI Provider not configured.")

        # 2. Lấy dữ liệu bài báo (Parse nếu chưa có)
        # Lưu ý: PDFService đã có logic cache file, nhưng ta cần cache kết quả parse RAM để nhanh hơn
        # (Tạm thời gọi process_paper mỗi lần, vì nó đọc file local cũng nhanh. Tối ưu cache sau)
        doc: ParsedDocument = self.pdf_service.process_paper(req.paper_id, req.pdf_url)
        
        with dspy.context(lm=lm):
            # 3. Bước 1: Reasoning (Chọn Section)
            # Flatten ToC để tiết kiệm token (chỉ lấy ID, Title, Preview ngắn)
            toc_str = self._format_toc_for_llm(doc.toc)
            
            logger.info(f"🤔 Reasoning sections for: '{req.message}'")
            selection_res = self.selector(toc_structure=toc_str, question=req.message)
            
            # Parse output IDs
            raw_ids = selection_res.selected_ids
            selected_ids = [sid.strip() for sid in raw_ids.split(',')]
            
            # Lọc ID rác (không tồn tại trong map)
            valid_ids = [sid for sid in selected_ids if sid in doc.content_map]
            
            # Fallback: Nếu AI không chọn được gì (hoặc format sai), lấy Intro + Conclusion (thường là sec_0 và sec_cuối)
            if not valid_ids:
                logger.warning("⚠️ AI selected no valid sections. Fallback to Intro.")
                valid_ids = list(doc.content_map.keys())[:2] # Lấy 2 phần đầu

            logger.info(f"📖 Reading sections: {valid_ids}")

            # 4. Bước 2: Reading (Đọc nội dung)
            # Ghép full text của các section đã chọn
            context_text = ""
            for sid in valid_ids:
                # Tìm title để ngữ cảnh rõ ràng hơn
                title = self._find_title_by_id(doc.toc, sid)
                content = doc.content_map.get(sid, "")
                context_text += f"\n\n--- SECTION {sid}: {title} ---\n{content}"

            # Giới hạn context (đề phòng quá dài với model nhỏ)
            # Lấy khoảng 15k ký tự (~4k token) là an toàn cho hầu hết model
            if len(context_text) > 40000:
                context_text = context_text[:40000] + "\n...(truncated)..."

            # 5. Generate Answer
            answer_res = self.reader(context_text=context_text, question=req.message)
            
            return ChatResponse(
                answer=answer_res.answer,
                references=valid_ids
            )

    def _format_toc_for_llm(self, toc: List[TocNode]) -> str:
        """Chuyển cây ToC thành chuỗi JSON rút gọn cho LLM đọc"""
        simplified_toc = []
        
        def traverse(nodes, out_list):
            for node in nodes:
                out_list.append({
                    "id": node.id,
                    "title": node.title,
                    "preview": node.preview[:1000] + "..." # Rút gọn preview nữa cho bước Select
                })
                traverse(node.children, out_list)
        
        traverse(toc, simplified_toc)
        return json.dumps(simplified_toc, indent=2)

    def _find_title_by_id(self, toc: List[TocNode], target_id: str) -> str:
        """Helper tìm title theo ID"""
        for node in toc:
            if node.id == target_id:
                return node.title
            # Đệ quy
            res = self._find_title_by_id(node.children, target_id)
            if res: return res
        return "Unknown Section"