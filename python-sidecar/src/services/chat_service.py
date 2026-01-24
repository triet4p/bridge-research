# python-sidecar/src/services/rag_service.py
import dspy
import json
from typing import Dict, List
import tiktoken

from src.core.logger import get_logger
from src.repositories.chat_repository import ChatRepository
from src.dto.analysis_dto import ChatMessage, ChatRequest, ChatResponse, ParsedDocument, TocNode
from src.services.content_service import PaperContentService
from src.services.lm_setting_service import get_active_lm

logger = get_logger("[PythonSidecar RAGService]")

# --- DSPy Signature 1: Selector (Chọn phần cần đọc) ---
class SectionSelectorSignature(dspy.Signature):
    """
    ROLE: Expert Research Assistant.
    TASK: Analyze the Table of Contents (ToC) and the User Question. Identify which sections contain the information needed to answer the question.
    
    RULES:
    1. Select ONLY the most relevant sections (max 3-5).
    2. Consider the 'chat_history' to understand pronouns (e.g., "it", "the table", "that method").
    3. Return the list of 'section_id's exactly as they appear in the ToC.
    4. If the answer is likely in the Introduction or Conclusion, include them.
    5. OUTPUT FORMAT (CRITICAL): A comma-separated list of IDs (e.g., "sec_1, sec_3.2").
    """
    
    toc_structure: str = dspy.InputField(desc="The JSON structure of the paper's Table of Contents (Titles + Previews).")
    chat_history: str = dspy.InputField(desc="Previous conversation context.")
    question: str = dspy.InputField(desc="The user's question.")
    selected_ids: str = dspy.OutputField(desc="Comma-separated list of section_ids.")

# --- DSPy Signature 2: Reader (Đọc và Trả lời) ---
class AnswerGeneratorSignature(dspy.Signature):
    """
    ROLE: Expert Research Assistant.
    TASK: Answer the user's question based STRICTLY on the provided Context.
    
    RULES:
    1. Use Markdown formatting.
    2. If the context does not contain the answer, say "I cannot find specific information about this in the selected sections."
    3. Be concise but comprehensive.
    4. Use 'chat_history' to resolve references (e.g. "it", "previous answer").
    5. STRICT OUTPUT RULES:
        1. **MATH & FORMULAS:** 
        - You MUST use LaTeX formatting for all mathematical expressions.
        - Enclose inline formulas in single dollar signs (e.g., $E=mc^2$).
        - Enclose block formulas in double dollar signs (e.g., $$...$$).
        - Do NOT use Unicode math symbols (like ∈, θ) directly; use LaTeX code (e.g., $\in$, $\theta$).
        
        2. **CITATIONS:**
        - When citing information, you MUST include the Section Title.
        - Format: "(Section [Number]: [Title])" 
        - Example: "(Section 3.1: Problem Definition)", NOT "(Section 3)" or "(Sec 3)".
        
        3. **FORMATTING:**
        - Use Markdown for bolding, lists, and tables.
        - Keep the tone professional and academic.
    """
    
    context_text: str = dspy.InputField(desc="Full text content of the relevant sections.")
    chat_history: str = dspy.InputField(desc="Conversation context.")
    question: str = dspy.InputField(desc="The user's question.")
    answer: str = dspy.OutputField(desc="The final answer in Markdown.")

# --- SERVICE ---
class PaperChatService:
    def __init__(self, content_service: PaperContentService, chat_repo: ChatRepository):
        self.content_service = content_service
        self.selector = dspy.ChainOfThought(SectionSelectorSignature)
        self.reader = dspy.ChainOfThought(AnswerGeneratorSignature)
        self.token_encoding = tiktoken.get_encoding('cl100k_base')
        self.chat_repo = chat_repo

    def chat(self, req: ChatRequest) -> ChatResponse:
        # 1. Đảm bảo LM đã sẵn sàng
        lm = get_active_lm()
        if not lm:
            raise ValueError("AI Provider not configured.")

        doc = self.content_service.get_parsed_document(req.paper_id)
        if not doc:
            # Nếu chưa có trong DB -> Báo lỗi để Frontend yêu cầu user bấm nút "Analyze"
            raise ValueError("PAPER_NOT_ANALYZED") 
        
        session = self.chat_repo.get_or_create_default_session(req.paper_id)
        db_history = self.chat_repo.get_history(session.id, limit=6) # Lấy 3 cặp gần nhất
        
        history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in db_history])
        
        title_map = self._build_title_map(doc.toc)
        logger.info(title_map)
        
        with dspy.context(lm=lm):
            # 3. Bước 1: Reasoning (Chọn Section)
            # Flatten ToC để tiết kiệm token (chỉ lấy ID, Title, Preview ngắn)
            toc_str = self._format_toc_for_llm(doc.toc)
            
            logger.info(f"🤔 Reasoning sections for: '{req.message}'")
            selection_res = self.selector(toc_structure=toc_str, question=req.message,
                                          chat_history=history_str)
            
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
                title = title_map.get(sid, "Unknown Section")
                content = doc.content_map.get(sid, "")
                context_text += f"\n\n--- SECTION {sid}: {title} ---\n{content}"

            # Giới hạn context (đề phòng quá dài với model nhỏ)
            # Lấy khoảng 15k ký tự (~4k token) là an toàn cho hầu hết model
            if len(context_text) > 40000:
                context_text = context_text[:40000] + "\n...(truncated)..."
            
            logger.info(f'Len of context (token): {len(self.token_encoding.encode(context_text))}')
            logger.info(f'Len of history (token): {len(self.token_encoding.encode(history_str))}')

            # 5. Generate Answer
            answer_res = self.reader(context_text=context_text, question=req.message,
                                     chat_history=history_str)
            
            self.chat_repo.add_message(session.id, "user", req.message)
            self.chat_repo.add_message(session.id, "assistant", answer_res.answer, refs=json.dumps(valid_ids))
            
            return ChatResponse(
                answer=answer_res.answer,
                references=valid_ids
            )
            
    def get_history(self, paper_id: str) -> List[ChatMessage]:
        session = self.chat_repo.get_or_create_default_session(paper_id)
        return self.chat_repo.get_history(session.id, limit=100)
    
    def delete_history(self, paper_id: str):
        try:
            self.chat_repo.delete_history(paper_id)
            return True
        except Exception as e:
            logger.warning(f'Can not delete chat history of paper: {paper_id}, {str(e)}')
            return False

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

    def _build_title_map(self, nodes: List[TocNode]) -> Dict[str, str]:
        mapping = {}
        for node in nodes:
            mapping[node.id] = node.title
            # Đệ quy lấy con
            if node.children:
                mapping.update(self._build_title_map(node.children))
        return mapping