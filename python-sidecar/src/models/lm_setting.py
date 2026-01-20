from typing import Any, Dict
import json
from sqlmodel import SQLModel, Field


class LMSetting(SQLModel, table=True):
    __tablename__ = 'lm_settings'
    
    id: int = Field(default=1, primary_key=True)
    active_provider: str = Field(default="") # VD: "gemini"
    
    # Lưu JSON string cấu hình. 
    # Structure: { "gemini": { "model": "..." }, "ollama": { "base_url": "..." } }
    provider_configs_json: str = Field(default="{}")

    @property
    def provider_configs(self) -> Dict[str, Dict[str, Any]]:
        try:
            return json.loads(self.provider_configs_json)
        except json.JSONDecodeError:
            return {}

    @provider_configs.setter
    def provider_configs(self, value: Dict[str, Dict[str, Any]]):
        self.provider_configs_json = json.dumps(value)