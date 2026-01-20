# python-sidecar/src/api/v1/endpoints/settings.py
from fastapi import APIRouter
from src.dto.lm_setting_dto import LMSettingResponse, LMSettingUpdate
from src.api.deps import LMSettingServiceDep 

router = APIRouter()

@router.get("/", response_model=LMSettingResponse)
def get_settings(service: LMSettingServiceDep):
    return service.get_settings()

@router.put("/", response_model=LMSettingResponse)
def update_settings(dto: LMSettingUpdate, service: LMSettingServiceDep):
    return service.update_settings(dto)