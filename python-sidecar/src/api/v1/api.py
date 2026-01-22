from fastapi import APIRouter
from .endpoints import papers, health, lm_settings

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(papers.router, prefix="/papers", tags=["papers"])
api_router.include_router(lm_settings.router, prefix='/lm_settings', tags=['lm_settings'])