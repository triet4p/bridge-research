# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-19

### 🚀 Release Note
This patch release focuses on **Branding, Developer Experience, and Logging Stability**.

### ✨ Added
- **Branding:** Updated App Icon and Logo with a new "Bridge" design (Cybernetic style).
- **UI:** Added **"Max Results"** input field in the header (validates 1-100) to control ArXiv fetch limit.
- **DevOps:** Added automated batch scripts (`scripts/run-dev.bat`, `scripts/build-prod.bat`) with UTF-8 support for easier Windows development.

### 🔧 Fixed
- **Logging:** Fixed `Logger` not creating log files in the user directory (`~/.bridge_research/logs`) due to incorrect path expansion on Windows.
- **Search:** Added validation for `limit` parameter in both Frontend and Backend.

---

## [0.1.0] - 2026-01-18

### 🚀 Initial Release (Migration Phase)
This is the first desktop release of Bridge Research, migrating from the legacy web-based ArXiv Reader to a high-performance Hybrid Architecture.

### ✨ Added
- **Hybrid Architecture:** Integrated Tauri v2 (Rust) with a Python FastAPI Sidecar for robust backend processing.
- **Python Sidecar:**
    - Replaced client-side XML parsing with a dedicated Python `ArxivService`.
    - Implemented a "Deadman Switch" (Watchdog) to ensure the sidecar terminates when the main app closes.
- **New UI/UX:**
    - Completely rewritten Frontend using **React 19** and **Tailwind CSS**.
    - **Advanced Search:** Smart query builder (e.g., `all:LLM AND cat:cs.AI`) with Date Range and Topic filters.
    - **I18n:** Full support for English (EN) and Vietnamese (VI).
- **Native Features:**
    - **Link Opener:** Opens PDF and ArXiv links in the user's default system browser (Chrome/Edge) via `@tauri-apps/plugin-opener`.
    - **Smart Abstract:** Automatically detects and highlights GitHub/HuggingFace links in paper abstracts.

### 🛠 Changed
- **Networking:** Removed dependency on `codetabs` proxy. The Python backend now communicates directly with ArXiv API.
- **State Management:** Migrated to **Zustand** (Global Store) and **TanStack Query** (Server State).
- **API Structure:** Organized Backend endpoints under `/api/v1`.

### 🔧 Fixed
- Fixed issue where ArXiv API queries were incorrectly encoded (handled `+` vs `space` correctly).
- Fixed "Zombie process" issue on Windows.
- Fixed Uvicorn reload error when running in frozen/compiled mode (`.exe`).