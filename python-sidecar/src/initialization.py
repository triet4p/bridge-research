from sqlmodel import Session
from src.core.database import engine # Import engine thay vì get_session
from src.repositories.lm_setting_repository import LMSettingRepository
from src.services.lm_setting_service import LMSettingService
from src.core.logger import get_logger

logger = get_logger("[PythonSidecar Initialization]")

def init_lm_setting():
    """
    Khởi tạo cấu hình AI khi App vừa bật.
    Tự quản lý vòng đời Session để đảm bảo an toàn.
    """
    try:
        # Dùng Context Manager để tự động close session sau khi dùng xong
        with Session(engine) as session:
            repo = LMSettingRepository(session)
            service = LMSettingService(repo)
            
            # Hàm này sẽ nạp key từ Keyring và config dspy
            service.configure_dspy()
            
            logger.info("✅ Startup Initialization completed.")
            
    except Exception as e:
        logger.error(f"❌ Startup Initialization failed: {e}")