import sys
import os
import multiprocessing
import threading
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Unbuffered log for better real-time visibility in Tauri
if sys.stdout: sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
if sys.stderr: sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

from src.core.config import settings
from src.core.database import init_db
from src.core.logger import get_logger
from src.api.v1.api import api_router
from src.initialization import init_app_configs

_logger = get_logger('[PythonSidecar - Main]')
multiprocessing.freeze_support()

# --- LIFESPAN MANAGEMENT ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the FastAPI application.
    Replaces the deprecated @app.on_event handlers.
    """
    # --- STARTUP ---
    _logger.info("🚀 Backend is starting up...")
    
    # 1. Initialize Database (Synchronous)
    init_db()
    
    # 2. Initialize App Configs (Asynchronous/Non-blocking task)
    init_app_configs()
    
    _logger.info("✅ Startup sequence complete. App is ready.")
    
    yield  # Application runs here
    
    # --- SHUTDOWN ---
    _logger.info("🛑 Backend is shutting down...")
    # Clean up resources if necessary (e.g. closing DB connections or AI pools)

# --- APP SETUP ---

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# --- WATCHDOG LOGIC (Process Management) ---
last_interaction_time = time.time()
TIMEOUT_SECONDS = 30

def watchdog_process():
    global last_interaction_time
    while True:
        time.sleep(5)
        elapsed = time.time() - last_interaction_time
        if elapsed > TIMEOUT_SECONDS:
            _logger.warning(f"⚠️ No activity for {elapsed:.1f}s. Shutting down sidecar.")
            os._exit(0)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to update interaction timestamp on every request
@app.middleware("http")
async def update_last_interaction(request: Request, call_next):
    global last_interaction_time
    last_interaction_time = time.time()
    response = await call_next(request)
    return response

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    # Start the watchdog to ensure the sidecar dies when the main app closes
    threading.Thread(target=watchdog_process, daemon=True).start()
    
    _logger.info(f"🚀 Starting Uvicorn on {settings.HOST}:{settings.PORT}")
    uvicorn.run(app, host=settings.HOST, port=settings.PORT, reload=False)