from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.core.database import init_db
from src.core.logger import get_logger
from src.initialization import init_app_configs

_logger = get_logger("[PythonSidecar - Lifecycle]")


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    _logger.info("🚀 Backend is starting up...")

    init_db()
    await app.state.arxiv_api_state.init_client()
    init_app_configs()

    _logger.info("✅ Startup sequence complete. App is ready.")
    yield

    _logger.info("🛑 Backend is shutting down...")
    await app.state.arxiv_api_state.close_client()
