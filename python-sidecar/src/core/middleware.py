"""
FastAPI middleware for tracking user interactions and request lifecycle.

This module provides middleware that:
- Tracks the number of active requests being processed.
- Updates the watchdog timer on each request to prevent premature shutdown.
- Logs request activity for debugging and monitoring purposes.

The middleware skips health check endpoints to avoid unnecessary logging
and watchdog resets from automated health probes.
"""

from fastapi import FastAPI, Request

from src.core.logger import get_logger

_logger = get_logger("[PythonSidecar - Middleware]")


def setup_interaction_tracking_middleware(app: FastAPI) -> None:
    """
    Set up HTTP middleware to track user interactions and request lifecycle.

    This function registers an HTTP middleware that:
    1. Increments the active request counter on request arrival.
    2. Touches the watchdog to reset the inactivity timer.
    3. Decrements the active request counter on request completion.

    Health check requests (ending with `/health`) are excluded from tracking
    to prevent them from affecting watchdog behavior and cluttering logs.

    Args:
        app (FastAPI): The FastAPI application instance to attach middleware to.

    ## Note:
        The middleware uses a `finally` block to ensure the request counter
        is decremented even if an exception occurs during request processing.
    """
    @app.middleware("http")
    async def update_last_interaction(request: Request, call_next):
        is_health_check = request.url.path.endswith("/health")
        app_state = request.app.state
        system_state = app_state.system_state

        if not is_health_check:
            current = await system_state.increment_active_requests()
            if current > 0:
                _logger.debug(
                    f"📥 Active requests: {current} | Path: {request.url.path}"
                )

        app_state.watchdog.touch()

        try:
            response = await call_next(request)
            return response
        finally:
            if not is_health_check:
                current = await system_state.decrement_active_requests()
                if current >= 0:
                    _logger.debug(
                        f"📤 Active requests: {current} | Completed: {request.url.path}"
                    )
