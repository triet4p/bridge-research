from fastapi import APIRouter, Request
import time

router = APIRouter()

@router.get('/')
async def hello():
    return {"status": "alive", "message": "Hello world"}

@router.get("/health")
async def health_check(request: Request):
    """
    Endpoint để Frontend ping định kỳ, giữ cho Sidecar không tự tắt.
    Trả về số lượng active requests để frontend có thể quyết định skip nếu cần.
    """
    active_requests = request.app.state.system_state.total_active_work

    return {
        "status": "alive", 
        "timestamp": time.time(),
        "active_requests": active_requests,
        "busy": active_requests > 0  # Signal to frontend
    }