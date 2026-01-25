"""
Service for interacting with the ArXiv API.

This module handles:
- Constructing complex query strings (keyword, category, date range).
- Fetching Atom/XML feeds from ArXiv.
- Parsing XML responses into structured PaperResponse objects.
- Checking against the local repository to mark papers as 'saved'.
"""

import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Set
import requests

from src.core.constants import ARXIV_API_URL, ARXIV_XML_NAMESPACE
from src.core.logger import get_logger
from src.dto.local_paper import LocalPaperResponse
from src.models.local_paper import PaperReadStatus
from src.repositories.local_paper import LocalPaperRepository

_logger = get_logger('[PythonSidecar - ArXiv]')

class ArxivService:
    """
    Service class to search and fetch metadata from ArXiv.
    """
    def __init__(self, local_paper_repo: LocalPaperRepository):
        """
        Args:
            local_paper_repo (LocalPaperRepository): Repository to check for existing saved papers.
        """
        self.local_paper_repo = local_paper_repo
    
    def search_papers(
        self, 
        query: str = "",
        categories: List[str] | None = None,
        max_results: int = 20,
        start_date: str = None, 
        end_date: str = None
    ) -> List[LocalPaperResponse]:
        """
        Searches for papers on ArXiv based on multiple criteria.

        Args:
            query (str): Keyword search (title, abstract, authors).
            categories (List[str] | None): List of ArXiv categories (e.g., ['cs.AI', 'cs.CV']).
            max_results (int): Maximum number of results to return.
            start_date (str): Filter by submission date (YYYY-MM-DD).
            end_date (str): Filter by submission date (YYYY-MM-DD).

        Returns:
            List[LocalPaperResponse]: A list of paper DTOs, with local status (is_saved) populated.
        """
        
        save_ids = set(self.local_paper_repo.get_all_ids())
        
        search_query = self._format_query(query, categories, start_date, end_date)

        params = {
            "search_query": search_query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending"
        }

        req = requests.Request('GET', ARXIV_API_URL, params=params)
        prepared = req.prepare()

        try:
            response = requests.Session().send(prepared, timeout=20)
            response.raise_for_status()
            
            content = response.content
            _logger.info(f"📥 Received {len(content)} bytes")
            
            return self._parse_xml(content, save_ids)
            
        except Exception as e:
            _logger.error(f"❌ Arxiv fetch failed: {e}")
            return []
        
    def _format_query(self, query: str, categories: List[str] | None, 
                      start_date: str, end_date: str) -> str:
        """
        Constructs the ArXiv API query string according to their query syntax.
        
        Format: `(all:keyword AND (cat:cs.AI OR cat:cs.CV) AND submittedDate:[...])`
        """
        query_parts = []
        
        # 1. Keyword
        if query and query.strip():
            clean_kw = query.strip().replace("+", " ")
            if "cat:" not in clean_kw and "all:" not in clean_kw:
                 query_parts.append(f"all:{clean_kw}")
            else:
                 query_parts.append(clean_kw)

        # 2. Categories
        if categories and len(categories) > 0:
            cat_parts = [f"cat:{c}" for c in categories]
            query_parts.append(f"({' OR '.join(cat_parts)})")
        # Default
        if not query_parts:
            query_parts.append("cat:cs.AI")

        # 3. Aggreration
        search_query = " AND ".join(query_parts)

        # 4. Filter Date
        if start_date and end_date:
            s_str = start_date.replace("-", "") + "0000"
            e_str = end_date.replace("-", "") + "2359"
            search_query += f" AND submittedDate:[{s_str} TO {e_str}]"
            
        return search_query

    def _parse_xml(self, xml_content: bytes, save_ids: Set[str]) -> List[LocalPaperResponse]:
        """
        Parses the raw Atom XML response from ArXiv into PaperResponse objects.
        """
        try:
            root = ET.fromstring(xml_content)
            papers = []
            entries = root.findall('atom:entry', ARXIV_XML_NAMESPACE)

            for entry in entries:
                try:
                    id_url = entry.find('atom:id', ARXIV_XML_NAMESPACE).text
                    p_id = id_url.split('/abs/')[-1].split('v')[0]
                    
                    is_saved = p_id in save_ids
                    if is_saved:
                        local_path = self.local_paper_repo.get_by_id(p_id).local_path
                    else:
                        local_path = None

                    title = entry.find('atom:title', ARXIV_XML_NAMESPACE).text.replace('\n', ' ').strip()
                    summary = entry.find('atom:summary', ARXIV_XML_NAMESPACE).text.replace('\n', ' ').strip()
                    authors = [a.find('atom:name', ARXIV_XML_NAMESPACE).text for a in entry.findall('atom:author', ARXIV_XML_NAMESPACE)]
                    
                    published_str = entry.find('atom:published', ARXIV_XML_NAMESPACE).text
                    if published_str.endswith("Z"):
                        published_str = published_str[:-1] + "+00:00"
                    published = datetime.fromisoformat(published_str)

                    pdf_link = ""
                    for link in entry.findall('atom:link', ARXIV_XML_NAMESPACE):
                        if link.attrib.get('title') == 'pdf':
                            pdf_link = link.attrib.get('href')
                    if not pdf_link:
                        pdf_link = id_url.replace('/abs/', '/pdf/') + ".pdf"

                    cat_tag = entry.find('arxiv:primary_category', ARXIV_XML_NAMESPACE)
                    category = cat_tag.attrib.get('term') if cat_tag is not None else "cs.AI"

                    papers.append(LocalPaperResponse(
                        paper_id=p_id,
                        title=title,
                        summary=summary,
                        authors=authors,
                        published=published,
                        pdf_link=pdf_link,
                        category=category,
                        is_saved=is_saved,
                        local_path=local_path,
                        read_status=PaperReadStatus.UNREAD
                    ))
                except Exception as parse_err:
                    _logger.warning(f"⚠️ Error parsing an entry: {parse_err}")
                    continue
                
            return papers
        except ET.ParseError as e:
            _logger.error(f"❌ XML Parse Error: {e}")
            return []