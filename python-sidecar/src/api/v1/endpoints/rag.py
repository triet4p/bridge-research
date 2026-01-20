# python-sidecar/src/api/v1/endpoints/rag.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.dto.rag_dto import ParsedDocument
from src.api.deps import PDFServiceDep, RAGServiceDep
from src.dto.chat_dto import ChatRequest, ChatResponse
from src.core.logger import get_logger

router = APIRouter()
logger = get_logger("[PythonSideCar RAG_API]")

class ParseRequest(BaseModel):
    paper_id: str
    pdf_url: str

@router.post("/parse", response_model=ParsedDocument)
def parse_pdf(req: ParseRequest, service: PDFServiceDep):
    """
    Test Endpoint: Tải PDF -> Convert Markdown -> Build ToC Tree.
    Trả về cấu trúc cây để Frontend hiển thị hoặc debug.
    """
    logger.info(f"Requesting parse for Paper ID: {req.paper_id}")
    try:
        result = service.process_paper(req.paper_id, req.pdf_url)
        return result
    except Exception as e:
        logger.error(f"Parse Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    
@router.post("/chat", response_model=ChatResponse)
def chat_with_paper(req: ChatRequest, service: RAGServiceDep):
    """
    Reasoning-based RAG Chat.
    1. Parse PDF (nếu chưa có).
    2. Chọn section liên quan.
    3. Trả lời.
    """
    try:
        return service.chat(req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Chat Error: {e}")
        # In traceback nếu cần thiết
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")