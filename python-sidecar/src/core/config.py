import os
import sys
from pydantic_settings import BaseSettings, SettingsConfigDict

def get_env_path():
    """
    Determines the absolute path to the .env file based on the runtime environment.

    This function handles two scenarios:
    1. Frozen mode (PyInstaller): The app is running as a bundled executable. 
       The .env file is extracted to the temporary folder `sys._MEIPASS`.
    2. Development mode: The app is running from source. 
       The function traverses up the directory tree to find the project root.

    Returns:
        str: The absolute file path to the .env file.
    """
    if getattr(sys, 'frozen', False):
        # PyInstaller extracts data files to sys._MEIPASS
        base_path = sys._MEIPASS
    else:
        # Dev mode: src/core/config.py -> go up 2 levels to python-sidecar/
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    return os.path.join(base_path, ".env")

class Settings(BaseSettings):
    """
    Global application configuration settings.

    This class loads configuration from environment variables or a `.env` file.
    It defines server parameters, database connections, logging preferences,
    and file storage paths.

    Attributes:
        PROJECT_NAME (str): The name of the application. This is also used as the
            Service Name when storing/retrieving credentials from the OS Keyring.
        API_V1_STR (str): The URL prefix for all version 1 API endpoints
            (e.g., `/api/v1`).
        HOST (str): The network host address to bind the server to (default: localhost).
        PORT (int): The port number the Python sidecar server listens on.
        DATABASE_URL (str): The connection string for the SQLite database.
        LOGGING_LEVEL (str): The minimum severity level for logging messages
            (e.g., 'DEBUG', 'INFO', 'WARNING', 'ERROR').
        LOGGING_HANDLER (str): The output destination for logs. Options are
            'console' (stdout), 'file' (disk), or 'both'.
        LOGGING_FILE_DIR (str): The directory path where log files will be saved
            if `LOGGING_HANDLER` is set to 'file' or 'both'. Supports `~` expansion.
        PAPER_STORAGE_DIR (str): The local directory path where downloaded ArXiv
            PDF files are cached and stored.
        ARXIV_MAX_WAIT_TIME_SECONDS (float): Minimum time in seconds to wait between
            consecutive ArXiv API requests to respect rate limiting policies.
        ARXIV_HTTP_TIMEOUT_SECONDS (float): Timeout in seconds for ArXiv HTTP requests.
        ARXIV_HTTP_MAX_CONNECTIONS (int): Maximum number of concurrent connections
            for the ArXiv HTTP client.
        ARXIV_HTTP_MAX_KEEPALIVE_CONNECTIONS (int): Maximum number of keepalive
            connections for the ArXiv HTTP client.
        WATCHDOG_TIMEOUT_SECONDS (int): Maximum seconds of inactivity before the
            sidecar shuts down automatically.
        WATCHDOG_CHECK_INTERVAL_SECONDS (float): Interval in seconds between
            watchdog health checks.
    """
    
    # Server config
    PROJECT_NAME: str = "Bridge Research App"
    """
    The name of the application. This is also used as the 
    Service Name when storing/retrieving credentials from the OS Keyring.
    """
    API_V1_STR: str = '/api/v1'
    """ 
    The URL prefix for all version 1 API endpoints 
    (e.g., `/api/v1`).
    """
    HOST: str = "localhost"
    """The network host address to bind the server to (default: localhost)."""
    PORT: int = 14201
    """The port number the Python sidecar server listens on (default: 14201)"""
    
    # Database
    DATABASE_URL: str = "sqlite:///bridge_data.bridge"
    """The connection string for the SQLite database."""
    
    # Logging config
    LOGGING_LEVEL: str = 'INFO'
    """The minimum severity level for logging messages 
    (e.g., 'DEBUG', 'INFO', 'WARNING', 'ERROR').
    """
    LOGGING_HANDLER: str = 'console'
    """The output destination for logs. Options are 
    'console' (stdout/stderr), 'file' (disk), or 'both'.
    """
    LOGGING_FILE_DIR: str = '~/.bridge_research/logs'
    """The directory path where log files will be saved 
    if `LOGGING_HANDLER` is set to 'file' or 'both'. Supports `~` expansion.
    """
    
    # Local PDF Storage
    PAPER_STORAGE_DIR: str = os.path.join(os.path.expanduser("~"), ".bridge_research", "papers")
    """The local directory path where downloaded ArXiv
    PDF files are cached and stored.
    """

    # ArXiv API Config
    ARXIV_MAX_WAIT_TIME_SECONDS: float = 3.5
    """Minimum time in seconds to wait between consecutive ArXiv API requests
    to respect rate limiting policies.
    """

    # ArXiv HTTP Client Config
    ARXIV_HTTP_TIMEOUT_SECONDS: float = 30.0
    """Timeout in seconds for ArXiv HTTP requests.
    """
    ARXIV_HTTP_MAX_CONNECTIONS: int = 10
    """Maximum number of concurrent connections for the ArXiv HTTP client.
    """
    ARXIV_HTTP_MAX_KEEPALIVE_CONNECTIONS: int = 5
    """Maximum number of keepalive connections for the ArXiv HTTP client.
    """

    # WATCHDOG Config
    WATCHDOG_TIMEOUT_SECONDS: int = 120
    """Maximum seconds of inactivity before the sidecar shuts down automatically.
    """
    WATCHDOG_CHECK_INTERVAL_SECONDS: float = 5.0
    """Interval in seconds between watchdog health checks.
    """

    model_config = SettingsConfigDict(
        env_file=get_env_path(),
        env_ignore_empty=True,
        extra='ignore'
    )
    
settings = Settings()
"""
Application settings instance loaded from `.env` file and environment variables.

This global instance provides access to all configuration values defined in
the Settings class, including server parameters, database connections,
logging preferences, and file storage paths.

Example:
    >>> from src.core.config import settings
    >>> print(settings.PROJECT_NAME)
    Bridge Research App
    >>> print(settings.PORT)
    14201
"""

# Ensure the storage directory exists immediately upon loading settings
os.makedirs(settings.PAPER_STORAGE_DIR, exist_ok=True)