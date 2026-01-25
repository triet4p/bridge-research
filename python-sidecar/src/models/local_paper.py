from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field

class PaperReadStatus(str, Enum):
    """
    Enumeration for the reading status of a paper.
    
    Attributes:
        UNREAD: The paper has been saved but not opened/analyzed.
        READING: The paper is currently being analyzed or chatted with.
        DONE: The user has finished reading the paper (Reserved for future features).
    """
    UNREAD = 'unread'
    READING = 'reading'
    DONE = 'done'

class LocalPaper(SQLModel, table=True):
    """
    Represents a scientific paper in the local library.

    Attributes:
        paper_id (str): The unique ArXiv ID (e.g., "2401.00001"). Primary Key.
        title (str): Title of the paper.
        summary (str): Abstract/Summary of the paper.
        authors (str): JSON string containing the list of authors.
        published (datetime): Publication date (UTC).
        updated (datetime): Last modified timestamp in the local DB.
        category (str): Primary ArXiv category (e.g., "cs.AI").
        pdf_link (str): Direct URL to the PDF on ArXiv.
        local_path (str | None): Absolute path to the downloaded PDF file. 
            None if the file hasn't been downloaded.
        read_status (PaperReadStatus): Current reading status.
    """
    __tablename__ = 'local_papers'
    
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