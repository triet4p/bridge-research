"""
Centralized logging configuration module.
Supports console output and file rotation based on configuration settings.
"""

import logging
import os
import sys
from datetime import datetime
from typing import Dict

from src.core.config import settings

# Cache to prevent recreating loggers with the same ID
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
    """
    Retrieves or creates a configured logger instance.

    Args:
        log_id (str): A unique identifier for the logger (usually the module name).

    Returns:
        logging.Logger: The configured logger instance.
    """
    global _LOGGER_CACHE
    
    if log_id in _LOGGER_CACHE:
        return _LOGGER_CACHE[log_id]
    
    _logger = logging.getLogger(log_id)
    _logger.setLevel(_LOGGING_LEVEL)
    
    # Clear existing handlers to avoid duplicate logs during re-initialization
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
                # Handle path expansion for home directory symbol '~'
                if _LOGGING_FILE_DIR.startswith('~'):  
                    expanded_dir = os.path.expanduser(_LOGGING_FILE_DIR)
                else:
                    expanded_dir = _LOGGING_FILE_DIR
                
                abs_dir = os.path.abspath(expanded_dir)
                os.makedirs(abs_dir, exist_ok=True)
                
                # Create a log file named by the current date (YYYYMMDD)
                now = datetime.now().strftime("%Y%m%d")
                file_path = os.path.join(abs_dir, f"bridge_research_{now}.log")
                
                _file_handler = logging.FileHandler(file_path, encoding='utf-8')
                _file_handler.setFormatter(formatter)
                _logger.addHandler(_file_handler)
                
            except Exception as e:
                # Fallback: Print error to stderr if file logging setup fails
                # This ensures the app doesn't crash due to logging issues (e.g., permissions)
                print(f"!! FAILED TO SETUP LOG FILE: {e}", file=sys.stderr)
        else:
            print("!! Log handler is 'file' but LOGGING_FILE_DIR is missing", file=sys.stderr)
        
    _LOGGER_CACHE[log_id] = _logger
    
    return _logger