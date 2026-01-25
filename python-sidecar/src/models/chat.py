from datetime import datetime
from sqlmodel import SQLModel, Field


class ChatSession(SQLModel, table=True):
    """
    Represents a conversation session about a specific paper.

    Attributes:
        id (int): Unique ID of the session.
        paper_id (str): The ID of the paper being discussed.
        title (str): The title of the chat session (usually auto-generated).
        created_at (datetime): Session creation timestamp.
        updated_at (datetime): Last interaction timestamp.
    """
    __tablename__ = "chat_sessions"
    
    id: int | None = Field(default=None, primary_key=True)
    paper_id: str = Field(index=True) 
    title: str = Field(default="New Chat") 
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ChatMessage(SQLModel, table=True):
    """
    Represents a single message within a chat session.

    Attributes:
        id (int): Unique ID of the message.
        session_id (int): Foreign key linking to the ChatSession.
        role (str): The sender of the message ('user' or 'assistant').
        content (str): The text content of the message.
        created_at (datetime): Message creation timestamp.
        references_json (str | None): JSON string containing a list of section IDs 
            that the AI used to generate this answer (RAG citations).
    """
    __tablename__ = "chat_messages"
    
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chat_sessions.id", index=True)
    role: str 
    content: str
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Optional: Store metadata (e.g., referenced sections for this answer)
    references_json: str | None = None