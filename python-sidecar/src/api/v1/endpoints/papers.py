from typing import List
from fastapi import APIRouter, Query
from src.dto.paper_dto import PaperResponse
from src.services.arxiv_service import arxiv_service

router = APIRouter()

@router.get("/search", response_model=List[PaperResponse])
def search_papers(
    query: str | None = Query(None, description="Keyword search (Title, Abstract)"),
    categories: List[str] = Query(default=[], description="List of ArXiv categories"),
    limit: int = Query(default=20, ge=1, le=100, description="Max results (1-100)"),
    start_date: str | None = None,
    end_date: str | None = None
):
    # Nếu không có keyword và không có category, mặc định lấy ngành hot
    if not query and not categories:
        categories = ["cs.AI", "cs.LG", "cs.CV", "cs.CL"]

    return arxiv_service.search_papers(
        query=query, 
        categories=categories,
        max_results=limit,
        start_date=start_date, 
        end_date=end_date
    )