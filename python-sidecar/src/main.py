import sys
import multiprocessing
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Unbuffered log for better real-time visibility in Tauri
if sys.stdout: sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
if sys.stderr: sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

from src.core.config import settings
from src.core.lifecycle import app_lifespan
from src.core.logger import get_logger
from src.core.middleware import setup_interaction_tracking_middleware
from src.core.state import ArxivAPIState, SystemState
from src.core.watchdog import SidecarWatchdog
from src.api.v1.api import api_router

_logger = get_logger('[PythonSidecar - Main]')
multiprocessing.freeze_support()

# --- APP SETUP ---

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=app_lifespan
)

app.state.system_state = SystemState()
app.state.arxiv_api_state = ArxivAPIState()
app.state.watchdog = SidecarWatchdog(timeout_seconds=120, check_interval_seconds=5.0)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_interaction_tracking_middleware(app)

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    app.state.watchdog.start(lambda: app.state.system_state.total_active_work)
    
    _logger.info(f"🚀 Starting Uvicorn on {settings.HOST}:{settings.PORT}")
    uvicorn.run(app, host=settings.HOST, port=settings.PORT, reload=False)