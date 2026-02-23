"""
Application lifespan management module for FastAPI.

This module defines the startup and shutdown lifecycle hooks for the FastAPI application.
It handles initialization and cleanup of critical resources including:
- Database connections and table creation.
- ArXiv API HTTP client.
- Application configuration settings.

The lifespan context manager ensures resources are properly initialized on startup
and gracefully cleaned up on shutdown.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.core.database import init_db
from src.core.logger import get_logger
from src.initialization import init_app_configs

_logger = get_logger("[PythonSidecar - Lifecycle]")


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    """
    Manage the application startup and shutdown lifecycle.

    This async context manager handles:
    - **Startup**: Initialize database, ArXiv API client, and app configurations.
    - **Shutdown**: Close ArXiv API HTTP client gracefully.

    Args:
        app (FastAPI): The FastAPI application instance.

    Yields:
        None: Control returns to FastAPI to process requests during the yield.

    Example:
        In your main FastAPI app:
        >>> from fastapi import FastAPI
        >>> from src.core.lifecycle import app_lifespan
        >>> app = FastAPI(lifespan=app_lifespan)
    """
    _logger.info("🚀 Backend is starting up...")

    init_db()
    await app.state.arxiv_api_state.init_client()
    init_app_configs()

    _logger.info("✅ Startup sequence complete. App is ready.")
    yield

    _logger.info("🛑 Backend is shutting down...")
    await app.state.arxiv_api_state.close_client()
