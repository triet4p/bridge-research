from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

class TrendAnalysisResponse(BaseModel):
    id: int
    time_window_days: int
    paper_count: int
    domain_distribution: Dict[str, int]
    top_techniques: Dict[str, int]
    report_markdown: str
    created_at: datetime

class TrendGenerateRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30, description="Time window in days")
    query: str = Field(default="", description="Optional keyword filter")
    categories: List[str] = Field(default=[], description="List of ArXiv categories")
    max_papers: int = Field(default=200, ge=10, le=500, description="Max papers to analyze")

class TrendTaskResponse(BaseModel):
    task_id: str
    message: str

class TrendStatusResponse(BaseModel):
    task_id: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    progress: int  # 0-100
    message: str  # e.g. "Fetching from ArXiv...", "Tagging 10/50..."
    result: Optional[TrendAnalysisResponse] = None
    error: Optional[str] = None