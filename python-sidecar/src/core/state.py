"""
Shared application state for tracking request lifecycle
"""

import asyncio
import time
import random
import httpx
from src.core.logger import get_logger
from src.core.constants import ARXIV_USER_AGENTS, ARXIV_MAX_WAIT_TIME_SECONDS

_logger = get_logger("[PythonSidecar - System State]")

class SystemState:
    def __init__(self):
        # Request Tracking - using asyncio.Lock for async thread-safety
        self._active_requests_count: int = 0
        self._active_background_tasks: int = 0
        self._lock = asyncio.Lock()

    @property
    def total_active_work(self) -> int:
        """Thread-safe read of total active work (requests + background tasks)."""
        return self._active_requests_count + self._active_background_tasks

    async def increment_active_requests(self) -> int:
        """Async-safe increment of active requests count. Returns new count."""
        async with self._lock:
            self._active_requests_count += 1
            count = self._active_requests_count
        _logger.debug(f"Active requests incremented: {count}")
        return count

    async def decrement_active_requests(self) -> int:
        """Async-safe decrement of active requests count. Returns new count."""
        async with self._lock:
            self._active_requests_count = max(0, self._active_requests_count - 1)
            count = self._active_requests_count
        _logger.debug(f"Active requests decremented: {count}")
        return count
    
    async def increment_background_tasks(self) -> int:
        """Async-safe increment of active background tasks count. Returns new count."""
        async with self._lock:
            self._active_background_tasks += 1
            count = self._active_background_tasks
        _logger.debug(f"Background tasks incremented: {count}")
        return count

    async def decrement_background_tasks(self) -> int:
        """Async-safe decrement of active background tasks count. Returns new count."""
        async with self._lock:
            self._active_background_tasks = max(0, self._active_background_tasks - 1)
            count = self._active_background_tasks
        _logger.debug(f"Background tasks decremented: {count}")
        return count

class ArxivAPIState:
    def __init__(self):
        self.last_request_time = 0.0
        self._lock = asyncio.Lock()
        self.http_client: httpx.AsyncClient | None = None
        self.user_agent = random.choice(ARXIV_USER_AGENTS)
        
        _logger.info(f'Initialized ArxivAPIState with User-Agent: {self.user_agent}')
        
    async def init_client(self):
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        self.http_client = httpx.AsyncClient(
            headers=headers,
            timeout=30.0,
            follow_redirects=True,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        )
        _logger.info("Initialized ArxivAPIState HTTP client with custom headers")
        
    async def close_client(self):
        if self.http_client:
            await self.http_client.aclose()
            _logger.info("Closed ArxivAPIState HTTP client")
        
    async def wait_for_arxiv(self):
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_request_time
            wait_time = max(0, ARXIV_MAX_WAIT_TIME_SECONDS - elapsed)
            
            if wait_time > 0:
                _logger.debug(f"Waiting for {wait_time:.2f} seconds before making next ArXiv request")
                await asyncio.sleep(wait_time)
            else:
                _logger.debug("No need to wait before making next ArXiv request")
                
            self.last_request_time = time.time()
