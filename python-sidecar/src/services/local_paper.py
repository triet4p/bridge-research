"""
Service for managing the Local Library of papers.

This module is responsible for the lifecycle of papers saved by the user:
- Saving paper metadata to the SQLite database.
- Managing physical PDF files (downloading, storing, deleting).
- Retrieving the library and ensuring file integrity.
- cascading deletion of papers and their associated analysis data.
"""

import os
import json
from typing import List
import requests
import re
from datetime import datetime, timezone

from src.core.config import settings
from src.core.logger import get_logger
from src.models.local_paper import LocalPaper, PaperReadStatus
from src.dto.local_paper import LocalPaperResponse
from src.repositories.local_paper import LocalPaperRepository
from src.repositories.analysis import AnalysisRepository 
from src.repositories.chat import ChatRepository 

_logger = get_logger("[PythonSidecar - Local Paper]")

class LocalPaperService:
    """
    Service class for managing the local collection of research papers.
    """
    
    def __init__(self, 
                 local_paper_repo: LocalPaperRepository,
                 analysis_repo: AnalysisRepository,
                 chat_repo: ChatRepository):
        """
        Args:
            local_paper_repo (LocalPaperRepository): Repository for Paper metadata.
            analysis_repo (AnalysisRepository): Repository for analysis data (ToC).
            chat_repo (ChatRepository): Repository for chat history.
        """
        self.local_paper_repo = local_paper_repo
        self.analysis_repo = analysis_repo
        self.chat_repo = chat_repo
        self.storage_dir = settings.PAPER_STORAGE_DIR

    def save_paper(self, paper_dto: LocalPaperResponse) -> LocalPaperResponse:
        """
        Saves a paper to the local library.
        
        This process involves:
        1. Checking if the paper already exists.
        2. Downloading the PDF file immediately.
        3. Persisting metadata and file path to the database.

        Args:
            paper_dto (PaperRespoLocalPaperResponsense): The paper data from ArXiv search.

        Returns:
            LocalPaperResponse: The saved entity.
        """
        existing = self.local_paper_repo.get_by_id(paper_dto.paper_id)
        if existing:
            return existing
        
        db_paper = LocalPaper(
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
        self.local_paper_repo.create(db_paper)
        return paper_dto

    def download_pdf(self, paper_id: str, pdf_url: str) -> str:
        """
        Downloads the PDF file from ArXiv and saves it to local storage.

        Args:
            paper_id (str): The ArXiv ID.
            pdf_url (str): The URL to the PDF.

        Returns:
            str: The absolute path to the saved file.

        Raises:
            requests.RequestException: If the download fails.
        """

        # Sanitize ID for filename
        safe_id = re.sub(r'[^\w\-_\.]', '_', paper_id)
        file_path = os.path.join(self.storage_dir, f"{safe_id}.pdf")

        if not os.path.exists(file_path):
            _logger.info(f"⬇️ Downloading PDF for {paper_id}...")
            try:
                headers = {"User-Agent": "Mozilla/5.0 (BridgeResearchApp)"}
                response = requests.get(pdf_url, headers=headers, stream=True, timeout=60)
                response.raise_for_status()
                with open(file_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                _logger.info(f"✅ Downloaded to: {file_path}")
            except Exception as e:
                _logger.error(f"❌ Download failed: {e}")
                if os.path.exists(file_path): os.remove(file_path)
                raise e
        
        return file_path

    def delete_paper(self, paper_id: str) -> bool:
        """
        Performs a hard delete of the paper from the library.
        
        This includes:
        1. Deleting the physical PDF file.
        2. Cascade deleting chat history.
        3. Cascade deleting analysis data.
        4. Deleting the paper metadata.

        Args:
            paper_id (str): The ID of the paper to delete.

        Returns:
            bool: True if deleted successfully.
        """
        paper = self.local_paper_repo.get_by_id(paper_id)
        if not paper:
            return False

        # 1. Delete physical file
        if paper.local_path and os.path.exists(paper.local_path):
            try:
                os.remove(paper.local_path)
                _logger.info(f"🗑️ Deleted PDF file: {paper.local_path}")
            except Exception as e:
                _logger.warning(f"Failed to delete file: {e}")

        # 2. Delete dependent data (Cascade)
        self.chat_repo.delete_history(paper_id)
        self.analysis_repo.delete(paper_id)

        # 3. Delete Metadata
        return self.local_paper_repo.delete(paper_id)

    def get_library(self) -> List[LocalPaperResponse]:
        """
        Retrieves all saved papers.
        
        Also performs a self-healing check: if the file is missing from disk
        but exists in DB, it attempts to re-download it.

        Returns:
            List[PaperResponse]: List of paper DTOs.
        """
        papers = self.local_paper_repo.get_all()
        for paper in papers:
            try:
                self._ensure_local_file(paper)
            except Exception as e:
                continue
        return [
            LocalPaperResponse(
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
        
        
    def get_paper(self, paper_id: str) -> LocalPaperResponse | None:
        """
        Retrieves a single paper by ID, ensuring the file exists.
        
        Args:
            paper_id (str): ID of local paper.
            
        Returns:
            (LocalPaperResponse | None): Return a DTO object of matched paper if exists, else None.
        """
        paper = self.local_paper_repo.get_by_id(paper_id)
        try:
            self._ensure_local_file(paper)
        except Exception as e:
            return None
        
        return LocalPaperResponse(
            paper_id=paper.paper_id,
            title=paper.title,
            summary=paper.summary,
            authors=json.loads(paper.authors),
            published=paper.published.replace(tzinfo=timezone.utc) if paper.published.tzinfo is None else paper.published,
            pdf_link=paper.pdf_link,
            category=paper.category,
            is_saved=True,
            read_status=paper.read_status,
            local_path=paper.local_path
        )
    
    
    def _ensure_local_file(self, paper: LocalPaper) -> None:
        """
        Internal helper to check file integrity.
        If the file at `local_path` is missing, it triggers a re-download.
        """
        if paper.local_path and not os.path.exists(paper.local_path):
            _logger.warning(f'File not found at: {paper.local_path}. Re-downloading...')
            try:
                self.download_pdf(paper.paper_id, paper.pdf_link)
            except Exception as e:
                _logger.error(f"Failed to auto-restore file for {paper.paper_id}: {e}")
                raise e