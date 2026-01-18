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
_LOGGING_HANDLER = settings.LOGGING_HANDLER
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
        if _LOGGING_FILE_DIR is None:
            raise ValueError("Log file dir must be set when using this handler")
        now = datetime.now().strftime("%Y%m%d_%H")
        os.makedirs(_LOGGING_FILE_DIR, exist_ok=True)
        _handler = logging.FileHandler(_LOGGING_FILE_DIR + f"/log_{now}.log",
                                       encoding='utf-8')
        _handler.setFormatter(formatter)
        _logger.addHandler(_handler)
        
    _LOGGER_CACHE[log_id] = _logger
    
    return _logger