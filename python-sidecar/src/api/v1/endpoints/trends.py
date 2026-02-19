# src/api/v1/endpoints/trends.py
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
from src.dto.trend import TrendGenerateRequest, TrendAnalysisResponse, TrendTaskResponse, TrendStatusResponse
from src.api.deps import TrendServiceDep 

router = APIRouter()

@router.post("/generate", response_model=TrendTaskResponse)
async def start_trend_generation(
    req: TrendGenerateRequest, 
    service: TrendServiceDep
):
    """
    Starts a background task to analyze trends.
    Returns a Task ID immediately for polling.
    """
    return await service.start_trend_generation(req)

@router.get("/status/{task_id}", response_model=TrendStatusResponse)
async def get_task_status(
    task_id: str,
    service: TrendServiceDep
):
    """
    Poll this endpoint to check progress.
    Returns current status, progress percentage, and result when completed.
    """
    return await service.get_task_status(task_id)

@router.get("/stream/{task_id}")
async def stream_task_status(
    task_id: str,
    service: TrendServiceDep
):
    """
    Server-Sent Events endpoint for real-time progress updates.
    Streams status changes until the task is completed or failed.
    """
    async def event_generator():
        last_progress = -1
        
        while True:
            try:
                # Get current task status
                status = await service.get_task_status(task_id)
                
                # Only send update if progress changed or status changed
                if status.progress != last_progress or status.status in ["completed", "failed"]:
                    yield {
                        "event": "progress",
                        "data": status.model_dump_json()
                    }
                    last_progress = status.progress
                
                # Stop streaming if task is done
                if status.status in ["completed", "failed"]:
                    break
                    
            except Exception as e:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)})
                }
                break
            
            # Update every 1 second
            await asyncio.sleep(1)
    
    return EventSourceResponse(event_generator())

@router.get("/history")
async def get_trend_history(service: TrendServiceDep):
    """
    Retrieves previous trend analysis records from the database.
    """
    return await service.get_history()