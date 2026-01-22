import traceback
import dspy
from src.core.logger import get_logger
from src.dto.analysis_dto import SummaryRequest, SummaryResponse
from src.services.lm_setting_service import get_active_lm

logger = get_logger("[PythonSidecar AIService]")

# --- DSPy Signature (System Prompt & Interface) ---
class PaperSummarizerSignature(dspy.Signature):
    """
    ROLE: Expert AI Research Assistant.
    
    INSTRUCTIONS:
    You are analyzing a scientific paper abstract. Your goal is to help an engineer or researcher quickly understand the core value of the paper.
    
    1. Analyze the input 'abstract'.
    2. Identify the core Problem, the proposed Methodology/Solution, and the Key Results.
    3. Generate a concise summary in the requested 'target_language'.
    4. Format the output as Markdown bullet points.
    5. Keep technical terms accurate, do not oversimplify.
    
    STRICT OUTPUT FORMAT RULES:
    1. Output MUST be in the language specified by 'target_language'.
    2. Do NOT use conversational filler (e.g., "Here is the summary").
    3. You MUST use the following Markdown bullet point structure:
    
    - ## **Problem**: [Describe the core issue/gap in 1 sentence]
    - ## **Solution**: [Describe the proposed method/architecture]
    - ## **Key Result**: [Mention specific metrics or improvements]
    - ## **Impact**: [Why is this important?]
    """
    
    abstract: str = dspy.InputField(desc="The full content of the paper's abstract.")
    target_language: str = dspy.InputField(desc="The language to generate the summary in (e.g., 'Vietnamese', 'English').")
    summary: str = dspy.OutputField(desc="The structured summary in Markdown format.")

# --- Service Implementation ---
class PaperSummaryService:
    def __init__(self):
        # Khởi tạo module DSPy (ChainOfThought giúp AI suy luận từng bước tốt hơn)
        self.summarizer_module = dspy.ChainOfThought(PaperSummarizerSignature)

    def generate_summary(self, req: SummaryRequest) -> SummaryResponse:
        # 1. Check xem đã config LM chưa
        lm = get_active_lm()
        
        if not lm:
            raise ValueError("AI Provider is not configured or Model is invalid. Please check Settings.")

        try:
            # 2. Gọi DSPy
            logger.info(f"Generating summary in {req.language} using {lm.model}...")
            
            with dspy.context(lm=lm):
                prediction = self.summarizer_module(
                    abstract=req.text,
                    target_language=req.language
                )
                
            logger.info(f'Response of {lm.model}: {prediction.summary}')
            
            # 3. Trả về kết quả
            return SummaryResponse(summary=prediction.summary)
            
        except Exception as e:
            logger.error(f"❌ AI Error: {str(e)}")
            logger.error(f"🔍 Traceback:\n{traceback.format_exc()}")
            raise e