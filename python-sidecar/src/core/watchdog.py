import os
import threading
import time
from typing import Callable

from src.core.logger import get_logger

_logger = get_logger("[PythonSidecar - Watchdog]")


class SidecarWatchdog:
    def __init__(self, timeout_seconds: int = 120, check_interval_seconds: float = 5.0):
        self.timeout_seconds = timeout_seconds
        self.check_interval_seconds = check_interval_seconds
        self._last_interaction_time = time.time()
        self._thread: threading.Thread | None = None

    def touch(self) -> None:
        self._last_interaction_time = time.time()

    def start(self, get_active_requests_count: Callable[[], int]) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(
            target=self._run,
            args=(get_active_requests_count,),
            daemon=True,
        )
        self._thread.start()

    def _run(self, get_active_requests_count: Callable[[], int]) -> None:
        while True:
            time.sleep(self.check_interval_seconds)
            elapsed = time.time() - self._last_interaction_time
            active_requests = get_active_requests_count()

            if elapsed > self.timeout_seconds and active_requests == 0:
                _logger.warning(
                    f"⚠️ No activity for {elapsed:.1f}s and no active requests. Shutting down sidecar."
                )
                os._exit(0)

            if elapsed > self.timeout_seconds and active_requests > 0:
                _logger.debug(
                    f"⏳ No health check for {elapsed:.1f}s but {active_requests} request(s) still active. Keeping alive."
                )
