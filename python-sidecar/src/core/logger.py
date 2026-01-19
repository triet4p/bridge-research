import logging
import os
import sys
from datetime import datetime
from typing import Dict, Literal

from src.core.config import settings

_LOGGER_CACHE: Dict[str, logging.Logger] = {}

LEVEL_MAPPING = {
    "INFO": logging.INFO,
    "ERROR": logging.ERROR,
    "WARNING": logging.WARNING,
    "DEBUG": logging.DEBUG,
    "FATAL": logging.FATAL,
}

_LOGGING_LEVEL = LEVEL_MAPPING[settings.LOGGING_LEVEL]
_LOGGING_HANDLER = settings.LOGGING_HANDLER.lower()
_LOGGING_FILE_DIR = settings.LOGGING_FILE_DIR

def get_logger(
    log_id: str
) -> logging.Logger:
    global _LOGGER_CACHE
    
    if log_id in _LOGGER_CACHE:
        return _LOGGER_CACHE[log_id]
    
    _logger = logging.getLogger(log_id)
    _logger.setLevel(_LOGGING_LEVEL)
    
    if _logger.hasHandlers():
        _logger.handlers.clear()
        
    handler = _LOGGING_HANDLER
    
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s by %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    
    if handler in ["console", "both"]:
        _handler = logging.StreamHandler(sys.stdout)
        _handler.setFormatter(formatter)
        _logger.addHandler(_handler)

    if handler in ["file", "both"]:
        if _LOGGING_FILE_DIR:
            try:
                if _LOGGING_FILE_DIR.startswith('~'):  
                    expanded_dir = os.path.expanduser(_LOGGING_FILE_DIR)
                else:
                    expanded_dir = _LOGGING_FILE_DIR
                print(f"LOGGING_FILE TO SETUP LOG FILE: {expanded_dir}", file=sys.stderr)
                
                # 2. Chuyển thành đường dẫn tuyệt đối
                abs_dir = os.path.abspath(expanded_dir)
                
                # 3. Tạo thư mục nếu chưa có (recursive)
                os.makedirs(abs_dir, exist_ok=True)
                
                now = datetime.now().strftime("%Y%m%d") # Gom log theo ngày
                file_path = os.path.join(abs_dir, f"bridge_research_{now}.log")
                
                _file_handler = logging.FileHandler(file_path, encoding='utf-8')
                _file_handler.setFormatter(formatter)
                _logger.addHandler(_file_handler)
                
            except Exception as e:
                # Fallback: Nếu lỗi file (quyền hạn, path sai), in lỗi ra console để biết
                print(f"!! FAILED TO SETUP LOG FILE: {e}", file=sys.stderr)
        else:
            print("!! Log handler is 'file' but LOGGING_FILE_DIR is missing", file=sys.stderr)
        
    _LOGGER_CACHE[log_id] = _logger
    
    return _logger