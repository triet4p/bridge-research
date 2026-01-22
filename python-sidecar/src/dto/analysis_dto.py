# python-sidecar/src/dto/analysis_dto.py
from pydantic import BaseModel
from typing import Dict, List

# --- SUMMARY ---
class SummaryRequest(BaseModel):
    text: str
    language: str = "Vietnamese"

class SummaryResponse(BaseModel):
    summary: str

# --- CHAT ---
class ChatMessage(BaseModel):
    role: str # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    paper_id: str
    pdf_url: str
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    answer: str
    references: List[str]

# --- STRUCTURE (ToC) ---
class TocNode(BaseModel):
    id: str
    title: str
    level: int
    preview: str
    children: List['TocNode'] = []

class ParsedDocument(BaseModel):
    paper_id: str
    toc: List[TocNode]
    content_map: Dict[str, str] = {} # Map id -> text