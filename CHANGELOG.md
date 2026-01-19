# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-19

### 🚀 Release Note
This patch release focuses on **Stability, UI Polish, and Production Readiness**. It resolves critical issues with the search logic, native link handling, and process management on Windows.

### ✨ Added
- **Branding:** Updated App Icon and Logo with a new "Bridge" design (Cybernetic style).
- **UI Improvements:**
    - Added **"Max Results"** input field in the header (validates 1-100).

### 🛠 Changed
- **API Structure:** Refactored Python backend to move all endpoints under `/api/v1` for better organization.
- **Process Management:** Replaced the fragile `stdin` monitoring with a robust **Heartbeat/Watchdog mechanism**. The Frontend now pings `/api/v1/health` every 10s; the Backend auto-terminates if no activity is detected for 30s.
- **Search Logic:** Improved ArXiv query builder. Single-word queries (e.g., "MatchTIR") are now treated as keywords (`all:`) instead of categories (`cat:`), fixing empty results.
- **Repo**: Remove `src_tauri/icons`.

### 🔧 Fixed
- **Native Links:** Fixed critical issue where PDF/ArXiv/GitHub buttons were unresponsive. Now uses `@tauri-apps/plugin-opener` (`openUrl`) to reliably launch the system default browser.
- **Text Formatting:** Fixed Regex bug in `Smart Abstract` where trailing punctuation (e.g., `github.com/repo.`) was incorrectly included in the URL.
- **Production Build:**
    - Fixed `Uvicorn` reload error when running in frozen/compiled mode (`.exe`).
    - Fixed `.env` file loading issue in the sidecar binary by correctly resolving `sys._MEIPASS`.
- **Theming:** Fixed Dark Mode toggle not working by configuring `darkMode: 'class'` in Tailwind.
- **UX:** Fixed logic preventing API calls when the search query was empty (now defaults to category fetch).
- **Terminology:** Renamed "View Summary" to "View Abstract" for accuracy.

---

## [0.1.0] - 2026-01-19

### 🚀 Initial Release (Migration Phase)
This is the first desktop release of Bridge Research, migrating from the legacy web-based ArXiv Reader to a high-performance Hybrid Architecture.

### ✨ Added
- **Hybrid Architecture:** Integrated Tauri v2 (Rust) with a Python FastAPI Sidecar for robust backend processing.
- **Python Sidecar:**
    - Replaced client-side XML parsing with a dedicated Python `ArxivService`.
    - Implemented a "Deadman Switch" (Watchdog) to ensure the sidecar terminates when the main app closes.
    - Integrated `uv` for lightning-fast Python dependency management.
- **New UI/UX:**
    - Completely rewritten Frontend using **React 19** and **Tailwind CSS**.
    - **Advanced Search:** Support for keyword search combined with Category filters (e.g., `all:LLM AND cat:cs.AI`).
    - **Date Filters:** Added date range picker for precise research.
    - **I18n:** Full support for English (EN) and Vietnamese (VI).
- **Native Features:**
    - **Link Opener:** Opens PDF and ArXiv links in the user's default system browser (Chrome/Edge) instead of inside the app.
    - **Smart Abstract:** Automatically detects and highlights GitHub/HuggingFace links in paper abstracts.

### 🛠 Changed
- **Networking:** Removed dependency on `codetabs` proxy. The Python backend now communicates directly with ArXiv API, resolving CORS issues permanently.
- **State Management:** Migrated from local component state to **Zustand** (Global Store) and **TanStack Query** (Server State).
- **Build System:** Introduced automated batch scripts (`run-dev.bat`, `build-prod.bat`) for seamless Windows development.

### 🔧 Fixed
- Fixed issue where ArXiv API queries were incorrectly encoded.
- Fixed "Zombie process" issue where the Python backend would persist after closing the app.