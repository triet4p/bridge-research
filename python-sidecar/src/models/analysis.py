from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import json

class PaperAnalysis(SQLModel, table=True):
    __tablename__ = "paper_analysis"

    # Link 1-1 với Paper ID
    paper_id: str = Field(primary_key=True) 
    
    # Lưu cấu trúc cây (JSON String)
    toc_json: str 
    
    # Lưu nội dung chi tiết (JSON String: { "sec_1": "text...", "sec_2": "text..." })
    content_map_json: str
    
    # Metadata
    analyzed_at: datetime = Field(default_factory=datetime.now)
    pdf_local_path: str # Đường dẫn file PDF trên đĩa cứng

    # Helpers để convert JSON
    @property
    def toc(self):
        return json.loads(self.toc_json)
    
    @property
    def content_map(self):
        return json.loads(self.content_map_json)