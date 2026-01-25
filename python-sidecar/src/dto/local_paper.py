from datetime import datetime
from typing import List
from pydantic import BaseModel, Field
from src.models.local_paper import PaperReadStatus

class LocalPaperResponse(BaseModel):
    """
    DTO representing a Paper entity, used for search results and library listing.
    Combines ArXiv metadata with local library status.
    """
    
    paper_id: str = Field(..., description="The unique ArXiv ID.")
    """The unique ArXiv ID."""
    title: str = Field(..., description="Title of the paper.")
    """Title of the paper."""
    summary: str = Field(..., description="Abstract of the paper.")
    """Abstract of the paper."""
    authors: List[str] = Field(..., description="List of author names.")
    """List of author names."""
    published: datetime = Field(..., description="Publication date (UTC).")
    """Publication date (UTC)."""
    pdf_link: str = Field(..., description="Direct link to the PDF file.")
    """Direct link to the PDF file."""
    category: str = Field(..., description="Primary category code (e.g., 'cs.AI').")
    """Primary category code (e.g., 'cs.AI')."""
    is_saved: bool = Field(default=False, description="True if the paper metadata is saved in the local library.")
    """True if the paper metadata is saved in the local library."""
    local_path: str | None = Field(default=None, description="Absolute path to the downloaded PDF file, or None if not downloaded.")
    """Absolute path to the downloaded PDF file, or None if not downloaded."""
    read_status: PaperReadStatus = Field(default=PaperReadStatus.UNREAD, description="Current reading status (UNREAD, READING, DONE).")
    """Current reading status (UNREAD, READING, DONE)."""