# python-sidecar/src/api/v1/endpoints/papers.py
from fastapi import APIRouter, Query, HTTPException
from typing import List

from src.dto.paper_dto import PaperResponse
from src.dto.analysis_dto import SummaryRequest, SummaryResponse, ChatRequest, ChatResponse, ParsedDocument, TocNode
from src.api.deps import (
    ArxivServiceDep, 
    LocalPaperServiceDep, 
    SummaryServiceDep, 
    ChatServiceDep,
    ContentServiceDep
)

router = APIRouter()

# --- SEARCH (ARXIV) ---
@router.get("/search", response_model=List[PaperResponse])
def search_papers(
    service: ArxivServiceDep, # <-- Tự động inject ArxivService (đã có repo bên trong)
    query: str | None = Query(None),
    categories: List[str] = Query(default=[]),
    limit: int = 20,
    start_date: str | None = None,
    end_date: str | None = None
):
    if not query and not categories:
        categories = ["cs.AI", "cs.LG", "cs.CV", "cs.CL"]

    # Không cần truyền repo nữa vì service đã có sẵn
    return service.search_papers(
        query=query, 
        categories=categories,
        max_results=limit,
        start_date=start_date, 
        end_date=end_date
    )

# --- LOCAL LIBRARY ---

@router.get("/library", response_model=List[PaperResponse])
def get_library(service: LocalPaperServiceDep):
    return service.get_library()

@router.post("/save", response_model=PaperResponse)
def save_paper(paper: PaperResponse, service: LocalPaperServiceDep):
    service.save_paper(paper)
    return paper

@router.delete("/{paper_id}")
def delete_paper(paper_id: str, service: LocalPaperServiceDep):
    success = service.delete_paper(paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"status": "deleted", "paper_id": paper_id}

@router.post("/summary", response_model=SummaryResponse)
def generate_summary(req: SummaryRequest, service: SummaryServiceDep):
    """Tạo tóm tắt cho bài báo"""
    try:
        return service.generate_summary(req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{paper_id}/analysis-status")
def check_analysis_status(paper_id: str, service: ContentServiceDep):
    """Kiểm tra xem đã có ToC trong DB chưa"""
    is_analyzed = service.get_analysis_status(paper_id)
    return {"paper_id": paper_id, "is_analyzed": is_analyzed}

@router.post("/{paper_id}/analyze", response_model=ParsedDocument)
def analyze_paper(
    paper_id: str, 
    pdf_url: str, # Body param hoặc Query param đều được, ở đây ta dùng Query cho nhanh
    service: ContentServiceDep
):
    """Trigger quá trình Download -> Parse -> Save DB"""
    try:
        return service.analyze_paper(paper_id, pdf_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{paper_id}/analysis")
def delete_analysis(paper_id: str, service: ContentServiceDep):
    """Xóa Cache phân tích & File PDF"""
    success= service.delete_analysis(paper_id)
    return {"status": "deleted" if success else "not_found"}

@router.get("/{paper_id}/toc", response_model=List[TocNode])
def get_paper_toc(paper_id: str, service: ContentServiceDep):
    """Lấy cấu trúc ToC (An toàn, không trigger analyze)"""
    toc = service.get_toc(paper_id)
    if toc is None:
        raise HTTPException(status_code=404, detail="ToC not found. Please analyze first.")
    return toc

@router.post("/chat", response_model=ChatResponse)
def chat_with_paper(req: ChatRequest, service: ChatServiceDep):
    """Chat với bài báo (Yêu cầu đã Analyze trước)"""
    try:
        return service.chat(req)
    except ValueError as ve:
        if str(ve) == "PAPER_NOT_ANALYZED":
            raise HTTPException(status_code=400, detail="PAPER_NOT_ANALYZED")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{paper_id}/history")
def get_chat_history(paper_id: str, service: ChatServiceDep):
    """Lấy toàn bộ lịch sử chat của bài báo này"""
    return service.get_history(paper_id)