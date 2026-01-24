from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field

class PaperReadStatus(str, Enum):
    UNREAD = 'unread'
    READING = 'reading'
    DONE = 'done'

class Paper(SQLModel, table=True):
    __tablename__ = 'papers'
    paper_id: str = Field(primary_key=True)
    title: str
    summary: str
    authors: str
    published: datetime
    updated: datetime
    category: str
    pdf_link: str
    local_path: str | None = Field(default=None)
    read_status: PaperReadStatus = Field(default=PaperReadStatus.UNREAD)