"""
Service for managing Language Model (LLM) configurations and initialization.

This module handles:
1.  CRUD operations for AI settings (Model names, Base URLs, Active Provider).
2.  Secure storage of API Keys using the OS Keyring via `KeyringManager`.
3.  Dynamic instantiation of the `dspy.LM` object based on the active configuration.
4.  Managing the global singleton instance of the active Language Model.
"""

import os
import dspy
from src.models.lm_setting import LMSetting
from src.dto.lm_setting import LMSettingResponse, LMSettingUpdate
from src.repositories.lm_setting import LMSettingRepository
from src.core.security import KeyringManager
from src.core.logger import get_logger

_logger = get_logger("[PythonSidecar - LM Setting]")

PROVIDER_DEFAULTS = {
    "gemini": {
        "prefix": "gemini",
    },
    "openai": {
        "prefix": "openai",
    },
    "anthropic": {
        "prefix": "anthropic",
    },
    "openrouter": {
        "prefix": "openai", # OpenRouter follows the OpenAI client standard
        "default_base_url": "https://openrouter.ai/api/v1"
    },
    "ollama": {
        "prefix": "ollama_chat", # Native DSPy adapter for Ollama
        "default_base_url": "http://localhost:11434"
    },
    # Future providers (Azure, Groq, DeepSeek) can be added here.
}
"""  
DEFAULT PROVIDER CONFIGURATIONS 
- Defines the protocol prefixes and default URLs for supported providers.
- This allows the system to support new providers by simply updating this dictionary.
"""

_ACTIVE_LM = None
""" 
Global variable to hold the active DSPy Language Model instance.
This instance is shared across the application (e.g., used by ChatService).
"""

class LMSettingService:
    """
    Service for managing AI settings and lifecycle.
    """
    
    def __init__(self, lm_setting_repo: LMSettingRepository):
        """
        Args:
            lm_setting_repo (LMSettingRepository): Repository for accessing settings in SQLite.
        """
        self.lm_setting_repo = lm_setting_repo
        self._ensure_init()

    def _ensure_init(self):
        setting = self.lm_setting_repo.get()
        if not setting:
            # Init default if not exists
            new_setting = LMSetting(id=1, active_provider="", provider_configs_json=r"{}")
            self.lm_setting_repo.create(new_setting)

    def get_settings(self) -> LMSettingResponse:
        """
        Retrieves the current AI configuration.

        Returns:
            LMSettingResponse: DTO containing public config and key existence status.
            API keys are NEVER returned in plain text.
        """
        
        db_setting = self.lm_setting_repo.get()
        
        # Fallback
        if not db_setting: 
            self._ensure_init()
            db_setting = self.lm_setting_repo.get()

        configs = db_setting.provider_configs
        
        # Check Keyring status
        keys_status = {}
        for provider in configs.keys():
            if provider == 'ollama':
                keys_status[provider] = True
            else:
                keys_status[provider] = bool(KeyringManager.get_api_key(provider))

        return LMSettingResponse(
            active_provider=db_setting.active_provider,
            provider_configs=configs,
            keys_status=keys_status
        )

    def update_settings(self, dto: LMSettingUpdate) -> LMSettingResponse:
        """
        Updates AI configurations and API Keys.

        Args:
            dto (LMSettingUpdate): The update payload.

        Returns:
            LMSettingResponse: The updated settings.
        """
        
        db_setting = self.lm_setting_repo.get()
        
        # 1. Logic Update Active Provider
        if dto.active_provider is not None:
            db_setting.active_provider = dto.active_provider

        # 2. Logic Update Configs (Merge)
        if dto.config_update:
            current_configs = db_setting.provider_configs
            for provider, conf in dto.config_update.items():
                if provider not in current_configs:
                    current_configs[provider] = {}
                current_configs[provider].update(conf)
            db_setting.provider_configs = current_configs

        # 3. Logic Keyring
        if dto.api_key_update:
            for provider, key in dto.api_key_update.items():
                if key and key.strip():
                    KeyringManager.set_api_key(provider, key)
                    os.environ[f"{provider.upper()}_API_KEY"] = key

        if dto.keys_to_delete:
            for provider in dto.keys_to_delete:
                KeyringManager.delete_api_key(provider)

        # Lưu xuống DB qua Repo
        self.lm_setting_repo.update(db_setting)
        
        # Reload AI
        self.configure_dspy()
        
        return self.get_settings()

    def configure_dspy(self):
        """
        Configures the global `dspy.LM` instance based on the active provider.
        
        This method:
        1. Reads the active provider from DB.
        2. Retrieves the API Key from Keyring.
        3. Determines the correct LiteLLM prefix and Base URL.
        4. Instantiates `dspy.LM` and assigns it to `_ACTIVE_LM`.
        """
        global _ACTIVE_LM
        
        db_setting = self.lm_setting_repo.get()
        if not db_setting: 
            return

        provider = db_setting.active_provider
        if not provider: 
            return

        user_config = db_setting.provider_configs.get(provider, {})
        model_name = user_config.get("model", "").strip()
        
        if not model_name:
            _logger.warning(f"⚠️ Model name missing for provider {provider}")
            return

        defaults = PROVIDER_DEFAULTS.get(provider, {})
        prefix = defaults.get("prefix", provider)
        full_model = f"{prefix}/{model_name}"
        api_base = user_config.get("base_url") or defaults.get("default_base_url")
        
        if provider != 'ollama':
            api_key = KeyringManager.get_api_key(provider)
            max_tokens = 16000
        else:
            api_key = 'dummy_key_for_ollama'
            max_tokens = 32000
        
        if not api_key:
            _logger.warning(f"⚠️ Missing API Key for {provider}")

        try:
            lm_kwargs = {}
            if api_key: lm_kwargs["api_key"] = api_key
            if api_base: lm_kwargs["api_base"] = api_base
            
            new_lm = dspy.LM(full_model, max_tokens=max_tokens, temperature=0.7, **lm_kwargs)
            
            _ACTIVE_LM = new_lm
            
            _logger.info(f"✅ DSPy Active LM Updated: {provider}/{model_name}")
            
        except Exception as e:
            _logger.error(f"❌ DSPy Config Error for {provider}/{model_name}: {e}")

def get_active_lm() -> (dspy.LM | None):
    """
    Retrieves the currently active Language Model instance.
    
    Returns:
        (dspy.LM | None): The active LM object, or None if not configured.
    """
    global _ACTIVE_LM
    return _ACTIVE_LM