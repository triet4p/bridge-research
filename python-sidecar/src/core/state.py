"""
Shared application state management for tracking request lifecycle and ArXiv API state.

This module provides thread-safe state classes for managing:
- **SystemState**: Tracks active requests and background tasks using async locks
  to ensure thread-safe counter operations. Used for monitoring application load
  and coordinating with the watchdog.
- **ArxivAPIState**: Manages the ArXiv API HTTP client lifecycle, including rate
  limiting enforcement, user agent rotation, and connection pooling.

Both classes are designed to be stored in FastAPI's app.state for global access
across request handlers.
"""

import asyncio
import time
import random
import httpx
from src.core.logger import get_logger


_logger = get_logger("[PythonSidecar - System State]")

class SystemState:
    """
    Thread-safe state manager for tracking active requests and background tasks.

    This class uses an asyncio lock to ensure counter operations are atomic
    and safe for concurrent access from multiple async tasks.

    Attributes:
        _active_requests_count (int): Current number of active HTTP requests.
        _active_background_tasks (int): Current number of active background tasks.
        _lock (asyncio.Lock): Async lock for thread-safe counter operations.

    Example:
        >>> state = SystemState()
        >>> count = await state.increment_active_requests()
        >>> print(f"Active requests: {count}")
        >>> await state.decrement_active_requests()
    """
    def __init__(self):
        """Initialize system state with thread-safe counters and locks."""
        self._active_requests_count: int = 0
        self._active_background_tasks: int = 0
        self._lock = asyncio.Lock()

    @property
    def total_active_work(self) -> int:
        """
        Thread-safe read of total active work (requests + background tasks).

        Returns:
            int: The sum of active requests and background tasks.
        """
        return self._active_requests_count + self._active_background_tasks

    async def increment_active_requests(self) -> int:
        """
        Async-safe increment of active requests count.

        Returns:
            int: The new count after incrementing.
        """
        async with self._lock:
            self._active_requests_count += 1
            count = self._active_requests_count
        _logger.debug(f"Active requests incremented: {count}")
        return count

    async def decrement_active_requests(self) -> int:
        """
        Async-safe decrement of active requests count.

        Returns:
            int: The new count after decrementing (minimum 0).
        """
        async with self._lock:
            self._active_requests_count = max(0, self._active_requests_count - 1)
            count = self._active_requests_count
        _logger.debug(f"Active requests decremented: {count}")
        return count

    async def increment_background_tasks(self) -> int:
        """
        Async-safe increment of active background tasks count.

        Returns:
            int: The new count after incrementing.
        """
        async with self._lock:
            self._active_background_tasks += 1
            count = self._active_background_tasks
        _logger.debug(f"Background tasks incremented: {count}")
        return count

    async def decrement_background_tasks(self) -> int:
        """
        Async-safe decrement of active background tasks count.

        Returns:
            int: The new count after decrementing (minimum 0).
        """
        async with self._lock:
            self._active_background_tasks = max(0, self._active_background_tasks - 1)
            count = self._active_background_tasks
        _logger.debug(f"Background tasks decremented: {count}")
        return count

class ArxivAPIState:
    """
    State manager for ArXiv API client with rate limiting support.

    This class handles:
    - HTTP client initialization with custom headers and connection pooling.
    - Rate limiting enforcement by tracking time between requests.
    - User agent rotation to mimic browser behavior.

    Attributes:
        last_request_time (float): Timestamp of the last ArXiv API request.
        _lock (asyncio.Lock): Async lock for rate limiting operations.
        http_client (httpx.AsyncClient | None): The HTTP client instance.
        user_agent (str): Selected user agent string for requests.
        max_wait_time_seconds (float): Maximum wait time between requests.
        http_timeout_seconds (float): Timeout for HTTP requests.
        http_max_connections (int): Maximum concurrent connections.
        http_max_keepalive_connections (int): Maximum keepalive connections.

    Example:
        >>> state = ArxivAPIState(
        ...     user_agents=["Mozilla/5.0 ..."],
        ...     max_wait_time_seconds=3.5,
        ...     http_timeout_seconds=30.0,
        ...     http_max_connections=10,
        ...     http_max_keepalive_connections=5
        ... )
        >>> await state.init_client()
        >>> await state.wait_for_arxiv()  # Enforces rate limit
        >>> # ... make API request ...
        >>> await state.close_client()
    """
    def __init__(self,
                 user_agents: list[str],
                 max_wait_time_seconds: float,
                 http_timeout_seconds: float = 30.0,
                 http_max_connections: int = 10,
                 http_max_keepalive_connections: int = 5):
        """
        Initialize ArxivAPIState with rate limiting and HTTP client configuration.

        Args:
            user_agents (list[str]): List of user agent strings to choose from.
            max_wait_time_seconds (float): Minimum seconds to wait between requests.
            http_timeout_seconds (float): Timeout in seconds for HTTP requests.
            http_max_connections (int): Maximum number of concurrent connections.
            http_max_keepalive_connections (int): Maximum keepalive connections.
        """
        self.last_request_time = 0.0
        self._lock = asyncio.Lock()
        self.http_client: httpx.AsyncClient | None = None
        self.user_agent = random.choice(user_agents)
        self.max_wait_time_seconds = max_wait_time_seconds
        self.http_timeout_seconds = http_timeout_seconds
        self.http_max_connections = http_max_connections
        self.http_max_keepalive_connections = http_max_keepalive_connections

        _logger.info(f'Initialized ArxivAPIState with User-Agent: {self.user_agent}')

    async def init_client(self):
        """
        Initialize the HTTP client with custom headers and connection pooling.

        The client is configured with:
        - Custom User-Agent and Accept headers to mimic browser behavior.
        - Timeout from instance config (http_timeout_seconds).
        - Connection limits from instance config for resource management.
        """
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }

        self.http_client = httpx.AsyncClient(
            headers=headers,
            timeout=self.http_timeout_seconds,
            follow_redirects=True,
            limits=httpx.Limits(
                max_connections=self.http_max_connections,
                max_keepalive_connections=self.http_max_keepalive_connections
            )
        )
        _logger.info("Initialized ArxivAPIState HTTP client with custom headers")

    async def close_client(self):
        """Close the HTTP client and release resources."""
        if self.http_client:
            await self.http_client.aclose()
            _logger.info("Closed ArxivAPIState HTTP client")

    async def wait_for_arxiv(self):
        """
        Ensure we respect ArXiv's rate limits by waiting if necessary.

        This method calculates the elapsed time since the last request and
        sleeps if needed to maintain the configured minimum interval between
        requests. Thread-safe via async lock.
        """
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_request_time
            wait_time = max(0, self.max_wait_time_seconds - elapsed)

            if wait_time > 0:
                _logger.debug(f"Waiting for {wait_time:.2f} seconds before making next ArXiv request")
                await asyncio.sleep(wait_time)
            else:
                _logger.debug("No need to wait before making next ArXiv request")

            self.last_request_time = time.time()
