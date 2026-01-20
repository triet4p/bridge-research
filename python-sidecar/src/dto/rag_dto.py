# python-sidecar/src/dto/rag_dto.py
from pydantic import BaseModel
from typing import List, Dict, Optional

class TocNode(BaseModel):
    id: str          # Unique ID (vd: "sec_1.2")
    title: str       # Tên mục (vd: "2. Methodology")
    level: int       # Cấp độ (1 = #, 2 = ##...)
    preview: str     # 500 ký tự đầu để AI đọc nhanh
    children: List['TocNode'] = []

class ParsedDocument(BaseModel):
    paper_id: str
    toc: List[TocNode]            # Cây mục lục (để AI suy luận)
    content_map: Dict[str, str]   # Map {id: full_text} (để lấy nội dung khi AI chọn)