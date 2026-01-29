from enum import Enum
from typing import Any, Dict
import json
from sqlmodel import SQLModel, Field


class LMTask(str, Enum):
    """  
    Enumeration of specific AI tasks within the application.
    Used for routing different tasks to different AI models/providers.
    """
    
    DEFAULT = "default"
    SUMMARY = "summary"
    CHAT = "chat"
    TREND = "trend"
    CODE = "code"

class LMSetting(SQLModel, table=True):
    """
    Stores configuration for Large Language Models (LLMs).
    
    This table is designed as a Singleton (only one row with ID=1 should exist)
    to store the global AI settings for the application.

    Attributes:
        id (int): Primary Key, always 1.
        active_provider (str): The currently selected AI provider (e.g., 'gemini', 'ollama').
        provider_configs_json (str): A JSON string storing configuration details 
            (model name, base URL) for each provider.
            Example: `{"gemini": {"model": "..."}, "ollama": {"base_url": "..."}}`
        task_routing_json: Task routing map: 
            `{"chat": "openai", "trend": "ollama", "summary": "gemini"}`
    """
    __tablename__ = 'lm_settings'
    
    id: int = Field(default=1, primary_key=True)
    active_provider: str = Field(default="") 
    
    provider_configs_json: str = Field(default=r"{}")
    task_routing_json: str = Field(default=r'{}')

    @property
    def provider_configs(self) -> Dict[str, Dict[str, Any]]:
        """
        Deserializes provider configurations from JSON string.

        Returns:
            Dict[str, Dict[str, Any]]: A dictionary of provider configurations.
            Returns an empty dict if JSON decoding fails.
        """
        try:
            return json.loads(self.provider_configs_json)
        except json.JSONDecodeError:
            return {}

    @provider_configs.setter
    def provider_configs(self, value: Dict[str, Dict[str, Any]]):
        """
        Serializes provider configurations to JSON string for storage.
        """
        self.provider_configs_json = json.dumps(value)
        
    @property
    def task_routing(self) -> Dict[str, str]:
        """
        Deserializes the task routing map.
        Returns: Dict[LMTask, provider_id]
        """
        try:
            return json.loads(self.task_routing_json)
        except json.JSONDecodeError:
            return {}

    @task_routing.setter
    def task_routing(self, value: Dict[str, str]):
        self.task_routing_json = json.dumps(value)