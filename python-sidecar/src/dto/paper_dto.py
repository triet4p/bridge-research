from datetime import datetime
from typing import List
from pydantic import BaseModel
from src.models.paper import PaperReadStatus

class PaperResponse(BaseModel):
    paper_id: str
    title: str
    summary: str
    authors: List[str]
    published: datetime
    pdf_link: str
    category: str
    
    is_saved: bool = False
    local_path: str | None = None
    read_status: PaperReadStatus = PaperReadStatus.UNREAD