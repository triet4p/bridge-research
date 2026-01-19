from typing import List, Optional
from sqlmodel import Session, select
from src.models.paper import Paper

class PaperRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, paper: Paper) -> Paper:
        self.session.add(paper)
        self.session.commit()
        self.session.refresh(paper)
        return paper

    def get_by_id(self, paper_id: str) -> Optional[Paper]:
        return self.session.get(Paper, paper_id)

    def get_all(self) -> List[Paper]:
        statement = select(Paper).order_by(Paper.published.desc())
        return self.session.exec(statement).all()

    def get_all_ids(self) -> List[str]:
        """Lấy danh sách ID để check nhanh trạng thái 'Saved'"""
        statement = select(Paper.paper_id)
        return self.session.exec(statement).all()

    def delete(self, paper_id: str) -> bool:
        paper = self.get_by_id(paper_id)
        if paper:
            self.session.delete(paper)
            self.session.commit()
            return True
        return False