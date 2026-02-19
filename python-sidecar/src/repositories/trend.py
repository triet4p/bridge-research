from typing import List
from sqlmodel import Session, select
from src.models.trend import PaperTagCache, TrendAnalysis

class TrendRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_tag_cache(self, paper_id: str) -> (PaperTagCache | None):
        return self.session.get(PaperTagCache, paper_id)

    def save_tag_cache(self, cache: PaperTagCache):
        self.session.add(cache)
        self.session.commit()

    def save_analysis(self, analysis: TrendAnalysis) -> TrendAnalysis:
        self.session.add(analysis)
        self.session.commit()
        self.session.refresh(analysis)
        return analysis

    def get_all_analyses(self) -> List[TrendAnalysis]:
        return self.session.exec(select(TrendAnalysis).order_by(TrendAnalysis.created_at.desc())).all()