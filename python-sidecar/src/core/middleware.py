from fastapi import FastAPI, Request

from src.core.logger import get_logger

_logger = get_logger("[PythonSidecar - Middleware]")


def setup_interaction_tracking_middleware(app: FastAPI) -> None:
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
