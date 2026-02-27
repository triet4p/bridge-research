from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class GithubAnalyzeRequest(BaseModel):
    """
    Payload từ Frontend gửi lên Backend để yêu cầu phân tích một Repo.
    """
    url: str = Field(..., description="Đường dẫn URL của Github Repo (VD: https://github.com/owner/repo)")
    paper_id: Optional[str] = Field(default=None, description="Nếu có, hệ thống sẽ tự động tạo liên kết giữa Repo này và Paper.")

class GithubRepoResponse(BaseModel):
    """
    Dữ liệu trả về cho Frontend sau khi phân tích xong (hoặc khi fetch từ DB).
    """
    repo_id: str
    url: str
    description: Optional[str] = None
    stars: int
    default_branch: str
    
    tech_stack: List[str]
    complexity: str
    reusability: str
    hardware_req: str
    summary_markdown: str
    
    analyzed_at: datetime