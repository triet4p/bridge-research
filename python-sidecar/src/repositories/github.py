# python-sidecar/src/repositories/github.py
from sqlmodel import Session, select, delete
from typing import List
from src.models.github import GithubRepo, PaperRepoLink

class GithubRepository:
    """
    Repository quản lý các thao tác Database cho Github Repo và liên kết với Paper.
    """
    def __init__(self, session: Session):
        self.session = session

    # ================= MỤC 1: QUẢN LÝ REPO ĐỘC LẬP =================

    def get_repo(self, repo_id: str) -> GithubRepo | None:
        """Lấy một Github Repo dựa trên repo_id (owner/repo)."""
        return self.session.get(GithubRepo, repo_id)

    def get_all_repos(self) -> List[GithubRepo]:
        """Lấy toàn bộ danh sách Repo đã từng được phân tích (cho tính năng Code Hub)."""
        statement = select(GithubRepo).order_by(GithubRepo.analyzed_at.desc())
        return self.session.exec(statement).all()

    def save_repo(self, repo: GithubRepo) -> GithubRepo:
        """Lưu mới hoặc Cập nhật một phân tích Repo (Upsert)."""
        existing = self.session.get(GithubRepo, repo.repo_id)
        if existing:
            existing.url = repo.url
            existing.description = repo.description
            existing.stars = repo.stars
            existing.default_branch = repo.default_branch
            existing.tech_stack_json = repo.tech_stack_json
            existing.complexity = repo.complexity
            existing.reusability = repo.reusability
            existing.hardware_req = repo.hardware_req
            existing.summary_markdown = repo.summary_markdown
            existing.analyzed_at = repo.analyzed_at
            self.session.add(existing)
        else:
            self.session.add(repo)
        
        self.session.commit()
        self.session.refresh(existing if existing else repo)
        return existing if existing else repo

    def delete_repo(self, repo_id: str) -> bool:
        """
        Hard delete một Repo. 
        Cascade Delete: Xóa luôn mọi liên kết của Repo này với các Bài báo.
        """
        # 1. Xóa tất cả các link liên quan trước
        link_statement = delete(PaperRepoLink).where(PaperRepoLink.repo_id == repo_id)
        self.session.exec(link_statement)
        
        # 2. Xóa Repo
        repo = self.get_repo(repo_id)
        if repo:
            self.session.delete(repo)
            self.session.commit()
            return True
            
        self.session.commit()
        return False


    # ================= MỤC 2: QUẢN LÝ LIÊN KẾT VỚI PAPER =================

    def link_paper(self, paper_id: str, repo_id: str) -> bool:
        """Tạo liên kết Many-to-Many giữa Paper và Repo (Chống trùng lặp)."""
        statement = select(PaperRepoLink).where(
            PaperRepoLink.paper_id == paper_id, 
            PaperRepoLink.repo_id == repo_id
        )
        link = self.session.exec(statement).first()
        if not link:
            new_link = PaperRepoLink(paper_id=paper_id, repo_id=repo_id)
            self.session.add(new_link)
            self.session.commit()
            return True
        return False

    def get_repos_by_paper(self, paper_id: str) -> List[GithubRepo]:
        """Lấy danh sách các Repo đã phân tích gắn với một bài báo."""
        statement = select(GithubRepo).join(
            PaperRepoLink, GithubRepo.repo_id == PaperRepoLink.repo_id
        ).where(PaperRepoLink.paper_id == paper_id)
        
        return self.session.exec(statement).all()

    def unlink_paper(self, paper_id: str, repo_id: str) -> bool:
        """Hủy liên kết giữa bài báo và repo."""
        statement = select(PaperRepoLink).where(
            PaperRepoLink.paper_id == paper_id, 
            PaperRepoLink.repo_id == repo_id
        )
        link = self.session.exec(statement).first()
        if link:
            self.session.delete(link)
            self.session.commit()
            return True
        return False