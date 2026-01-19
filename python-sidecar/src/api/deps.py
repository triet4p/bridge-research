# python-sidecar/src/api/deps.py
from typing import Annotated
from fastapi import Depends
from sqlmodel import Session

from src.core.database import get_session
from src.repositories.paper_repository import PaperRepository
from src.services.arxiv_service import ArxivService
from src.services.paper_service import LocalPaperService

# 1. Database Session Dependency
SessionDep = Annotated[Session, Depends(get_session)]

# 2. Repository Dependency (Inject Session vào Repo)
def get_paper_repo(session: SessionDep) -> PaperRepository:
    return PaperRepository(session)

RepoDep = Annotated[PaperRepository, Depends(get_paper_repo)]

# 3. Service Dependencies (Inject Repo vào Service)

def get_arxiv_service(repo: RepoDep) -> ArxivService:
    # ArxivService cần repo để check xem paper đã save chưa
    return ArxivService(repo)

def get_local_paper_service(repo: RepoDep) -> LocalPaperService:
    # LocalPaperService cần repo để CRUD DB
    return LocalPaperService(repo)

# Type Alias để dùng gọn trong Router
ArxivServiceDep = Annotated[ArxivService, Depends(get_arxiv_service)]
LocalPaperServiceDep = Annotated[LocalPaperService, Depends(get_local_paper_service)]