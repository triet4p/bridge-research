"""
Repository module for trend analysis data access.

This module provides the TrendRepository class for database operations
related to trend analysis, including:
- Managing paper tag caches to avoid redundant LLM calls.
- Storing and retrieving trend analysis results.
"""

from typing import List
from sqlmodel import Session, select
from src.models.trend import PaperTagCache, TrendAnalysis

class TrendRepository:
    """
    Repository for managing trend analysis data persistence.

    This class handles database operations for trend-related entities,
    including caching paper tags and storing analysis results.

    Attributes:
        session (Session): The SQLModel database session.

    Example:
        >>> with Session(engine) as session:
        ...     repo = TrendRepository(session)
        ...     cache = repo.get_tag_cache("1234.5678")
        ...     analyses = repo.get_all_analyses()
    """

    def __init__(self, session: Session):
        """
        Initialize the repository with a database session.

        Args:
            session (Session): The SQLModel session for database operations.
        """
        self.session = session

    def get_tag_cache(self, paper_id: str) -> PaperTagCache | None:
        """
        Retrieve cached tags for a paper by its ID.

        Args:
            paper_id (str): The ArXiv paper ID.

        Returns:
            PaperTagCache | None: The cached tag data if found, None otherwise.
        """
        return self.session.get(PaperTagCache, paper_id)

    def save_tag_cache(self, cache: PaperTagCache):
        """
        Save or update cached tags for a paper.

        Args:
            cache (PaperTagCache): The paper tag cache entity to persist.
        """
        self.session.add(cache)
        self.session.commit()

    def save_analysis(self, analysis: TrendAnalysis) -> TrendAnalysis:
        """
        Save a new trend analysis result to the database.

        Args:
            analysis (TrendAnalysis): The trend analysis entity to persist.

        Returns:
            TrendAnalysis: The saved analysis with updated fields (e.g., generated ID).
        """
        self.session.add(analysis)
        self.session.commit()
        self.session.refresh(analysis)
        return analysis

    def get_all_analyses(self) -> List[TrendAnalysis]:
        """
        Retrieve all trend analyses ordered by creation date (newest first).

        Returns:
            List[TrendAnalysis]: List of all trend analysis records.
        """
        return self.session.exec(select(TrendAnalysis).order_by(TrendAnalysis.created_at.desc())).all()