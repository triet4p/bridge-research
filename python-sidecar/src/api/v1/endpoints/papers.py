# python-sidecar/src/api/v1/endpoints/papers.py
from fastapi import APIRouter, Query, HTTPException
from typing import List

from src.dto.paper_dto import PaperResponse
# Import Dependencies
from src.api.deps import ArxivServiceDep, LocalPaperServiceDep

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
    paper.is_downloaded = True
    return paper

@router.delete("/{paper_id}")
def delete_paper(paper_id: str, service: LocalPaperServiceDep):
    success = service.remove_paper(paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"status": "deleted", "paper_id": paper_id}