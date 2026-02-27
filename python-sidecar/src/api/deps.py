"""
Dependency Injection (DI) Configuration.

This module defines the dependencies used by FastAPI routers. It orchestrates
the creation of Repositories and Services, ensuring they are initialized with
the correct database sessions and dependent objects.

FastAPI's `Depends` system handles the lifecycle of these objects (creation
and cleanup) automatically per request.
"""

from typing import Annotated
from fastapi import Depends, Request
from sqlmodel import Session

from src.core.database import get_session
from src.repositories.local_paper import LocalPaperRepository
from src.repositories.lm_setting import LMSettingRepository 
from src.repositories.analysis import AnalysisRepository
from src.repositories.chat import ChatRepository
from src.repositories.trend import TrendRepository
from src.repositories.github import GithubRepository
from src.services.arxiv import ArxivService
from src.services.local_paper import LocalPaperService
from src.services.lm_setting import LMSettingService 
from src.services.summary import PaperSummaryService
from src.services.paper_content import PaperContentService
from src.services.paper_chat import PaperChatService
from src.services.trend import TrendService
from src.services.github import GithubService
from src.core.state import ArxivAPIState, SystemState

# 1. Base Session
SessionDep = Annotated[Session, Depends(get_session)]


def get_arxiv_api_state(request: Request) -> ArxivAPIState:
    return request.app.state.arxiv_api_state

def get_system_state(request: Request) -> SystemState:
    return request.app.state.system_state

ArxivAPIStateDep = Annotated[ArxivAPIState, Depends(get_arxiv_api_state)]
SystemStateDep = Annotated[SystemState, Depends(get_system_state)]

# 2. Repositories
def get_local_paper_repo(session: SessionDep) -> LocalPaperRepository:
    return LocalPaperRepository(session)

def get_lm_setting_repo(session: SessionDep) -> LMSettingRepository: 
    return LMSettingRepository(session)

def get_analysis_repo(session: SessionDep) -> AnalysisRepository:
    return AnalysisRepository(session)

def get_chat_repo(session: SessionDep) -> ChatRepository:
    return ChatRepository(session)

def get_trend_repo(session: SessionDep) -> TrendRepository:
    return TrendRepository(session)

def get_github_repo(session: SessionDep) -> GithubRepository:
    return GithubRepository(session)

LocalPaperRepoDep = Annotated[LocalPaperRepository, Depends(get_local_paper_repo)]
LMSettingRepoDep = Annotated[LMSettingRepository, Depends(get_lm_setting_repo)]
AnalysisRepoDep = Annotated[AnalysisRepository, Depends(get_analysis_repo)]
ChatRepoDep = Annotated[ChatRepository, Depends(get_chat_repo)]
TrendRepoDep = Annotated[TrendRepository, Depends(get_trend_repo)]
GithubRepoDep = Annotated[GithubRepository, Depends(get_github_repo)]

# 3. Services
def get_arxiv_service(repo: LocalPaperRepoDep, arxiv_state: ArxivAPIStateDep) -> ArxivService:
    return ArxivService(repo, arxiv_state)

def get_local_paper_service(
    local_paper_repo: LocalPaperRepoDep, 
    analysis_repo: AnalysisRepoDep, 
    chat_repo: ChatRepoDep
) -> LocalPaperService:
    return LocalPaperService(local_paper_repo, analysis_repo, chat_repo)

def get_lm_setting_service(repo: LMSettingRepoDep) -> LMSettingService: 
    return LMSettingService(repo)

def get_content_service(
    analysis_repo: AnalysisRepoDep,
    chat_repo: ChatRepoDep,
    local_paper_service: 'LocalPaperServiceDep'
) -> PaperContentService:
    return PaperContentService(analysis_repo, chat_repo, local_paper_service)

def get_summary_service() -> PaperSummaryService:
    return PaperSummaryService()

def get_chat_service(chat_repo: ChatRepoDep, content_service: 'ContentServiceDep') -> PaperChatService:
    return PaperChatService(chat_repo, content_service)

def get_trend_service(
    arxiv_service: 'ArxivServiceDep', 
    lm_setting_service: 'LMSettingServiceDep',
    trend_repo: TrendRepoDep, # Thay Session bằng Repo trực tiếp
    system_state: SystemStateDep
) -> TrendService:
    return TrendService(arxiv_service, lm_setting_service, trend_repo, system_state)

def get_github_service(
    github_repo: GithubRepoDep,
) -> GithubService:
    return GithubService(github_repo)

# Type Aliases
ArxivServiceDep = Annotated[ArxivService, Depends(get_arxiv_service)]
LocalPaperServiceDep = Annotated[LocalPaperService, Depends(get_local_paper_service)]
LMSettingServiceDep = Annotated[LMSettingService, Depends(get_lm_setting_service)] 
ContentServiceDep = Annotated[PaperContentService, Depends(get_content_service)]
SummaryServiceDep = Annotated[PaperSummaryService, Depends(get_summary_service)]
ChatServiceDep = Annotated[PaperChatService, Depends(get_chat_service)]
TrendServiceDep = Annotated[TrendService, Depends(get_trend_service)]
GithubServiceDep = Annotated[GithubService, Depends(get_github_service)]