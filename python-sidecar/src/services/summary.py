import traceback
import dspy
from src.core.logger import get_logger
from src.dto.analysis import SummaryRequest, SummaryResponse
from src.services.lm_setting import get_lm_for_task
from src.models.lm_setting import LMTask

_logger = get_logger("[PythonSidecar - Summary]")

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


class PaperSummaryService:
    """
    Service class responsible for handling paper summarization requests.
    """
    def __init__(self):
        """
        Initializes the service and the DSPy ChainOfThought module.
        ChainOfThought is used to encourage the model to reason before generating the final output.
        """
        self.summarizer_module = dspy.ChainOfThought(PaperSummarizerSignature)

    async def generate_summary(self, req: SummaryRequest) -> SummaryResponse:
        """
        Generates a structured summary for a given paper abstract.

        Args:
            req (SummaryRequest): The request object containing the abstract text and target language.

        Returns:
            SummaryResponse: The object containing the generated markdown summary.

        Raises:
            ValueError: If no active AI provider is configured in settings.
            Exception: If an error occurs during DSPy execution or network communication.
        """
        
        # 1. Check if the Language Model is configured
        lm = await get_lm_for_task(LMTask.SUMMARY)
        if not lm:
            raise ValueError("AI Provider is not configured for SUMMARY task.")

        try:
            # 2. Execute the DSPy module
            _logger.info(f"Generating summary in {req.language} using {lm.model}...")
            
            with dspy.context(lm=lm):
                prediction = self.summarizer_module(
                    abstract=req.text,
                    target_language=req.language
                )
                
            _logger.info(f'Response of {lm.model}: {prediction.summary}')
            
            # 3. Return the result
            return SummaryResponse(summary=prediction.summary)
            
        except Exception as e:
            _logger.error(f"❌ AI Error: {str(e)}")
            _logger.error(f"🔍 Traceback:\n{traceback.format_exc()}")
            raise e