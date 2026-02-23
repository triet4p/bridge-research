"""
Security module for managing sensitive credentials.

This module utilizes the system's native keyring service (Windows Credential Manager,
macOS Keychain, etc.) to securely store API keys, ensuring they are not saved
in plain text configuration files or the database.
"""

import keyring

from src.core.logger import get_logger
from src.core.config import settings

_logger = get_logger('[PythonSidecar - Core Security]')

class KeyringManager:
    """
    A wrapper class for the `keyring` library to handle API key operations.
    """
    
    @classmethod
    def set_api_key(cls, provider: str, key: str):
        """
        Securely saves an API key for a specific AI provider.

        Args:
            provider (str): The identifier of the AI provider (e.g., 'gemini', 'openai').
            key (str): The actual API key string. If empty, the operation is skipped.
        """
        if not key:
            return
        
        try:
            # We use PROJECT_NAME as the service name to group keys in the OS credential manager
            keyring.set_password(settings.PROJECT_NAME, f'{provider}_api_key', key)
        except Exception as e:
            _logger.error(f"Failed to save key to keyring: {e}")
            
    @classmethod
    def get_api_key(cls, provider: str) -> (str | None):
        """
        Retrieves the API key for a provider from the system keyring.

        Args:
            provider (str): The identifier of the AI provider.

        Returns:
            (str | None): The API key if found, otherwise None.
        """
        try:
            return keyring.get_password(settings.PROJECT_NAME, f"{provider}_api_key")
        except Exception as e:
            _logger.error(f"Failed to get key from keyring: {e}")
            return None 
        
    @classmethod
    def delete_api_key(cls, provider: str):
        """
        Removes an API key from the system keyring.

        Args:
            provider (str): The identifier of the AI provider to remove.
        """
        try:
            keyring.delete_password(settings.PROJECT_NAME, f"{provider}_api_key")
        except Exception as e:
            _logger.error(f"Failed to delete key from keyring: {e}")