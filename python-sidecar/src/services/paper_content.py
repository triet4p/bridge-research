"""
Service for managing paper content processing and analysis.

This module handles:
1.  Downloading PDF files from ArXiv.
2.  Parsing PDFs into Markdown using `pymupdf4llm`.
3.  Analyzing the Markdown structure to build a hierarchical Table of Contents (ToC).
4.  Persisting analysis results (ToC tree and content map) to the database.
5.  Managing the lifecycle of analysis data (create, get, delete).
"""

from datetime import datetime
import re
from typing import List, Dict, Tuple
import json
import pymupdf.layout
import pymupdf4llm

from src.core.config import settings
from src.core.logger import get_logger
from src.models.analysis import PaperAnalysis
from src.repositories.analysis import AnalysisRepository
from src.repositories.chat import ChatRepository
from src.services.local_paper import LocalPaperService
from src.dto.analysis import ParsedDocument, TocNode

_logger = get_logger("[PythonSidecar - Paper Content]")

class PaperContentService:
    """
    Service responsible for the `Indexing` phase of the RAG pipeline.
    It transforms raw PDF files into structured, queryable data.
    """
    
    def __init__(self, analysis_repo: AnalysisRepository,
                 chat_repo: ChatRepository,
                 local_paper_service: LocalPaperService):
        """
        Args:
            analysis_repo (AnalysisRepository): For storing ToC and content map.
            chat_repo (ChatRepository): For cleaning up chat history when analysis is deleted.
            local_paper_service (LocalPaperService): For managing PDF file downloads and metadata.
        """
        self.storage_dir = settings.PAPER_STORAGE_DIR
        self.analysis_repo = analysis_repo
        self.chat_repo = chat_repo
        self.local_paper_service = local_paper_service
        self._init_patterns()
        
    def _init_patterns(self):
        """
        Pre-compile regex patterns for header extraction to improve performance.
        
        The patterns are designed to catch various academic paper formatting styles,
        handling bold text (`**`), numbering (`1.`, `1.2`, `A.1`), and standard keywords.
        """
        # Numbered patterns with support for:
        # - Pure numbers: 1, 1.2, 1.2.3
        # - Letters: E, E.1, E.2.1
        # - Roman: I, II, III, IV, V, ...
        
        # Core number/letter pattern
        self.num_letter_pattern = r'[A-Z](?:\.\d+)*|\d+(?:\.\d+)*'
        self.roman_pattern = r'I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3}'
        self.full_num_pattern = f'(?:{self.num_letter_pattern}|{self.roman_pattern})'
        
        # Numbered header patterns (order matters!)
        self.numbered_patterns = [
            # **1. Introduction** or **E.1 Training**
            re.compile(rf'^\*\*\s*({self.full_num_pattern})\.\s+([^*]+?)\*\*$'),
            
            # **1.2** Architecture (title not bold)
            re.compile(rf'^\*\*\s*({self.full_num_pattern})\.\*\*\s+(.+)$'),
            
            # **1** **Introduction**
            re.compile(rf'^\*\*\s*({self.full_num_pattern})\s*\*\*\s+\*\*([^*]+?)\*\*$'),
            
            # **1**. **Introduction**
            re.compile(rf'^\*\*\s*({self.full_num_pattern})\s*\*\*\.\s+\*\*([^*]+?)\*\*$'),
            
            # 1. **Introduction** (number not bold)
            re.compile(rf'^({self.full_num_pattern})\.\s+\*\*([^*]+?)\*\*$'),
        ]
        
        # Keyword pattern
        keywords = [
            'Abstract', 'Introduction', 'Related Works?', 'Methods?', 
            'Experiments?', 'Results?', 'Discussion', 'Conclusion', 
            'References', 'Acknowledgments?', 'Appendix'
        ]
        keyword_regex = '|'.join(keywords)
        self.keyword_pattern = re.compile(rf'^\*\*\s*({keyword_regex})\s*\*\*$', re.IGNORECASE)
        
        # Utility patterns
        self.noise_pattern = re.compile(r'^[_#\s]*$')
        self.markdown_pattern = re.compile(r'^#{1,6}\s+(.+)$')
        
    def get_analysis_status(self, paper_id: str) -> bool:
        """
        Checks if a paper has already been analyzed/indexed.

        Args:
            paper_id (str): The ArXiv ID.

        Returns:
            bool: True if analysis exists in DB.
        """
        return self.analysis_repo.get(paper_id) is not None
    
    def get_parsed_document(self, paper_id: str) -> ParsedDocument | None:
        """
        Retrieves the full analysis result (ToC + Content) from the database.

        Args:
            paper_id (str): The ArXiv ID.

        Returns:
            ParsedDocument | None: The DTO containing the tree and content map, or None if not found.
        """
        record = self.analysis_repo.get(paper_id)
        if not record:
            return None
        
        toc_data = record.toc
        toc_nodes = [TocNode.model_validate(node) for node in toc_data]

        return ParsedDocument(
            paper_id=record.paper_id,
            toc=toc_nodes,
            content_map=record.content_map
        )

    def analyze_paper(self, paper_id: str, pdf_url: str) -> ParsedDocument:
        """
        Executes the full indexing pipeline:
        1. Check/Download PDF.
        2. Convert PDF to Markdown.
        3. Parse Markdown into a hierarchical Tree (ToC).
        4. Save everything to Database.

        Args:
            paper_id (str): The ArXiv ID.
            pdf_url (str): URL to download the PDF if missing.

        Returns:
            ParsedDocument: The result of the analysis.

        Raises:
            ValueError: If the paper metadata is not saved in the library first.
        """
        _logger.info(f"🚀 Starting analysis for {paper_id}...")
        
        doc = self.get_parsed_document(paper_id)
        if doc is not None:
            _logger.info(f'Paper already exists')
            return doc
        
        paper = self.local_paper_service.get_paper(paper_id)
        if paper is None:
            _logger.error(f'Paper {paper_id} is not saved. Please save it.')
            raise ValueError(f'Paper {paper_id} is not saved. Please save it.')
        
        file_path = paper.local_path
        
        # 2. Parse Markdown
        md_text = pymupdf4llm.to_markdown(file_path)
        toc, content_map = self._build_toc_tree(md_text)
        
        # 3. Save to DB
        toc_dicts = [node.model_dump() for node in toc]
        
        analysis_record = PaperAnalysis(
            paper_id=paper_id,
            toc_json=json.dumps(toc_dicts),
            content_map_json=json.dumps(content_map),
            pdf_local_path=file_path,
            analyzed_at=datetime.now()
        )
        self.analysis_repo.save(analysis_record)
        
        _logger.info(f"✅ Analysis saved to DB for {paper_id}")
        
        return ParsedDocument(
            paper_id=paper_id,
            toc=toc,
            content_map=content_map
        )

    def delete_analysis(self, paper_id: str) -> bool:
        """
        Clears analysis data to free up space or reset state.
        
        ## Action:
        - Deletes Chat History.
        - Deletes Analysis Record (ToC, Content).
        - DOES NOT delete the PDF file or Paper metadata (keeps it in Library).

        Args:
            paper_id (str): The ArXiv ID.

        Returns:
            bool: True if successful.
        """
        _logger.info(f"🗑️ Clearing analysis data for {paper_id}...")
        
        # 1. Clear chat
        self.chat_repo.delete_history(paper_id)
        
        # 2. Clear ToC
        success = self.analysis_repo.delete(paper_id)
        _logger.info(f'Delete success')
        return success
    
    def get_toc(self, paper_id: str) -> List[TocNode] | None:
        """
        Lightweight method to just get the Table of Contents (for UI display).
        Does not load the full content map.
        
        Args:
            paper_id (str): ID of paper.
            
        Returns:
            (List[TocNode] | None): Return list of ToC Node if found, else None
        """
        record = self.analysis_repo.get(paper_id)
        if not record:
            return None
        
        # Convert JSON -> List[TocNode]
        try:
            return [TocNode(**node) for node in record.toc]
        except Exception as e:
            _logger.error(f"Error parsing ToC JSON: {e}")
            return []
        
    # --- HELPER METHODS FOR PARSING ---

    def _clean_line(self, line: str) -> str:
        """Removes common markdown noise characters."""
        return line.strip('_ \t#')

    def _is_table_or_noise(self, text: str, line_idx: int, lines: List[str]) -> bool:
        """
        Heuristic check to identify if a line is likely part of a table or noise
        rather than a valid section header.
        
        Logic:
        - Contains multiple slashes (metrics like 30.5 / 40.2).
        - Starts with 'w/o' (ablation study rows).
        - Contains many decimal numbers.
        - Surrounded by table delimiters (|---|).
        """
        
        # Rule 1: Metrics row (e.g., 31.41 / 0.831 / 0.101)
        if text.count('/') >= 2:
            return True
        
        # Rule 2: Ablation rows (e.g., "w/o Text Guidance")
        if re.match(r'^[`\']*(w/o|without)\s+', text, re.IGNORECASE):
            return True
        
        # Rule 3: Many decimal numbers
        decimal_count = len(re.findall(r'\d+\.\d+', text))
        if decimal_count >= 3:
            return True
        
        # Rule 4: Short numeric-only title
        words = text.split()
        if len(words) <= 2:
            if all(re.match(r'^\d+(\.\d+)?$', w) for w in words):
                return True
        
        # Rule 5: Context check for markdown table structure
        context_range = 3  
        start = max(0, line_idx - context_range)
        end = min(len(lines), line_idx + context_range + 1)
        
        for i in range(start, end):
            if i == line_idx:
                continue
            line = lines[i].strip()
            # Table delimiter: |---|---|
            if re.match(r'^[\|\s]*[-:]+[\|\s]*[-:]+', line):
                return True
            # Multiple pipes indicating table structure
            if line.count('|') >= 2:
                return True
        
        return False

    def _extract_header(self, line: str, line_idx: int, lines: List[str]) -> (Dict | None):
        """
        Analyzes a line to determine if it's a valid section header.
        
        Returns:
            dict: {'number': str, 'title': str, 'type': str} if valid.
            None: If it's regular text or noise.
        """
        
        line = self._clean_line(line)
        
        # Skip empty or noise lines
        if not line or self.noise_pattern.match(line):
            return None
        
        # Strip markdown prefix if exists
        if line.startswith('#'):
            md_match = self.markdown_pattern.match(line)
            if md_match:
                line = md_match.group(1).strip()
        
        # Try numbered patterns first (most common)
        for pattern in self.numbered_patterns:
            match = pattern.match(line)
            if match:
                number = match.group(1)
                title = match.group(2).strip()
                
                # Filter out table rows with context
                if self._is_table_or_noise(title, line_idx, lines):
                    return None
                
                return {
                    'number': number,
                    'title': title,
                    'type': 'numbered'
                }
        
        # Try keyword pattern
        match = self.keyword_pattern.match(line)
        if match:
            return {
                'number': None,
                'title': match.group(1).strip(),
                'type': 'keyword'
            }
        
        return None


    def _calculate_level(self, number: str | None) -> int:
        """
        Calculate level from numbering.
        Examples:
        - "1" -> 1, "1.2" -> 2, "1.2.3" -> 3
        - "E" -> 1, "E.1" -> 2, "E.2.1" -> 3
        - "I", "II", "III" -> 1
        """
        if not number:
            return 1  # Keywords are level 1
        
        # Roman numerals are always level 1
        if re.match(r'^(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3})$', number):
            return 1
        
        # Single letter without dots (E, A, B) -> level 1
        if len(number) == 1 and number.isalpha():
            return 1
        
        # Count dots for level
        # "1" -> 0 dots -> level 1
        # "1.2" -> 1 dot -> level 2
        # "E.1" -> 1 dot -> level 2
        clean_num = number.rstrip('.')
        return clean_num.count('.') + 1

    def _build_toc_tree(self, md_text: str) -> Tuple[List[TocNode], Dict[str, str]]:
        """
        Parses the entire markdown text to build a hierarchical Table of Contents.
        
        Returns:
            (Tuple[List[TocNode], Dict[str, str]]): (List of root nodes, Dictionary mapping node_id to content text)
        """
        lines = md_text.split('\n')
        
        # PASS 1: Extract all header candidates
        candidates = []
        seen_positions = set()  # Track để tránh duplicate
        
        for i, line in enumerate(lines):
            # Skip if processed
            if i in seen_positions:
                continue
            
            header_info = self._extract_header(line, i, lines)  # Pass context
            if header_info:
                level = self._calculate_level(header_info['number'])
                
                # Build full title
                if header_info['number']:
                    title = f"{header_info['number']}. {header_info['title']}"
                else:
                    title = header_info['title']
                
                candidates.append({
                    'line_idx': i,
                    'level': level,
                    'title': title,
                    'type': header_info['type']
                })
                
                seen_positions.add(i)
        
        _logger.info(f"📋 Found {len(candidates)} headers")
        
        # PASS 2: Build tree structure
        if not candidates:
            node = TocNode(id="full_doc", title="Full Document", level=0, preview="", children=[])
            return [node], {"full_doc": md_text}
        
        root_nodes: List[TocNode] = []
        content_map: Dict[str, str] = {}
        stack: List[Tuple[int, TocNode]] = []
        node_counter = 0
        
        # Handle intro content (before first header)
        first_header_line = candidates[0]['line_idx']
        intro_content = "\n".join(lines[:first_header_line]).strip()
        if intro_content:
            intro_node = TocNode(
                id="intro", 
                title="Abstract / Overview", 
                level=1, 
                preview=self._generate_preview(intro_content), 
                children=[]
            )
            root_nodes.append(intro_node)
            stack.append((1, intro_node))
            content_map["intro"] = intro_content
        
        # Build tree from candidates
        for i, cand in enumerate(candidates):
            level = cand['level']
            title = cand['title'].replace('**', '').strip()
            
            # Extract content between this header and next
            start_line = cand['line_idx'] + 1
            end_line = candidates[i+1]['line_idx'] if i + 1 < len(candidates) else len(lines)
            content = "\n".join(lines[start_line:end_line]).strip()
            
            # Check if this node will have children
            has_children = False
            if i + 1 < len(candidates):
                next_level = candidates[i+1]['level']
                if next_level > level:
                    has_children = True
            
            # Skip empty leaf nodes
            if not content and not has_children:
                continue
            
            # Create node
            node_id = f"sec_{node_counter}"
            node_counter += 1
            
            new_node = TocNode(
                id=node_id,
                title=title,
                level=level,
                preview=self._generate_preview(content),
                children=[]
            )
            
            # Find correct parent
            while stack and stack[-1][0] >= level:
                stack.pop()
            
            if stack:
                parent_node = stack[-1][1]
                parent_node.children.append(new_node)
            else:
                root_nodes.append(new_node)
            
            stack.append((level, new_node))
            content_map[node_id] = content
        
        return root_nodes, content_map
    
    def _generate_preview(self, content: str, limit: int = 1000) -> str:
        """Generate preview text from content"""
        if not content:
            return ""
        
        # Take first 2 paragraphs
        paragraphs = content.split('\n\n', 2)
        preview = paragraphs[0].replace('\n', ' ')
        
        if len(preview) < 500 and len(paragraphs) > 1:
            preview += " " + paragraphs[1].replace('\n', ' ')
        
        # Clean markdown formatting
        preview = re.sub(r'\*\*|__|_', '', preview)
        
        # Truncate at word boundary
        if len(preview) > limit:
            preview = preview[:limit]
            last_space = preview.rfind(' ')
            if last_space > 0:
                preview = preview[:last_space]
            preview += "..."
        
        return preview