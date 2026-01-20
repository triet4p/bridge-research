# python-sidecar/src/api/deps.py
from typing import Annotated
from fastapi import Depends
from sqlmodel import Session

from src.core.database import get_session
from src.repositories.paper_repository import PaperRepository
from src.repositories.lm_setting_repository import LMSettingRepository 
from src.services.arxiv_service import ArxivService
from src.services.paper_service import LocalPaperService
from src.services.lm_setting_service import LMSettingService 
from src.services.ai_service import AIService
from src.services.pdf_service import PDFService
from src.services.rag_service import RAGService

# 1. Base Session
SessionDep = Annotated[Session, Depends(get_session)]

# 2. Repositories
def get_paper_repo(session: SessionDep) -> PaperRepository:
    return PaperRepository(session)

def get_lm_setting_repo(session: SessionDep) -> LMSettingRepository: 
    return LMSettingRepository(session)

RepoDep = Annotated[PaperRepository, Depends(get_paper_repo)]
LMSettingRepoDep = Annotated[LMSettingRepository, Depends(get_lm_setting_repo)]

# 3. Services
def get_arxiv_service(repo: RepoDep) -> ArxivService:
    return ArxivService(repo)

def get_local_paper_service(repo: RepoDep) -> LocalPaperService:
    return LocalPaperService(repo)

def get_lm_setting_service(repo: LMSettingRepoDep) -> LMSettingService: 
    return LMSettingService(repo)

def get_ai_service() -> AIService:
    return AIService()

def get_pdf_service() -> PDFService:
    return PDFService()

def get_rag_service(pdf_service: 'PDFServiceDep') -> RAGService:
    return RAGService(pdf_service)

# Type Aliases
ArxivServiceDep = Annotated[ArxivService, Depends(get_arxiv_service)]
LocalPaperServiceDep = Annotated[LocalPaperService, Depends(get_local_paper_service)]
LMSettingServiceDep = Annotated[LMSettingService, Depends(get_lm_setting_service)] 
AIServiceDep = Annotated[AIService, Depends(get_ai_service)]
PDFServiceDep = Annotated[PDFService, Depends(get_pdf_service)]
RAGServiceDep = Annotated[RAGService, Depends(get_rag_service)]
