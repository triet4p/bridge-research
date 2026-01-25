from datetime import datetime
from typing import List, Dict, Any
import json
from sqlmodel import SQLModel, Field

class PaperAnalysis(SQLModel, table=True):
    """
    Represents the deep analysis result of a paper (The "Indexer" data).

    This model stores the parsed structure (Table of Contents) and the extracted
    text content from the PDF. It acts as a cache to avoid re-parsing the PDF
    every time a chat request is made.

    Attributes:
        paper_id (str): The unique ArXiv ID. Acts as both Primary Key and Foreign Key 
            to the Paper model.
        toc_json (str): The hierarchical Table of Contents stored as a JSON string.
        content_map_json (str): A dictionary mapping section IDs to their full text content,
            stored as a JSON string.
        analyzed_at (datetime): Timestamp when the analysis was performed.
        pdf_local_path (str): The absolute file path to the PDF used for this analysis.
    """
    __tablename__ = "paper_analysis"

    # Link 1-1 with Paper ID
    paper_id: str = Field(primary_key=True) 
    
    # Stores the tree structure (JSON String)
    toc_json: str 
    
    # Stores detailed content (JSON String: { "sec_1": "text...", "sec_2": "text..." })
    content_map_json: str
    
    # Metadata
    analyzed_at: datetime = Field(default_factory=datetime.now)
    pdf_local_path: str 

    @property
    def toc(self) -> List[Dict[str, Any]]:
        """
        Deserializes the Table of Contents from JSON string to a Python list.
        
        Returns:
            List[Dict]: A list of dictionary representations of TocNodes.
        """
        return json.loads(self.toc_json)
    
    @property
    def content_map(self) -> Dict[str, str]:
        """
        Deserializes the Content Map from JSON string to a Python dictionary.
        
        Returns:
            Dict[str, str]: A mapping of Section ID -> Full Text.
        """
        return json.loads(self.content_map_json)