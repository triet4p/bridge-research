from datetime import datetime
import json
import os
import pymupdf
import requests
import pymupdf4llm
import re
from typing import List, Dict, Tuple

from src.core.config import settings
from src.core.logger import get_logger
from src.models.analysis import PaperAnalysis
from src.repositories.analysis_repository import AnalysisRepository
from src.dto.analysis_dto import ParsedDocument, TocNode

logger = get_logger("[PythonSidecar PDFService]")

class PaperContentService:
    def __init__(self, repo: AnalysisRepository):
        self.storage_dir = settings.PAPER_STORAGE_DIR
        self.repo = repo
        
    def get_analysis_status(self, paper_id: str) -> bool:
        """Kiểm tra xem paper này đã được analyze chưa"""
        return self.repo.get(paper_id) is not None
    
    def get_parsed_document(self, paper_id: str) -> ParsedDocument | None:
        """Lấy dữ liệu đã phân tích từ DB"""
        record = self.repo.get(paper_id)
        if not record:
            return None
        
        # Convert DB Model -> DTO
        # Cần convert dict -> Pydantic model cho TocNode
        toc_data = record.toc
        toc_nodes = [TocNode.model_validate(node) for node in toc_data] # Đệ quy đơn giản nếu Pydantic hỗ trợ, hoặc cần hàm helper

        return ParsedDocument(
            paper_id=record.paper_id,
            toc=toc_nodes,
            content_map=record.content_map
        )

    def analyze_paper(self, paper_id: str, pdf_url: str) -> ParsedDocument:
        """
        Thực hiện Indexing: Download -> Parse -> Save DB
        """
        logger.info(f"🚀 Starting analysis for {paper_id}...")
        
        doc = self.get_parsed_document(paper_id)
        if doc is not None:
            logger.info(f'Paper is already exists')
            return doc
        
        # 1. Download
        file_path = self._download_pdf(paper_id, pdf_url)
        
        # 2. Parse Markdown
        md_text = pymupdf4llm.to_markdown(file_path)
        toc, content_map = self._build_toc_tree(md_text)
        
        # 3. Save to DB
        # Convert TocNode objects -> Dict để lưu JSON
        toc_dicts = [node.model_dump() for node in toc]
        
        analysis_record = PaperAnalysis(
            paper_id=paper_id,
            toc_json=json.dumps(toc_dicts),
            content_map_json=json.dumps(content_map),
            pdf_local_path=file_path,
            analyzed_at=datetime.now()
        )
        self.repo.save(analysis_record)
        
        logger.info(f"✅ Analysis saved to DB for {paper_id}")
        
        return ParsedDocument(
            paper_id=paper_id,
            toc=toc,
            content_map=content_map
        )

    def delete_analysis(self, paper_id: str) -> bool:
        """Xóa data trong DB và file PDF local"""
        record = self.repo.get(paper_id)
        if record:
            # Xóa file PDF
            if record.pdf_local_path and os.path.exists(record.pdf_local_path):
                try:
                    os.remove(record.pdf_local_path)
                    logger.info(f"🗑️ Deleted local PDF: {record.pdf_local_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete PDF file: {e}")
            
            # Xóa DB
            return self.repo.delete(paper_id)
        return False

    def _download_pdf(self, paper_id: str, url: str) -> str:
        """Tải PDF nếu chưa có"""
        # Clean ID để làm tên file an toàn
        safe_id = re.sub(r'[^\w\-_\.]', '_', paper_id)
        file_path = os.path.join(self.storage_dir, f"{safe_id}.pdf")

        if os.path.exists(file_path):
            logger.info(f"📄 PDF already exists: {file_path}")
            return file_path

        logger.info(f"⬇️ Downloading PDF from {url}...")
        try:
            # ArXiv chặn User-Agent mặc định của python-requests
            headers = {"User-Agent": "Mozilla/5.0 (BridgeResearchApp/0.1.0)"}
            response = requests.get(url, headers=headers, stream=True, timeout=60)
            response.raise_for_status()

            with open(file_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.info(f"✅ Downloaded to: {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"❌ Download failed: {e}")
            if os.path.exists(file_path): os.remove(file_path) # Xóa file lỗi
            raise e

    def _build_toc_tree(self, md_text: str) -> Tuple[List[TocNode], Dict[str, str]]:
        lines = md_text.split('\n')
        root_nodes: List[TocNode] = []
        content_map: Dict[str, str] = {}
        
        stack: List[Tuple[int, TocNode]] = []
        current_content_lines = []
        
        # Node ảo ban đầu
        intro_node = TocNode(id="intro", title="Abstract / Overview", level=0, preview="")
        stack.append((0, intro_node))
        root_nodes.append(intro_node)

        node_counter = 0

        # Hàm helper lưu nội dung (Giữ nguyên logic cũ)
        def save_buffer_to_current_node():
            if not stack: return
            nonlocal current_content_lines
            full_text = "\n".join(current_content_lines).strip()
            if not full_text: return

            _, active_node = stack[-1]
            
            if active_node.id in content_map:
                content_map[active_node.id] += "\n\n" + full_text
            else:
                content_map[active_node.id] = full_text
            
            # Smart Preview: Lấy đoạn văn đầu tiên
            if not active_node.preview:
                # 1. Gộp paragraph nếu quá ngắn
                paragraphs = full_text.split('\n\n')
                preview_text = paragraphs[0].replace('\n', ' ').strip()
                
                if len(preview_text) < 400 and len(paragraphs) > 1:
                    second_para = paragraphs[1].replace('\n', ' ').strip()
                    preview_text += " " + second_para

                # 2. Clean Markdown
                preview_text = re.sub(r'\*\*|__|_', '', preview_text)
                
                # 3. Smart Truncate Logic
                LIMIT = 1000
                
                if len(preview_text) <= LIMIT:
                    active_node.preview = preview_text
                else:
                    # Cắt thô tại giới hạn
                    truncated = preview_text[:LIMIT]
                    
                    # Ưu tiên 1: Cắt tại dấu chấm câu cuối cùng (. ! ?)
                    # Regex tìm dấu câu + khoảng trắng (hoặc hết chuỗi)
                    # rfind không hỗ trợ regex, nên ta dùng loop đơn giản
                    last_sentence_idx = -1
                    for p in ['. ', '! ', '? ']:
                        idx = truncated.rfind(p)
                        if idx > last_sentence_idx:
                            last_sentence_idx = idx
                    
                    # Nếu tìm thấy dấu chấm câu và nó không nằm quá xa (giữ lại ít nhất 50% nội dung)
                    if last_sentence_idx > LIMIT * 0.7:
                        active_node.preview = truncated[:last_sentence_idx + 1] # Lấy cả dấu chấm
                    else:
                        # Ưu tiên 2: Cắt tại khoảng trắng cuối cùng (ngắt từ)
                        last_space_idx = truncated.rfind(' ')
                        if last_space_idx != -1:
                            active_node.preview = truncated[:last_space_idx] + "..."
                        else:
                            # Đường cùng: Cắt thô
                            active_node.preview = truncated + "..."
            
            current_content_lines = []

        # --- FIX: Regex nâng cao ---
        # 1. Markdown Header chuẩn: # Title
        re_md_header = re.compile(r'^(#+)\s+(.*)')
        
        # 2. Bold Numbered Header: **1. Introduction** hoặc **2.1 Method**
        # Giải thích: Bắt đầu bằng **, theo sau là số (1 hoặc 1.1), có thể có dấu chấm, khoảng trắng, tên, kết thúc **
        re_bold_num = re.compile(r'^\*\*\s*(\d+(?:\.\d+)*)\.?\**\s*\**\s+(.*?)\*\*\s*$')
        
        # 3. Bold Keyword Header: **Abstract**, **References**
        re_bold_key = re.compile(r'^\*\*\s*(Abstract|Introduction|Related Work|Methodology|Experiments|Conclusion|References|Acknowledgments)\s*\*\*\s*$', re.IGNORECASE)

        for line in lines:
            line = line.strip()
            if not line: continue 

            level = -1
            title = ""
            
            # Check 1: Standard Markdown Header (#)
            match_md = re_md_header.match(line)
            if match_md:
                hashes, title_text = match_md.groups()
                level = len(hashes)
                title = title_text.strip()

            # Check 2: Heuristic Bold Headers (Nếu không phải Markdown Header)
            if level == -1:
                match_bold_num = re_bold_num.match(line)
                match_bold_key = re_bold_key.match(line)
                
                if match_bold_num:
                    num_str, title_text = match_bold_num.groups()
                    # Suy luận level dựa vào số dấu chấm: "1" -> Level 2, "1.1" -> Level 3
                    # (Giả sử Level 1 là Title bài báo)
                    level = 2 + num_str.count('.')
                    title = f"{num_str}. {title_text.strip()}"
                
                elif match_bold_key:
                    title_text = match_bold_key.group(1)
                    level = 2 # Coi Abstract/Intro/Ref là Level 2 ngang hàng
                    title = title_text.strip()

            # --- Xử lý tạo Node ---
            if level > 0:
                save_buffer_to_current_node()
                
                node_id = f"sec_{node_counter}"
                node_counter += 1
                
                # Clean title (bỏ bold nếu còn sót)
                title = title.replace('**', '')
                
                new_node = TocNode(id=node_id, title=title, level=level, preview="")
                
                # Logic xếp cây (Stack)
                while stack and stack[-1][0] >= level:
                    stack.pop()
                
                if stack:
                    parent = stack[-1][1]
                    parent.children.append(new_node)
                else:
                    root_nodes.append(new_node) # Fallback nếu format lạ
                
                stack.append((level, new_node))
            else:
                # Dòng thường
                current_content_lines.append(line)
        
        save_buffer_to_current_node()
        return root_nodes, content_map