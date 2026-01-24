# python-sidecar/src/api/deps.py
from typing import Annotated
from fastapi import Depends
from sqlmodel import Session

from src.core.database import get_session
from src.repositories.paper_repository import PaperRepository
from src.repositories.lm_setting_repository import LMSettingRepository 
from src.repositories.analysis_repository import AnalysisRepository
from src.repositories.chat_repository import ChatRepository
from src.services.arxiv_service import ArxivService
from src.services.local_paper_service import LocalPaperService
from src.services.lm_setting_service import LMSettingService 
from src.services.summary_service import PaperSummaryService
from src.services.content_service import PaperContentService
from src.services.chat_service import PaperChatService

# 1. Base Session
SessionDep = Annotated[Session, Depends(get_session)]

# 2. Repositories
def get_paper_repo(session: SessionDep) -> PaperRepository:
    return PaperRepository(session)

def get_lm_setting_repo(session: SessionDep) -> LMSettingRepository: 
    return LMSettingRepository(session)

def get_analysis_repo(session: SessionDep) -> AnalysisRepository:
    return AnalysisRepository(session)

def get_chat_repo(session: SessionDep) -> ChatRepository:
    return ChatRepository(session)

RepoDep = Annotated[PaperRepository, Depends(get_paper_repo)]
LMSettingRepoDep = Annotated[LMSettingRepository, Depends(get_lm_setting_repo)]
AnalysisRepoDep = Annotated[AnalysisRepository, Depends(get_analysis_repo)]
ChatRepoDep = Annotated[ChatRepository, Depends(get_chat_repo)]

# 3. Services
def get_arxiv_service(repo: RepoDep) -> ArxivService:
    return ArxivService(repo)

def get_local_paper_service(
    repo: RepoDep, 
    analysis_repo: AnalysisRepoDep, 
    chat_repo: ChatRepoDep
) -> LocalPaperService:
    return LocalPaperService(repo, analysis_repo, chat_repo)

def get_lm_setting_service(repo: LMSettingRepoDep) -> LMSettingService: 
    return LMSettingService(repo)

def get_content_service(
    repo: AnalysisRepoDep,
    chat_repo: ChatRepoDep,
    local_paper_service: 'LocalPaperServiceDep'
) -> PaperContentService:
    return PaperContentService(repo, chat_repo, local_paper_service)

# --- Summary Service ---
def get_summary_service() -> PaperSummaryService:
    return PaperSummaryService()

# --- Chat Service ---
def get_chat_service(content_service: 'ContentServiceDep', chat_repo: ChatRepoDep) -> PaperChatService:
    return PaperChatService(content_service, chat_repo)

# Type Aliases
ArxivServiceDep = Annotated[ArxivService, Depends(get_arxiv_service)]
LocalPaperServiceDep = Annotated[LocalPaperService, Depends(get_local_paper_service)]
LMSettingServiceDep = Annotated[LMSettingService, Depends(get_lm_setting_service)] 
ContentServiceDep = Annotated[PaperContentService, Depends(get_content_service)]
SummaryServiceDep = Annotated[PaperSummaryService, Depends(get_summary_service)]
ChatServiceDep = Annotated[PaperChatService, Depends(get_chat_service)]

