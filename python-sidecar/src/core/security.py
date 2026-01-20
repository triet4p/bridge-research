import sys
import keyring

from src.core.logger import get_logger
from src.core.config import settings

_logger = get_logger('[PythonSidebar - Core Security]')

class KeyringManager:
    
    @classmethod
    def set_api_key(cls, provider: str, key: str):
        if not key:
            return
        
        try:
            keyring.set_password(settings.PROJECT_NAME, f'{provider}_api_key', key)
        except Exception as e:
            _logger.error(f"Failed to save key to keyring: {e}")
            
    @classmethod
    def get_api_key(cls, provider: str) -> (str | None):
        try:
            return keyring.get_password(settings.PROJECT_NAME, f"{provider}_api_key")
        except Exception as e:
            _logger.error(f"Failed to get key from keyring: {e}")
            return None 
        
    @classmethod
    def delete_api_key(cls, provider: str):
        try:
            keyring.delete_password(settings.PROJECT_NAME, f"{provider}_api_key")
        except Exception as e:
            _logger.error(f"Failed to delete key from keyring: {e}")