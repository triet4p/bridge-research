@echo off
@chcp 65001 >nul
SETLOCAL

REM Lấy thư mục gốc của dự án (thư mục cha của folder scripts)
SET "SCRIPT_DIR=%~dp0"
SET "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Di chuyển về root
cd /d "%PROJECT_ROOT%"

REM Kiểm tra tham số truyền vào
IF "%1"=="--rebuild-sidecar" (
    ECHO.
    ECHO [DEV-SCRIPT] 🛠️  Found flag --rebuild-sidecar. Rebuilding Python backend...
    ECHO -----------------------------------------------------------------------
    
    cd python-sidecar
    
    REM Gọi UV để chạy script build
    call uv run python -m scripts.build_sidecar
    
    REM Kiểm tra lỗi build
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