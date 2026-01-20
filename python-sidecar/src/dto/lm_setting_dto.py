from pydantic import BaseModel
from typing import Dict, Any, List

# Dùng để trả về cho Frontend
class LMSettingResponse(BaseModel):
    active_provider: str
    
    # Config công khai (Model name, URL...)
    provider_configs: Dict[str, Dict[str, Any]]
    
    # Trạng thái Key (True/False) để UI hiện "Đã nhập key"
    keys_status: Dict[str, bool]

# Dùng để nhận dữ liệu Update từ Frontend
class LMSettingUpdate(BaseModel):
    active_provider: str | None = None
    
    # Config muốn update (Merge vào config cũ)
    # VD: { "gemini": { "model": "gemini-1.5-pro" } }
    config_update: Dict[str, Dict[str, Any]] | None = None
    
    # Key muốn update (Key: Provider, Value: API Key string)
    # VD: { "gemini": "AIzaSy..." }
    api_key_update: Dict[str, str] | None = None
    
    # Key muốn xóa (List provider name)
    keys_to_delete: List[str] | None = None