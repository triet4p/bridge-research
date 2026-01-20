# python-sidecar/src/dto/chat_dto.py
from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    paper_id: str
    pdf_url: str # Cần URL để nếu chưa tải thì tải ngay
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    answer: str
    references: List[str] # Danh sách các section_id đã được AI đọc để trả lời