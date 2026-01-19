# python-sidecar/src/services/paper_service.py
from datetime import datetime, timezone
import json
from src.models.paper import Paper, PaperReadStatus
from src.dto.paper_dto import PaperResponse
from src.repositories.paper_repository import PaperRepository

class LocalPaperService:
    # --- FIX: Nhận Repo thay vì Session ---
    def __init__(self, repo: PaperRepository):
        self.repo = repo

    def save_paper(self, paper_dto: PaperResponse) -> Paper:
        existing = self.repo.get_by_id(paper_dto.paper_id)
        if existing:
            return existing
        
        db_paper = Paper(
            paper_id=paper_dto.paper_id,
            title=paper_dto.title,
            summary=paper_dto.summary,
            authors=json.dumps(paper_dto.authors),
            published=paper_dto.published,
            updated=datetime.now(tz=timezone.utc),
            category=paper_dto.category,
            pdf_link=paper_dto.pdf_link,
            is_downloaded=True,
            read_status=PaperReadStatus.UNREAD
        )
        return self.repo.create(db_paper)

    def get_library(self) -> list[PaperResponse]:
        papers = self.repo.get_all()
        return [
            PaperResponse(
                paper_id=p.paper_id,
                title=p.title,
                summary=p.summary,
                authors=json.loads(p.authors),
                published=p.published.replace(tzinfo=timezone.utc) if p.published.tzinfo is None else p.published,
                pdf_link=p.pdf_link,
                category=p.category,
                is_downloaded=p.is_downloaded,
                read_status=p.read_status,
                local_path=p.local_path
            ) for p in papers
        ]

    def remove_paper(self, paper_id: str) -> bool:
        return self.repo.delete(paper_id)