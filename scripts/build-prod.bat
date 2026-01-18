@echo off
SETLOCAL

REM --- CẤU HÌNH ---
SET "SCRIPT_DIR=%~dp0"
SET "PROJECT_ROOT=%SCRIPT_DIR%.."

cd /d "%PROJECT_ROOT%"

ECHO.
ECHO [BUILD-PROD] 🚀 STARTING PRODUCTION BUILD...
ECHO ========================================================

REM 1. BUILD PYTHON SIDECAR
ECHO.
ECHO [1/2] 🐍 Building Python Sidecar (Frozen Mode)...
cd python-sidecar
call uv run python -m scripts.build_sidecar
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERROR] Python build failed!
    EXIT /B 1
)
cd ..
ECHO [SUCCESS] Sidecar built and moved to src-tauri/binaries/

REM 2. BUILD TAURI APP
ECHO.
ECHO [2/2] 🦀 Building Tauri App and Installer...
call npm run tauri build
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERROR] Tauri build failed!
    EXIT /B 1
)

ECHO.
ECHO ========================================================
ECHO [DONE] ✅ BUILD SUCCESSFUL!
ECHO.
ECHO 📂 Installer (Setup.exe): src-tauri/target/release/bundle/nsis/
ECHO 📂 Portable (Raw Exe):    src-tauri/target/release/
ECHO ========================================================
PAUSE