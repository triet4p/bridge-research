# python-sidecar/src/api/v1/endpoints/settings.py
from fastapi import APIRouter
from src.dto.lm_setting import LMSettingResponse, LMSettingUpdate
from src.api.deps import LMSettingServiceDep 

router = APIRouter()

@router.get("/", response_model=LMSettingResponse)
async def get_settings(service: LMSettingServiceDep):
    """
    Retrieves the current AI configuration.
    """
    return service.get_settings()

@router.put("/", response_model=LMSettingResponse)
async def update_settings(dto: LMSettingUpdate, service: LMSettingServiceDep):
    """
    Updates the AI configuration.

    This endpoint allows:
    - Switching the active provider.
    - Updating model names/URLs.
    - Setting new API keys (saved to OS Keyring).
    - Deleting existing API keys.
    
    Side Effect:
        After updating, the system automatically reconfigures the global DSPy client
        to use the new settings immediately.
    """
    return await service.update_settings(dto)