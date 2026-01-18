from datetime import datetime
from typing import List
import xml.etree.ElementTree as ET
import requests
from src.core.constants import ARXIV_API_URL, ARXIV_XML_NAMESPACE
from src.core.logger import get_logger
from src.dto.paper_dto import PaperResponse, PaperReadStatus

_logger = get_logger('[PythonSidecar - ArXiv]')

class ArxivService:
    def search_papers(
        self, 
        query: str = "",
        categories: List[str] | None = None,
        max_results: int = 20,
        start_date: str = None, 
        end_date: str = None
    ) -> List[PaperResponse]:
        
        search_query = self._format_query(query, categories, start_date, end_date)

        params = {
            "search_query": search_query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending"
        }

        # --- DEBUG 1: In ra URL thực tế ---
        # Tạo prepared request để xem URL cuối cùng trông thế nào
        req = requests.Request('GET', ARXIV_API_URL, params=params)
        prepared = req.prepare()
        _logger.info(f"🔗 Target URL: {prepared.url}")

        try:
            response = requests.Session().send(prepared, timeout=20)
            response.raise_for_status()
            
            # --- DEBUG 2: Check Raw Content ---
            content = response.content
            _logger.info(f"📥 Received {len(content)} bytes")
            if len(content) < 500:
                _logger.warning(f"Raw Response Snippet: {content.decode('utf-8')}")
            
            return self._parse_xml(content)
        except Exception as e:
            _logger.error(f"❌ Arxiv fetch failed: {e}")
            return []
        
    def _format_query(self, query: str, categories: List[str] | None, 
                      start_date: str, end_date: str) -> str:
        query_parts = []
        
        # 1. Xử lý Keyword (Tìm trong Title, Abstract, Author...)
        if query and query.strip():
            # Clean keyword: thay + bằng space để requests tự encode
            clean_kw = query.strip().replace("+", " ")
            # Bọc trong ngoặc kép nếu có khoảng trắng để tìm chính xác cụm từ (Optional, tuỳ nhu cầu)
            # Ở đây ta dùng all: đơn giản
            query_parts.append(f"all:{clean_kw}")

        # 2. Xử lý Categories (Logic OR giữa các category)
        # VD: (cat:cs.AI OR cat:cs.CV)
        if categories is not None and len(categories) > 0:
            cat_parts = [f"cat:{c}" for c in categories]
            # Nối bằng OR và bọc trong ngoặc đơn
            query_parts.append(f"({' OR '.join(cat_parts)})")

        # Nếu không có keyword và không có category, mặc định lấy cs.AI
        if not query_parts:
            query_parts.append("cat:cs.AI")

        # 3. Tổng hợp lại bằng AND
        # VD: all:YOLO AND (cat:cs.CV OR cat:cs.AI)
        search_query = " AND ".join(query_parts)

        # 4. Filter Date
        if start_date and end_date:
            s_str = start_date.replace("-", "") + "0000"
            e_str = end_date.replace("-", "") + "2359"
            search_query += f" AND submittedDate:[{s_str} TO {e_str}]"
            
        return search_query

    def _parse_xml(self, xml_content: bytes) -> List[PaperResponse]:
        try:
            root = ET.fromstring(xml_content)
            papers = []

            # --- DEBUG 3: Check Root Tag ---
            # logger.debug(f"XML Root Tag: {root.tag}") # Thường là {http://www.w3.org/2005/Atom}feed

            entries = root.findall('atom:entry', ARXIV_XML_NAMESPACE)
            _logger.info(f"🧩 Found {len(entries)} entries in XML")

            for entry in entries:
                try:
                    id_url = entry.find('atom:id', ARXIV_XML_NAMESPACE).text
                    p_id = id_url.split('/abs/')[-1].split('v')[0]

                    title = entry.find('atom:title', ARXIV_XML_NAMESPACE).text.replace('\n', ' ').strip()
                    summary = entry.find('atom:summary', ARXIV_XML_NAMESPACE).text.replace('\n', ' ').strip()
                    
                    authors = [a.find('atom:name', ARXIV_XML_NAMESPACE).text for a in entry.findall('atom:author', ARXIV_XML_NAMESPACE)]
                    
                    published_str = entry.find('atom:published', ARXIV_XML_NAMESPACE).text
                    # Xử lý ISO format (Python < 3.11 có thể kén chọn chữ Z)
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

                    papers.append(PaperResponse(
                        paper_id=p_id,
                        title=title,
                        summary=summary,
                        authors=authors,
                        published=published,
                        pdf_link=pdf_link,
                        category=category,
                        is_downloaded=False,
                        local_path=None,
                        read_status=PaperReadStatus.UNREAD
                    ))
                except Exception as parse_err:
                    _logger.warning(f"⚠️ Error parsing an entry: {parse_err}")
                    continue
                
            return papers
        except ET.ParseError as e:
            _logger.error(f"❌ XML Parse Error: {e}")
            _logger.error(f"Bad XML Content: {xml_content[:200]}...")
            return []

arxiv_service = ArxivService()