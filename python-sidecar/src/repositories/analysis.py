from sqlmodel import Session
from src.models.analysis import PaperAnalysis


class AnalysisRepository:
    """
    Repository for managing PaperAnalysis records (Table of Contents, Content Map).
    """
    
    def __init__(self, session: Session):
        """
        Args:
            session (Session): Active database session.
        """
        self.session = session

    def get(self, paper_id: str) -> (PaperAnalysis | None):
        """
        Retrieves the analysis record for a specific paper.

        Args:
            paper_id (str): The ArXiv ID of the paper.

        Returns:
            (PaperAnalysis | None): The record if found, else None.
        """
        return self.session.get(PaperAnalysis, paper_id)

    def save(self, analysis: PaperAnalysis) -> PaperAnalysis:
        """
        Persists an analysis record to the database using an Upsert strategy.

        Logic:
            1. Check if a record exists for this paper_id.
            2. If yes, update its fields (merge).
            3. If no, insert a new record.
        
        Args:
            analysis (PaperAnalysis): The data object to save.

        Returns:
            PaperAnalysis: The saved (and refreshed) record.
        """
        
        # Check for existing record to perform an update (merge) instead of insert
        existing = self.session.get(PaperAnalysis, analysis.paper_id)
        if existing:
            existing.toc_json = analysis.toc_json
            existing.content_map_json = analysis.content_map_json
            existing.analyzed_at = analysis.analyzed_at
            existing.pdf_local_path = analysis.pdf_local_path
            self.session.add(existing)
        else:
            self.session.add(analysis)
        
        self.session.commit()
        # Refresh to get generated fields (if any) or updated timestamps
        self.session.refresh(existing if existing else analysis)
        return existing if existing else analysis

    def delete(self, paper_id: str) -> bool:
        """
        Deletes the analysis record.

        Args:
            paper_id (str): ID of the paper.

        Returns:
            bool: True if deleted successfully, False if not found.
        """
        analysis = self.get(paper_id)
        if analysis:
            self.session.delete(analysis)
            self.session.commit()
            return True
        else:
            return False