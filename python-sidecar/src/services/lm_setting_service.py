# python-sidecar/src/services/lm_setting_service.py
import os
import dspy
from src.models.lm_setting import LMSetting
from src.dto.lm_setting_dto import LMSettingResponse, LMSettingUpdate
from src.repositories.lm_setting_repository import LMSettingRepository
from src.core.security import KeyringManager
from src.core.logger import get_logger

logger = get_logger("[PythonSidecar LMSettingService]")

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
        "prefix": "openai", # OpenRouter dùng chuẩn OpenAI Client
        "default_base_url": "https://openrouter.ai/api/v1"
    },
    "ollama": {
        "prefix": "ollama_chat", # Dùng ollama_chat tốt hơn ollama thường cho RAG
        "default_base_url": "http://localhost:11434"
    },
    # Có thể thêm Azure, Groq, DeepSeek... dễ dàng tại đây
}

_ACTIVE_LM = None

class LMSettingService:
    def __init__(self, repo: LMSettingRepository):
        self.repo = repo
        self._ensure_init()

    def _ensure_init(self):
        setting = self.repo.get()
        if not setting:
            # Init default if not exists
            new_setting = LMSetting(id=1, active_provider="", provider_configs_json="{}")
            self.repo.create(new_setting)

    def get_settings(self) -> LMSettingResponse:
        # Gọi qua Repo
        db_setting = self.repo.get()
        # Fallback an toàn nếu logic init bị race condition (hiếm)
        if not db_setting: 
            self._ensure_init()
            db_setting = self.repo.get()

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
        db_setting = self.repo.get()
        
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
        self.repo.update(db_setting)
        
        # Reload AI
        self.configure_dspy()
        
        return self.get_settings()

    def configure_dspy(self):
        global _ACTIVE_LM
        
        db_setting = self.repo.get()
        if not db_setting: return

        provider = db_setting.active_provider
        if not provider: return

        user_config = db_setting.provider_configs.get(provider, {})
        model_name = user_config.get("model", "").strip()
        
        if not model_name:
            logger.warning(f"⚠️ Model name missing for provider {provider}")
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
            logger.warning(f"⚠️ Missing API Key for {provider}")

        try:
            lm_kwargs = {}
            if api_key: lm_kwargs["api_key"] = api_key
            if api_base: lm_kwargs["api_base"] = api_base
            
            # Khởi tạo LM mới
            new_lm = dspy.LM(full_model, max_tokens=max_tokens, temperature=0.7, **lm_kwargs)
            
            _ACTIVE_LM = new_lm
            
            logger.info(f"✅ DSPy Active LM Updated: {full_model}")
            
        except Exception as e:
            logger.error(f"❌ DSPy Config Error for {full_model}: {e}")

def get_active_lm():
    global _ACTIVE_LM
    return _ACTIVE_LM