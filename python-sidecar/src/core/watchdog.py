"""
Watchdog module for monitoring sidecar health and auto-shutdown.

This module provides a watchdog timer that automatically shuts down the Python
sidecar process if no activity is detected for a configured timeout period.
The watchdog is designed to:
- Prevent orphaned sidecar processes from consuming system resources.
- Keep the sidecar alive while active requests are being processed.
- Reset the timer on each user interaction (via the `touch()` method).

The watchdog runs in a background daemon thread and checks for inactivity
at regular intervals. If no activity is detected and no requests are active,
the sidecar process is terminated using `os._exit(0)`.
"""

import os
import threading
import time
from typing import Callable

from src.core.logger import get_logger

_logger = get_logger("[PythonSidecar - Watchdog]")


class SidecarWatchdog:
    """
    Watchdog timer for automatic sidecar shutdown on inactivity.

    This class monitors the time elapsed since the last user interaction
    and shuts down the sidecar if no activity occurs within the timeout
    period. Active requests are taken into account to prevent premature
    shutdown during long-running operations.

    Attributes:
        timeout_seconds (int): Maximum seconds of inactivity before shutdown.
        check_interval_seconds (float): Interval between health checks.
        _last_interaction_time (float): Timestamp of last interaction.
        _thread (threading.Thread | None): Background watchdog thread.

    Example:
        >>> watchdog = SidecarWatchdog(timeout_seconds=120, check_interval_seconds=5.0)
        >>> watchdog.start(get_active_requests_count=lambda: 0)
        >>> # ... normal operation ...
        >>> watchdog.touch()  # Reset timer on user interaction
    """
    def __init__(self, timeout_seconds: int, check_interval_seconds: float):
        """
        Initialize the watchdog with a timeout and check interval.

        Args:
            timeout_seconds (int): Time in seconds to wait before considering
                the sidecar unresponsive.
            check_interval_seconds (float): Time in seconds between health checks.
        """
        self.timeout_seconds = timeout_seconds
        self.check_interval_seconds = check_interval_seconds
        self._last_interaction_time = time.time()
        self._thread: threading.Thread | None = None

    def touch(self) -> None:
        """
        Reset the watchdog timer by updating the last interaction time.

        Call this method on each user interaction to prevent automatic shutdown.
        """
        self._last_interaction_time = time.time()

    def start(self, get_active_requests_count: Callable[[], int]) -> None:
        """
        Start the watchdog monitoring thread.

        Args:
            get_active_requests_count (Callable[[], int]): Function that returns
                the current number of active requests. Used to determine if
                shutdown is safe.

        Note:
            If the watchdog thread is already running, this method returns
            immediately without creating a new thread.
        """
        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(
            target=self._run,
            args=(get_active_requests_count,),
            daemon=True,
        )
        self._thread.start()

    def _run(self, get_active_requests_count: Callable[[], int]) -> None:
        """
        Main watchdog loop that monitors for inactivity.

        This internal method runs in a background thread and:
        1. Sleeps for the configured check interval.
        2. Calculates elapsed time since last interaction.
        3. Checks if active requests are in progress.
        4. Shuts down if timeout exceeded AND no active requests.

        Args:
            get_active_requests_count (Callable[[], int]): Function to get
                current active request count.
        """
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
