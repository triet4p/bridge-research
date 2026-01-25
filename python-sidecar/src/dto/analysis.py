from pydantic import BaseModel, Field
from typing import Dict, List, Literal

# --- SUMMARY ---
class SummaryRequest(BaseModel):
    """
    Payload for requesting an AI summary of a text.
    """
    
    text: str = Field(..., description="The abstract or text content to be summarized.")
    """
    The abstract or text content to be summarized.
    """
    language: str = Field(default="Vietnamese", description="Target language for the summary (e.g., 'English', 'Vietnamese').")
    """
    Target language for the summary (e.g., 'English', 'Vietnamese'). Defaults to 'Vietnamese'.
    """

class SummaryResponse(BaseModel):
    """
    Response containing the generated summary.
    """
    
    summary: str = Field(..., description="The generated summary in Markdown format.")
    """
    The generated summary in Markdown format.
    """

# --- CHAT ---
class ChatMessage(BaseModel):
    """
    Represents a single message in the chat history.
    """
    
    role: Literal['user', 'assistant'] = Field(..., description="The role of the message sender ('user' or 'assistant').")
    """
    The role of the message sender ('user' or 'assistant').
    """
    content: str = Field(..., description="The content of the message.")
    """
    The content of the message.
    """

class ChatRequest(BaseModel):
    """
    Payload for sending a chat message to the RAG engine.
    """
    
    paper_id: str = Field(..., description="The unique ArXiv ID of the paper being discussed.")
    """
    The unique ArXiv ID of the paper being discussed.
    """
    pdf_url: str = Field(..., description="Direct URL to the PDF (used for auto-downloading if missing).")
    """
    Direct URL to the PDF (used for auto-downloading if missing).
    """
    message: str = Field(..., description="The user's question or prompt.")
    """
    The user's question or prompt.
    """
    history: List[ChatMessage] = Field(default=[], description="List of previous messages for context awareness.")
    """
    List of previous messages for context awareness.
    """

class ChatResponse(BaseModel):
    """
    Response from the RAG engine.
    """
    
    answer: str = Field(..., description="The AI-generated answer in Markdown format.")
    """
    The AI-generated answer in Markdown format.
    """
    references: List[str] = Field(..., description="List of section IDs (e.g., 'sec_1') used as context for the answer.")
    """
    List of section IDs (e.g., 'sec_1') used as context for the answer.
    """

# --- STRUCTURE (ToC) ---
class TocNode(BaseModel):
    """
    Represents a node in the hierarchical Table of Contents tree.
    """
    
    id: str = Field(..., description="Unique identifier for the section (e.g., 'sec_1').")
    """
    Unique identifier for the section (e.g., 'sec_1').
    """
    title: str = Field(..., description="Title of the section (e.g., '1. Introduction').")
    """
    Title of the section (e.g., '1. Introduction').
    """
    level: int = Field(..., description="Nesting level of the section (1 for top-level, 2 for subsections, etc.).")
    """
    Nesting level of the section (1 for top-level, 2 for subsections, etc.).
    """
    preview: str = Field(..., description="A short text preview (first paragraph) of the section content.")
    """
    A short text preview (first paragraph) of the section content.
    """
    children: List['TocNode'] = Field(default=[], description="List of child subsections.")
    """
    List of child subsections.
    """

class ParsedDocument(BaseModel):
    """
    Represents the full structured content of a parsed paper.
    """
    
    paper_id: str = Field(..., description="The unique ArXiv ID.")
    """
    The unique ArXiv ID.
    """
    toc: List[TocNode] = Field(..., description="The hierarchical Table of Contents.")
    """
    The hierarchical Table of Contents.
    """
    content_map: Dict[str, str] = Field(default={}, description="Mapping of section IDs to their full text content.")
    """
    Mapping of section IDs to their full text content.
    """