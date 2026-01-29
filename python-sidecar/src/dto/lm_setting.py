from pydantic import BaseModel, Field
from typing import Dict, Any, List
from src.models.lm_setting import LMTask


class LMSettingResponse(BaseModel):
    """
    DTO for returning current AI configuration to the Frontend.
    Sensitive API keys are NOT included in this response.
    """
    
    active_provider: str = Field(..., description="The currently active AI provider ID (e.g., 'gemini').")
    """
    The currently active AI provider ID (e.g., 'gemini').
    """
    
    provider_configs: Dict[str, Dict[str, Any]] = Field(
        ..., 
        description="Public configuration for each provider (model name, base URL). Example: `{'gemini': {'model': 'gemini-1.5-flash'}\}`"
    )
    """
    Public configuration for each provider (model name, base URL). Example: `{'gemini': {'model': 'gemini-1.5-flash'}}`
    """
    keys_status: Dict[str, bool] = Field(
        ..., 
        description="Map indicating if an API key exists for each provider (True/False). Used for UI feedback (e.g., showing 'Saved')."
    )
    """
    Map indicating if an API key exists for each provider (True/False). Used for UI feedback (e.g., showing 'Saved').
    """
    task_routing: Dict[LMTask, str] = Field(
        ...,
        description="Mapping of Task -> ProviderID"
    )
    """ 
    Mapping of Task -> ProviderID
    """

class LMSettingUpdate(BaseModel):
    """
    DTO for updating AI configuration from the Frontend.
    """
    
    active_provider: str | None = Field(default=None, description="Set the new active provider ID.")
    """
    Set the new active provider ID.
    """
    config_update: Dict[str, Dict[str, Any]] | None = Field(
        default=None, 
        description="Partial update for provider configurations. Merged deeply with existing config."
    )
    """
    Partial update for provider configurations. Merged deeply with existing config.
    """
    api_key_update: Dict[str, str] | None = Field(
        default=None, 
        description="Map of API keys to update or add. Keys are stored securely in the OS Keyring."
    )
    """
    Map of API keys to update or add. Keys are stored securely in the OS Keyring.
    """
    keys_to_delete: List[str] | None = Field(
        default=None, 
        description="List of provider IDs whose API keys should be removed from the Keyring."
    )
    """
    List of provider IDs whose API keys should be removed from the Keyring.
    """
    task_routing_update: Dict[LMTask, str] | None = Field(
        default=None,
        description="Update Mapping of Task -> ProviderID."
    )
    """ 
    Mapping of Task -> ProviderID.
    """