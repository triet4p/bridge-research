"""
Service for managing Language Model (LLM) configurations and initialization.

This module handles:
1.  CRUD operations for AI settings (Model names, Base URLs, Active Provider).
2.  Secure storage of API Keys using the OS Keyring via `KeyringManager`.
3.  Dynamic instantiation of the `dspy.LM` object based on the active configuration.
4.  Managing the global singleton instance of the active Language Model.
"""

import asyncio
import os
from typing import Dict
import dspy
from src.models.lm_setting import LMSetting, LMTask
from src.dto.lm_setting import LMSettingResponse, LMSettingUpdate
from src.repositories.lm_setting import LMSettingRepository
from src.core.security import KeyringManager
from src.core.logger import get_logger

_logger = get_logger("[PythonSidecar - LM Setting]")

PROVIDER_DEFAULTS = {
    "gemini": {
        "prefix": "gemini",
        "default_concurrency": 1
    },
    "openai": {
        "prefix": "openai",
        "default_concurrency": 1
    },
    "anthropic": {
        "prefix": "anthropic",
        "default_concurrency": 1
    },
    "openrouter": {
        "prefix": "openai", # OpenRouter follows the OpenAI client standard
        "default_base_url": "https://openrouter.ai/api/v1",
        "default_concurrency": 1
    },
    "ollama": {
        "prefix": "ollama_chat", # Native DSPy adapter for Ollama
        "default_base_url": "http://localhost:11434",
        "default_concurrency": 1
    },
    # Future providers (Azure, Groq, DeepSeek) can be added here.
}
"""  
DEFAULT PROVIDER CONFIGURATIONS 
- Defines the protocol prefixes and default URLs for supported providers.
- This allows the system to support new providers by simply updating this dictionary.
"""

_LM_POOL: Dict[LMTask, dspy.LM] = {}
""" 
Global Pool to cache LM instances for different tasks
"""

