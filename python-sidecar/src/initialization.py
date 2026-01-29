from sqlmodel import Session
from src.core.database import engine
from src.repositories.lm_setting import LMSettingRepository
from src.services.lm_setting import LMSettingService
from src.core.logger import get_logger
import asyncio

_logger = get_logger("[PythonSidecar - Initialization]")

def init_app_configs():
    """
    Entry point for application-level initialization.
    Spawns async tasks for AI configuration to prevent blocking.
    """
    try:
        # We need a temporary session to access the repo
        with Session(engine) as session:
            repo = LMSettingRepository(session)
            service = LMSettingService(repo)
            
            # Start AI configuration in the background
            asyncio.create_task(service.configure_all_tasks())
            
            _logger.info("✅ Startup sequence initiated (Non-blocking).")
    except Exception as e:
        _logger.error(f"❌ Startup sequence failed: {e}")