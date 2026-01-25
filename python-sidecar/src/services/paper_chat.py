"""
Service for the Retrieval-Augmented Generation (RAG) Chat engine.

This module implements a "Reasoning-based RAG" approach:
1.  **Selection:** An LLM analyzes the Table of Contents (ToC) and the user's question 
    to decide which specific sections of the paper need to be read.
2.  **Reading:** The full text of the selected sections is retrieved and fed into 
    the LLM to generate a grounded answer.

This approach avoids the limitations of vector search (semantic drift) and 
fixed-size chunking (context fragmentation).
"""

import json
from typing import Dict, List
import dspy
import tiktoken

from src.core.logger import get_logger
from src.repositories.chat import ChatRepository
from src.dto.analysis import ChatMessage, ChatRequest, ChatResponse, TocNode
from src.services.paper_content import PaperContentService
from src.services.lm_setting import get_active_lm

_logger = get_logger("[PythonSidecar - Paper Chat]")

# --- DSPy Signature 1: Selector ---
class SectionSelectorSignature(dspy.Signature):
    """
    **ROLE**: Expert Research Assistant.
    
    **TASK**: Analyze the Table of Contents (ToC) and the User Question. Identify which sections contain the information needed to answer the question.
    
    **RULES**:
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

# --- DSPy Signature 2: Reader ---
class AnswerGeneratorSignature(dspy.Signature):
    """
    **ROLE**: Expert Research Assistant.
    
    **TASK**: Answer the user's question based STRICTLY on the provided Context.
    
    **RULES**:
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


class PaperChatService:
    def __init__(self, chat_repo: ChatRepository, content_service: PaperContentService):
        """
        Args:
            chat_repo (ChatRepository): Access to conversation persistence.
            content_service (PaperContentService): Access to parsed paper content.      
        """
        self.content_service = content_service
        self.chat_repo = chat_repo
        
        # Initialize DSPy ChainOfThought modules
        self.selector = dspy.ChainOfThought(SectionSelectorSignature)
        self.reader = dspy.ChainOfThought(AnswerGeneratorSignature)
        
        # Tokenizer for logging context usage (using OpenAI's cl100k_base as a standard reference)
        self.token_encoding = tiktoken.get_encoding('cl100k_base')

    def chat(self, req: ChatRequest) -> ChatResponse:
        """
        Processes a user question through the RAG pipeline.

        Args:
            req (ChatRequest): The chat request payload.

        Returns:
            ChatResponse: The AI's answer and cited references.

        Raises:
            ValueError: If AI is not configured or the paper hasn't been analyzed.
        """
        
        # 1. Ensure LM is configured
        lm = get_active_lm()
        if not lm:
            raise ValueError("AI Provider not configured.")

        # 2. Retrieve parsed document (ToC & Content)
        # This accesses the cache in the 'paper_analysis' table
        doc = self.content_service.get_parsed_document(req.paper_id)
        if not doc:
            raise ValueError("Paper is not analyzed") 
        
        # 3. Retrieve Conversation History
        session = self.chat_repo.get_or_create_default_session(req.paper_id)
        db_history = self.chat_repo.get_history(session.id, limit=6) # Last 3 turns
        
        history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in db_history])
        
        # Flatten ToC to a title map for easy lookup later
        title_map = self._build_title_map(doc.toc)
        
        # --- EXECUTE RAG ---
        with dspy.context(lm=lm):
            # Step A: Reasoning (Select Sections)
            # We pass a simplified ToC to save tokens
            toc_str = self._format_toc_for_llm(doc.toc)
            
            _logger.info(f"🤔 Reasoning sections for: '{req.message}'")
            selection_res = self.selector(toc_structure=toc_str, question=req.message,
                                          chat_history=history_str)
            
            # Parse output IDs
            raw_ids = selection_res.selected_ids
            selected_ids = [sid.strip() for sid in raw_ids.split(',')]
            
            # Filter valid ids
            valid_ids = [sid for sid in selected_ids if sid in doc.content_map]
            
            # Fallback strategy: If AI fails to select, pick Intro + Conclusion (usually first 2 sections)
            if not valid_ids:
                _logger.warning("⚠️ AI selected no valid sections. Fallback to Intro.")
                valid_ids = list(doc.content_map.keys())[:2] # Lấy 2 phần đầu

            _logger.info(f"📖 Reading sections: {valid_ids}")

            # Step B: Reading (Retrieve Content)
            context_text = ""
            for sid in valid_ids:
                # Tìm title để ngữ cảnh rõ ràng hơn
                title = title_map.get(sid, "Unknown Section")
                content = doc.content_map.get(sid, "")
                context_text += f"\n\n--- SECTION {sid}: {title} ---\n{content}"

            # Truncate context to avoid token overflow (Safety limit: ~10k tokens / 40k chars)
            if len(context_text) > 40000:
                context_text = context_text[:40000] + "\n...(truncated)..."
            
            _logger.info(f'Len of context (token): {len(self.token_encoding.encode(context_text))}')
            _logger.info(f'Len of history (token): {len(self.token_encoding.encode(history_str))}')

            # Step C: Answer Generation
            answer_res = self.reader(context_text=context_text, question=req.message,
                                     chat_history=history_str)
            
            # 4. Persist Conversation
            self.chat_repo.add_message(session.id, "user", req.message)
            self.chat_repo.add_message(session.id, "assistant", answer_res.answer, refs=json.dumps(valid_ids))
            
            return ChatResponse(
                answer=answer_res.answer,
                references=valid_ids
            )
            
        return ChatResponse(
            answer='Error when answering',
            references=[]
        )
            
    def get_history(self, paper_id: str) -> List[ChatMessage]:
        """Retrieves full chat history for a paper."""
        session = self.chat_repo.get_or_create_default_session(paper_id)
        return self.chat_repo.get_history(session.id, limit=100)
    
    def delete_history(self, paper_id: str):
        """Deletes chat history for a paper."""
        try:
            self.chat_repo.delete_history(paper_id)
            return True
        except Exception as e:
            _logger.warning(f'Can not delete chat history of paper: {paper_id}, {str(e)}')
            return False

    def _format_toc_for_llm(self, toc: List[TocNode]) -> str:
        """
        Minimizes the ToC JSON structure for the LLM context window.
        Trims previews to save tokens during the Selection step.
        """
        simplified_toc = []
        
        def traverse(nodes, out_list):
            for node in nodes:
                out_list.append({
                    "id": node.id,
                    "title": node.title,
                    "preview": node.preview[:1000] + "..." 
                })
                traverse(node.children, out_list)
        
        traverse(toc, simplified_toc)
        return json.dumps(simplified_toc, indent=2)

    def _build_title_map(self, nodes: List[TocNode]) -> Dict[str, str]:
        """
        Flattens the hierarchical ToC into a simple {id: title} map for fast lookup.
        """
        mapping = {}
        for node in nodes:
            mapping[node.id] = node.title
            # Đệ quy lấy con
            if node.children:
                mapping.update(self._build_title_map(node.children))
        return mapping