_AI_READY_EVENT = asyncio.Event()
""" 
Event to track if initialization is complete
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

    def get_settings(self) -> LMSettingResponse:
        """
        Retrieves the current AI configuration.

        Returns:
            LMSettingResponse: DTO containing public config and key existence status.
            API keys are NEVER returned in plain text.
        """
        db_setting = self.lm_setting_repo.get()
        if not db_setting:
            db_setting = self.lm_setting_repo.create(LMSetting(id=1))

        configs = db_setting.provider_configs
        keys_status = {
            p: (True if p == 'ollama' else bool(KeyringManager.get_api_key(p)))
            for p in configs.keys()
        }

        return LMSettingResponse(
            active_provider=db_setting.active_provider,
            provider_configs=configs,
            task_routing=db_setting.task_routing,
            keys_status=keys_status
        )

    async def update_settings(self, dto: LMSettingUpdate) -> LMSettingResponse:
        """
        Updates AI configurations and API Keys.

        Args:
            dto (LMSettingUpdate): The update payload.

        Returns:
            LMSettingResponse: The updated settings.
        """
        
        db_setting = self.lm_setting_repo.get()
        
        # 1. Update Active Provider
        if dto.active_provider is not None:
            db_setting.active_provider = dto.active_provider

        # 2. Update Provider Configs (Model names, Base URLs)
        if dto.config_update:
            current_configs = db_setting.provider_configs
            for provider, conf in dto.config_update.items():
                if provider not in current_configs: current_configs[provider] = {}
                current_configs[provider].update(conf)
            db_setting.provider_configs = current_configs
            
        # 3. Update Task Routing
        if dto.task_routing_update:
            current_routing = db_setting.task_routing
            current_routing.update(dto.task_routing_update)
            db_setting.task_routing = current_routing

        # 4. Handle API Keys
        if dto.api_key_update:
            for provider, key in dto.api_key_update.items():
                if key.strip(): KeyringManager.set_api_key(provider, key.strip())

        if dto.keys_to_delete:
            for p in dto.keys_to_delete: KeyringManager.delete_api_key(p)

        self.lm_setting_repo.update(db_setting)
        
        # Re-configure the AI Pool (can be done in background)
        asyncio.create_task(self.configure_all_tasks())
        
        return self.get_settings()
    
    async def configure_all_tasks(self):
        """
        Initializes LM instances for all tasks based on routing settings.
        This is a non-blocking operation.
        """
        global _LM_POOL, _AI_READY_EVENT
        _AI_READY_EVENT.clear()
        
        db_setting = self.lm_setting_repo.get()
        if not db_setting: return

        routing = db_setting.task_routing
        configs = db_setting.provider_configs

        # 1. Khởi tạo instance cho LMTask.DEFAULT (Dựa trên active_provider toàn cục)
        if db_setting.active_provider:
            default_instance = self._init_lm_instance(db_setting.active_provider, configs)
            if default_instance:
                _LM_POOL[LMTask.DEFAULT] = default_instance
                _logger.info(f"🌐 Global Default AI set to: {db_setting.active_provider}")

        # 2. Khởi tạo instance cho các Task chuyên biệt
        for task in [t for t in LMTask if t != LMTask.DEFAULT]:
            provider_id = routing.get(task)
            
            if provider_id: # Nếu người dùng có chọn cụ thể (không phải "")
                instance = self._init_lm_instance(provider_id, configs)
                if instance:
                    _LM_POOL[task] = instance
                    _logger.info(f"🎯 Task '{task}' specifically routed to: {provider_id}")
                else:
                    # Nếu gán mà init lỗi, xóa khỏi pool để tí nữa fallback về DEFAULT
                    _LM_POOL.pop(task, None)
            else:
                # Nếu giá trị là "" (Use Default), xóa khỏi pool để dùng chung DEFAULT
                _LM_POOL.pop(task, None)

        _AI_READY_EVENT.set()
        _logger.info("🚀 AI Routing Pool is synchronized.")
        
    
    def _init_lm_instance(self, provider_id: str, configs: Dict) -> dspy.LM | None:
        """Internal helper to create a dspy.LM instance."""
        user_conf = configs.get(provider_id, {})
        model_name = user_conf.get("model", "").strip()
        if not model_name: return None

        defaults = PROVIDER_DEFAULTS.get(provider_id, {})
        full_model = f"{defaults.get('prefix', provider_id)}/{model_name}"
        api_base = user_conf.get("base_url") or defaults.get("default_base_url")
        api_key = "dummy" if provider_id == "ollama" else KeyringManager.get_api_key(provider_id)

        try:
            return dspy.LM(
                full_model, 
                api_key=api_key, 
                api_base=api_base, 
                max_tokens=32000 if provider_id != 'ollama' else 16000,
                temperature=0.5,
                cache=False # Disable dspy cache to ensure fresh research results
            )
        except Exception as e:
            _logger.error(f"Failed to init LM for {provider_id}: {e}")
            return None
        
    async def get_concurrency_limit(self, task: LMTask) -> int:
        """
        Retrieves the concurrency limit for a specific task based on its assigned provider.
        """
        db_setting = self.lm_setting_repo.get()
        if not db_setting:
            return 1
            
        # 1. Xác định provider đang chạy task này
        provider_id = db_setting.task_routing.get(task) or db_setting.active_provider
        if not provider_id:
            return 1
            
        # 2. Lấy config của user cho provider đó
        user_conf = db_setting.provider_configs.get(provider_id, {})
        
        # 3. Ưu tiên: User Config -> Provider Default -> Toàn cục Default (1)
        limit = user_conf.get("concurrency_limit")
        if limit is not None:
            return int(limit)
            
        return PROVIDER_DEFAULTS.get(provider_id, {}).get("default_concurrency", 1)


async def get_lm_for_task(task: LMTask = LMTask.DEFAULT) -> dspy.LM | None:
    """
    Retrieves the LM instance designated for a specific task.
    Waits for initialization if necessary.
    
    Args:
        task (LMTask): Task want to assign LM Model. Defaults to `LMTask.DEFAULT`.
        
    Returns:
        (dspy.LM | None): Return LM instance designated for this task, or None if task not exists.
    """
    try:
        # Chờ tối đa 10s cho quá trình background init
        await asyncio.wait_for(_AI_READY_EVENT.wait(), timeout=10.0)
        
        # 1. Thử lấy model riêng cho task
        lm = _LM_POOL.get(task)
        
        # 2. Nếu không có (hoặc task là DEFAULT), thử lấy model DEFAULT toàn cục
        if not lm:
            lm = _LM_POOL.get(LMTask.DEFAULT)
            
        return lm
    except asyncio.TimeoutError:
        _logger.error(f"Timeout waiting for AI Pool while requesting task: {task}")
        return _LM_POOL.get(LMTask.DEFAULT)