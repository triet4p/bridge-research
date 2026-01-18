from fastapi import APIRouter
import time

router = APIRouter()

@router.get("/health")
def health_check():
    """
    Endpoint để Frontend ping định kỳ, giữ cho Sidecar không tự tắt.
    """
    return {"status": "alive", "timestamp": time.time()}