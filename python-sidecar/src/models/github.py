from datetime import datetime
from sqlmodel import SQLModel, Field
import json

class PaperRepoLink(SQLModel, table=True):
    """
    Bảng trung gian quản lý quan hệ Many-to-Many giữa Paper và Github Repo.
    Cho phép 1 bài báo liên kết với nhiều Repo và ngược lại.
    """
    __tablename__ = "paper_repo_links"
    
    paper_id: str = Field(foreign_key="local_papers.paper_id", primary_key=True)
    repo_id: str = Field(foreign_key="github_repos.repo_id", primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)

class GithubRepo(SQLModel, table=True):
    """
    Lưu trữ thông tin và kết quả phân tích nhanh (Quick Analysis) của một Github Repository.
    Thực thể này tồn tại độc lập với Paper.
    """
    __tablename__ = "github_repos"
    
    # repo_id có định dạng "owner/repo" (VD: "facebookresearch/sam2")
    repo_id: str = Field(primary_key=True)
    url: str
    description: str | None = None
    stars: int = Field(default=0)
    default_branch: str = Field(default="main")
    
    # AI Analysis Results (Level 1)
    tech_stack_json: str = Field(default="[]")
    complexity: str = Field(default="Unknown")
    reusability: str = Field(default="Unknown")
    hardware_req: str = Field(default="Not specified")
    summary_markdown: str = Field(default="")
    
    analyzed_at: datetime = Field(default_factory=datetime.now)

    @property
    def tech_stack(self) -> list[str]:
        """Giải mã JSON string thành List các công nghệ."""
        try:
            return json.loads(self.tech_stack_json)
        except Exception:
            return[]