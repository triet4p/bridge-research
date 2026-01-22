# python-sidecar/src/models/chat.py
from sqlmodel import SQLModel, Field
from datetime import datetime

class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"
    
    id: int | None = Field(default=None, primary_key=True)
    paper_id: str = Field(index=True) # Link tới bài báo
    title: str = Field(default="New Chat") # Tiêu đề session (tự sinh từ câu hỏi đầu)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"
    
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chat_sessions.id", index=True)
    role: str # "user" | "assistant"
    content: str
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Optional: Lưu metadata (ví dụ: các section đã tham khảo cho câu trả lời này)
    references_json: str | None = None