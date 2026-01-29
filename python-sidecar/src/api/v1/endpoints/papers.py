# python-sidecar/src/api/v1/endpoints/papers.py
from fastapi import APIRouter, Query, HTTPException
from typing import List

from src.dto.local_paper import LocalPaperResponse
from src.dto.analysis import SummaryRequest, SummaryResponse, ChatRequest, ChatResponse, ParsedDocument, TocNode
from src.api.deps import (
    ArxivServiceDep, 
    LocalPaperServiceDep, 
    SummaryServiceDep, 
    ChatServiceDep,
    ContentServiceDep
)

router = APIRouter()

@router.get("/search", response_model=List[LocalPaperResponse])
def search_papers(
    service: ArxivServiceDep, # <-- Tự động inject ArxivService (đã có repo bên trong)
    query: str | None = Query(None),
    categories: List[str] = Query(default=[]),
    limit: int = 20,
    start_date: str | None = None,
    end_date: str | None = None
):
    """
    Searches ArXiv for papers matching the criteria.
    
    Automatically checks against the local database to mark papers as 
    'saved' (is_downloaded=True) in the response.
    """
    if not query and not categories:
        categories = ["cs.AI", "cs.LG", "cs.CV", "cs.CL"]

    return service.search_papers(
        query=query, 
        categories=categories,
        max_results=limit,
        start_date=start_date, 
        end_date=end_date
    )


@router.get("/library", response_model=List[LocalPaperResponse])
def get_library(service: LocalPaperServiceDep):
    """
    Retrieves all papers saved in the local library.
    Sorted by publication date (newest first).
    """
    return service.get_library()

@router.post("/save", response_model=LocalPaperResponse)
def save_paper(paper: LocalPaperResponse, service: LocalPaperServiceDep):
    """
    Saves a paper's (include metadata, pdf) to the local database.
    """
    return service.save_paper(paper)

@router.delete("/{paper_id}")
def delete_paper(paper_id: str, service: LocalPaperServiceDep):
    """
    Hard delete: Removes the paper from the library.
    
    Cascading effects:
    - Deletes metadata from DB.
    - Deletes local PDF file.
    - Deletes analysis data (ToC, Content Map).
    - Deletes chat history.
    """
    success = service.delete_paper(paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"status": "deleted", "paper_id": paper_id}

@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(req: SummaryRequest, service: SummaryServiceDep):
    """
    Generates a structured summary using the configured LLM.
    Does not require the PDF to be downloaded (uses the Abstract).
    """
    try:
        res = await service.generate_summary(req)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{paper_id}/analysis-status")
def check_analysis_status(paper_id: str, service: ContentServiceDep):
    """
    Checks if the paper has been parsed and indexed (ToC exists).
    Used by UI to decide whether to show 'Start Analysis' or 'Chat'.
    """
    is_analyzed = service.get_analysis_status(paper_id)
    return {"paper_id": paper_id, "is_analyzed": is_analyzed}

@router.post("/{paper_id}/analyze", response_model=ParsedDocument)
def analyze_paper(
    paper_id: str, 
    pdf_url: str, 
    service: ContentServiceDep
):
    """
    Triggers the deep analysis pipeline:
    1. Auto-saves metadata (if missing).
    2. Downloads PDF.
    3. Parses PDF to Markdown/ToC.
    4. Saves structure to DB.
    """
    try:
        return service.analyze_paper(paper_id, pdf_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{paper_id}/analysis")
def delete_analysis(paper_id: str, service: ContentServiceDep):
    """
    Clears cached analysis data (ToC, Chat History).
    Does NOT remove the paper from the Library (metadata and PDF remain).
    """
    success= service.delete_analysis(paper_id)
    return {"status": "deleted" if success else "not_found"}

@router.get("/{paper_id}/toc", response_model=List[TocNode])
def get_paper_toc(paper_id: str, service: ContentServiceDep):
    """
    Retrieves the cached Table of Contents tree.
    Returns 404 if the paper hasn't been analyzed yet.
    """
    toc = service.get_toc(paper_id)
    if toc is None:
        raise HTTPException(status_code=404, detail="ToC not found. Please analyze first.")
    return toc

@router.post("/chat", response_model=ChatResponse)
async def chat_with_paper(req: ChatRequest, service: ChatServiceDep):
    """
    Performs Reasoning-based RAG:
    1. Selects relevant sections based on ToC + Question.
    2. Retrieves content.
    3. Generates answer using LLM.
    4. Saves conversation to history.
    """
    try:
        res = await service.chat(req)
        return res
    except ValueError as ve:
        if str(ve) == "PAPER_NOT_ANALYZED":
            raise HTTPException(status_code=400, detail="PAPER_NOT_ANALYZED")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{paper_id}/history")
def get_chat_history(paper_id: str, service: ChatServiceDep):
    """
    Retrieves the full chat history for a specific paper.
    """
    return service.get_history(paper_id)