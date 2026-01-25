"""
Database connection and session management module using SQLModel.
"""

from typing import Any, Generator
from sqlmodel import SQLModel, create_engine, Session
from src.core.config import settings

# Create the SQLite engine.
# check_same_thread=False is required for SQLite when accessed by 
# multiple threads in a FastAPI application (e.g., Uvicorn workers).
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)
""" 
SQLite Engine, available for multiple threads
"""

def init_db():
    """
    Initializes the database by creating all tables defined in SQLModel metadata.
    This should be called on application startup.
    """
    SQLModel.metadata.create_all(engine)
    
def get_session() -> Generator[Session, Any, None]:
    """   
    Provides a database session generator for Dependency Injection.

    Yields:
        Session: An active SQLModel session.
        
    ## Note
        The session is automatically closed after the request is processed
        thanks to the context manager.
    """
    with Session(engine) as session:
        yield session