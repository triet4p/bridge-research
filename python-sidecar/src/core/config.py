import os
import sys
from pydantic_settings import BaseSettings, SettingsConfigDict

def get_env_path():
    """
    Tìm đường dẫn file .env:
    - Nếu chạy kiểu 'frozen' (đã build thành exe): Lấy trong folder tạm sys._MEIPASS
    - Nếu chạy dev: Lấy ở thư mục gốc project (python-sidecar/.env)
    """
    if getattr(sys, 'frozen', False):
        # PyInstaller giải nén file vào sys._MEIPASS
        base_path = sys._MEIPASS
    else:
        # Đang chạy dev: src/core/config.py -> đi lùi ra 2 cấp để về python-sidecar/
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    return os.path.join(base_path, ".env")

class Settings(BaseSettings):
    
    # Server config
    PROJECT_NAME: str = "Bridge Research App"
    API_V1_STR: str = '/api/v1'
    HOST: str = "localhost"
    PORT: int = 14200
    
    # Database
    DATABASE_URL: str = "sqlite:///bridge_data.bridge"
    
    # Logging config
    LOGGING_LEVEL: str = 'INFO'
    LOGGING_HANDLER: str = 'console'
    LOGGING_FILE_DIR: str = '~/.bridge_research/logs'
    
    model_config = SettingsConfigDict(
        env_file=get_env_path(),
        env_ignore_empty=True,
        extra='ignore'
    )
    
settings = Settings()