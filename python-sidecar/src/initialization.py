from sqlmodel import Session
from src.core.database import engine # Import engine thay vì get_session
from src.repositories.lm_setting import LMSettingRepository
from src.services.lm_setting import LMSettingService
from src.core.logger import get_logger

_logger = get_logger("[PythonSidecar - Initialization]")

def init_lm_setting():
    """
    Initialize LM Setting when start App.
    """
    try:
        with Session(engine) as session:
            repo = LMSettingRepository(session)
            service = LMSettingService(repo)
            
            service.configure_dspy()
            
            _logger.info("✅ Startup Initialization completed.")
            
    except Exception as e:
        _logger.error(f"❌ Startup Initialization failed: {e}")