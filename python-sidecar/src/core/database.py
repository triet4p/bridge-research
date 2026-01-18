from typing import Any, Generator
from sqlmodel import SQLModel, create_engine, Session
from src.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

def init_db():
    """
    Create tables if not exists
    """
    SQLModel.metadata.create_all(engine)
    
def get_session() -> Generator[Session, Any, None]:
    "Dependency Injection for FastAPI"
    with Session(engine) as session:
        yield session