import sys
import os
import multiprocessing
import threading
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Unbuffered log
if sys.stdout: sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
if sys.stderr: sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

from src.core.config import settings
from src.core.database import init_db
from src.core.logger import get_logger
from src.api.v1.api import api_router
from src.initialization import init_lm_setting

_logger = get_logger('PythonSidecar')
multiprocessing.freeze_support()

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
            # os._exit(0)

# --- APP SETUP ---
init_db()
init_lm_setting()
app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware update timestamp (Giữ ở main vì liên quan trực tiếp đến Watchdog global)
@app.middleware("http")
async def update_last_interaction(request: Request, call_next):
    global last_interaction_time
    last_interaction_time = time.time()
    response = await call_next(request)
    return response

# Include toàn bộ API từ v1
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    threading.Thread(target=watchdog_process, daemon=True).start()
    _logger.info(f"🚀 Starting server on port {settings.PORT}...")
    uvicorn.run(app, host=settings.HOST, port=settings.PORT, reload=False)