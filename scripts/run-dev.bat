@echo off
@chcp 65001 >nul
SETLOCAL

REM Set the project root
SET "SCRIPT_DIR=%~dp0"
SET "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Move to root
cd /d "%PROJECT_ROOT%"

REM Check flags
IF "%1"=="--rebuild-sidecar" (
    ECHO.
    ECHO [DEV-SCRIPT] 🛠️  Found flag --rebuild-sidecar. Rebuilding Python backend...
    ECHO -----------------------------------------------------------------------
    
    cd python-sidecar
    
    call uv run python -m scripts.build_sidecar
    
    IF %ERRORLEVEL% NEQ 0 (
        ECHO [DEV-SCRIPT] ❌ Build Failed! Exiting...
        EXIT /B %ERRORLEVEL%
    )
    
    cd ..
    ECHO [DEV-SCRIPT] ✅ Build Sidecar Completed.
    ECHO.
) ELSE (
    ECHO [DEV-SCRIPT] ℹ️  Skipping Sidecar build (Use --rebuild-sidecar to force build)
)

ECHO [DEV-SCRIPT] 🚀 Starting Tauri Dev Environment...
ECHO -----------------------------------------------------------------------
call npx tauri icon assets/app-icon-square.png
call npm run tauri dev