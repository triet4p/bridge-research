from sqlmodel import Session
from src.models.analysis import PaperAnalysis
from typing import Optional
from src.core.logger import get_logger

logger = get_logger('[DEBUG AnalysisRepo]')

class AnalysisRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, paper_id: str) -> Optional[PaperAnalysis]:
        return self.session.get(PaperAnalysis, paper_id)

    def save(self, analysis: PaperAnalysis) -> PaperAnalysis:
        # Nếu đã có thì update (merge), chưa có thì insert
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
        self.session.refresh(existing if existing else analysis)
        return existing if existing else analysis

    def delete(self, paper_id: str) -> bool:
        analysis = self.get(paper_id)
        if analysis:
            self.session.delete(analysis)
            self.session.commit()
            logger.info(f"✅ Deleted Analysis record for {paper_id}")
            return True
        else:
            logger.warning(f"⚠️ Cannot delete: Analysis record for {paper_id} not found")
            return False