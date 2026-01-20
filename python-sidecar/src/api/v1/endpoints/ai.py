from fastapi import APIRouter, HTTPException
from src.dto.ai_dto import SummaryRequest, SummaryResponse
from src.api.deps import AIServiceDep

router = APIRouter()

@router.post("/summarize", response_model=SummaryResponse)
def generate_summary(req: SummaryRequest, service: AIServiceDep):
    try:
        return service.generate_summary(req)
    except ValueError as ve:
        # Lỗi do chưa config AI (User error)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Lỗi do AI crash/network (Server error)
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")