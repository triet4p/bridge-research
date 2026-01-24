import os
import json
import requests
import re
from datetime import datetime, timezone

from src.core.config import settings
from src.core.logger import get_logger
from src.models.paper import Paper, PaperReadStatus
from src.dto.paper_dto import PaperResponse
from src.repositories.paper_repository import PaperRepository
from src.repositories.analysis_repository import AnalysisRepository 
from src.repositories.chat_repository import ChatRepository 

logger = get_logger("[PythonSidecar LocalPaperService]")

class LocalPaperService:
    def __init__(self, 
                 repo: PaperRepository,
                 analysis_repo: AnalysisRepository,
                 chat_repo: ChatRepository):
        self.repo = repo
        self.analysis_repo = analysis_repo
        self.chat_repo = chat_repo
        self.storage_dir = settings.PAPER_STORAGE_DIR

    def save_paper(self, paper_dto: PaperResponse) -> Paper:
        """Chỉ lưu thông tin cơ bản (Metadata), chưa tải PDF"""
        existing = self.repo.get_by_id(paper_dto.paper_id)
        if existing:
            return existing
        
        db_paper = Paper(
            paper_id=paper_dto.paper_id,
            title=paper_dto.title,
            summary=paper_dto.summary,
            authors=json.dumps(paper_dto.authors),
            published=paper_dto.published,
            updated=datetime.now(tz=timezone.utc),
            category=paper_dto.category,
            pdf_link=paper_dto.pdf_link,
            read_status=PaperReadStatus.UNREAD,
            local_path=self.download_pdf(paper_dto.paper_id, paper_dto.pdf_link)
        )
        return self.repo.create(db_paper)

    def download_pdf(self, paper_id: str, pdf_url: str) -> str:
        """
        Đảm bảo file PDF đã nằm trên ổ cứng.
        Nếu chưa -> Tải về và update local_path vào DB.
        Trả về: Đường dẫn file tuyệt đối.
        """

        # 2. Logic Download (Chuyển từ ContentService sang)
        safe_id = re.sub(r'[^\w\-_\.]', '_', paper_id)
        file_path = os.path.join(self.storage_dir, f"{safe_id}.pdf")

        if not os.path.exists(file_path):
            logger.info(f"⬇️ Downloading PDF for {paper_id}...")
            try:
                headers = {"User-Agent": "Mozilla/5.0 (BridgeResearchApp)"}
                response = requests.get(pdf_url, headers=headers, stream=True, timeout=60)
                response.raise_for_status()
                with open(file_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                logger.info(f"✅ Downloaded to: {file_path}")
            except Exception as e:
                logger.error(f"❌ Download failed: {e}")
                if os.path.exists(file_path): os.remove(file_path)
                raise e
        
        return file_path

    def delete_paper(self, paper_id: str) -> bool:
        """
        Xóa hoàn toàn khỏi thư viện (Hard Delete).
        Bao gồm: File PDF, Metadata, Analysis, Chat History.
        """
        paper = self.repo.get_by_id(paper_id)
        if not paper:
            return False

        # 1. Xóa file vật lý
        if paper.local_path and os.path.exists(paper.local_path):
            try:
                os.remove(paper.local_path)
                logger.info(f"🗑️ Deleted PDF file: {paper.local_path}")
            except Exception as e:
                logger.warning(f"Failed to delete file: {e}")

        # 2. Xóa các dữ liệu phụ thuộc (Cascade)
        self.chat_repo.delete_history(paper_id)
        self.analysis_repo.delete(paper_id)

        # 3. Xóa Metadata
        return self.repo.delete(paper_id)

    def get_library(self) -> list[PaperResponse]:
        # (Giữ nguyên logic cũ)
        papers = self.repo.get_all()
        for paper in papers:
            self._ensure_local_file(paper)
        return [
            PaperResponse(
                paper_id=p.paper_id,
                title=p.title,
                summary=p.summary,
                authors=json.loads(p.authors),
                published=p.published.replace(tzinfo=timezone.utc) if p.published.tzinfo is None else p.published,
                pdf_link=p.pdf_link,
                category=p.category,
                is_saved=True,
                read_status=p.read_status,
                local_path=p.local_path
            ) for p in papers
        ]
        
        
    def get_paper(self, paper_id: str) -> Paper | None:
        paper = self.repo.get_by_id(paper_id)
        self._ensure_local_file(paper)
        return paper
    
    
    def _ensure_local_file(self, paper: Paper) -> None:
        local_path = paper.local_path
        if not os.path.exists(local_path):
            logger.warning(f'Not found file: {local_path}. Redownloading...')
            self.download_pdf(paper.paper_id, paper.pdf_link)