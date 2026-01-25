from typing import List
from sqlmodel import Session, select
from src.models.local_paper import LocalPaper

class LocalPaperRepository:
    """
    Repository for managing the Local Library (Paper entities).
    """
    def __init__(self, session: Session):
        self.session = session

    def create(self, paper: LocalPaper) -> LocalPaper:
        """
        Saves or Updates a paper record.
        
        Args:
            paper (LocalPaper): The paper object to save.
            
        Returns:
            LocalPaper: The saved record.
        """
        self.session.add(paper)
        self.session.commit()
        self.session.refresh(paper)
        return paper

    def get_by_id(self, paper_id: str) -> (LocalPaper | None):
        """Retrieves a paper by its ArXiv ID."""
        return self.session.get(LocalPaper, paper_id)

    def get_all(self) -> List[LocalPaper]:
        """
        Retrieves all papers in the library, sorted by publication date (newest first).
        """
        statement = select(LocalPaper).order_by(LocalPaper.published.desc())
        return self.session.exec(statement).all()

    def get_all_ids(self) -> List[str]:
        """
        Retrieves only the IDs of all saved papers.
        
        Returns:
            List[str]: List of all IDs of all saved papers.
        
        ## Use Case:
            Optimized for checking `is_saved` status against search results 
            (O(1) lookup with a Set) without loading full paper objects.
        """
        statement = select(LocalPaper.paper_id)
        return self.session.exec(statement).all()

    def delete(self, paper_id: str) -> bool:
        """
        Deletes a paper metadata record.
        
        Returns:
            bool: True if deleted, False if not found.
        """
        paper = self.get_by_id(paper_id)
        if paper:
            self.session.delete(paper)
            self.session.commit()
            return True
        return False