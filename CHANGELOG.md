# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-23

### 🚀 Release Note: "The Intelligence Orchestrator Update"
This major release evolves Bridge Research into a professional AI Research Intelligence platform. It introduces the **Trend Radar Engine** for large-scale analysis, a sophisticated **Agentic Workflow** for deep reporting, and a modernized **Lazy-Bootstrapping** architecture for superior desktop performance.

### ✨ Added
- **📈 Trend Radar Dashboard:**
    - **Bulk Acquisition:** Fetch and analyze up to 500 papers simultaneously with flexible filters.
    - **Interactive Radar Chart:** Multi-axis visualization of research domains with clickable axes.
    - **Traceability System:** Direct mapping from trends to source papers via the new `ReferencePanel`.
    - **Hot Techniques Cloud:** Real-time extraction and frequency tracking of emerging technical keywords.
- **🤖 Agentic Synthesis Engine:**
    - **Planner-Worker Architecture:** Implemented a `dspy.Module` based Agent that dynamically plans report structures.
    - **Multi-stage Generation:** Overcomes SLM limits by generating long-form reports (1500+ words) section-by-section.
    - **Contextual Memory:** Sequential writing logic that prevents repetition and ensures report coherence.
- **⚙️ Specialized AI Routing:**
    - **Task-Specific Models:** Assign different providers/models to `CHAT`, `SUMMARY`, `TREND`, and `CODE` tasks.
    - **Dynamic Concurrency:** Per-provider `concurrency_limit` configuration with `asyncio.Semaphore` throttling.
    - **LM Pool Management:** Automated lifecycle and caching of multiple active Language Model instances.
- **📡 Real-time Observability:**
    - **SSE Progress Streaming:** Replaced Polling with Server-Sent Events for smooth, real-time progress tracking (1% to 100%).
    - **Integrated Logging:** Python sidecar logs are now streamed directly to the Frontend Developer Console.

### 🛠 Changed
- **Backend Modernization:**
    - **Fully Async API:** Converted all endpoints to `async def` for high-concurrency performance.
    - **Thread-safe Inference:** Moved blocking DSPy/LLM calls to background threads using `asyncio.to_thread`.
    - **Robust Parsing:** Integrated `json_repair` and `BestOfN` (N=5) to handle unstable outputs from small models.
- **Startup & UX:**
    - **Lazy Bootstrapping:** UI renders immediately while the Sidecar initializes in the background after a 2s delay.
    - **Startup Overlay:** Professional splash screen with animated branding and real-time handshake status.
    - **ArXiv Stability:** Implemented Global Throttling (3.5s delay) and Browser Identity Spoofing to eliminate 429 errors.

### 🔧 Fixed
- **Scroll Restoration:** Resolved critical CSS conflicts and Overlay Z-index issues that blocked application scrolling.
- **Contrast & Theme:** Fixed "Black-on-Black" text issues in AI Reports and Settings Modal for a perfect Dark Mode experience.
- **Smart Watchdog:** Updated shutdown logic to track active background tasks, preventing premature sidecar termination during AI inference.
- **Data Integrity:** Fixed inconsistencies between trend counts and reference lists using unique ID tracking.

---

## [0.2.0] - 2026-01-25

### 🚀 Release Note: "The Deep Read Update"
This major update transforms Bridge Research from a search tool into a **Personal Research Assistant**. It introduces a Local Library, secure AI configuration, and a powerful **Reasoning-based RAG engine** that allows users to chat deeply with full PDF contents without needing heavy vector databases.

### ✨ Added
- **📚 Local Library & Persistence:**
    - **Save Papers:** Users can now save papers to a local SQLite database.
    - **Library View:** A dedicated tab to manage saved papers with "Read/Unread" status.
    - **Auto-Save:** Automatically saves paper metadata and PDF when starting an analysis.
- **🤖 Deep Analysis & Chat (RAG):**
    - **Vectorless Reasoning RAG:** Implemented a novel 2-step reasoning engine (Selector -> Reader) using **DSPy**, eliminating the need for heavy Vector DBs or Embedding models.
    - **Smart PDF Parsing:** Uses `pymupdf4llm` combined with a custom Heuristic Parser to reconstruct the **Table of Contents (ToC)** tree from raw PDFs.
    - **Structure Viewer:** Visual ToC sidebar in Chat Modal allows users to see the paper's layout and content previews.
    - **Context-Aware Chat:** AI understands conversation history and resolves references (e.g., "explain *that* table").
    - **Rich Markdown Support:** Chat interface now renders **Tables** (GFM) and **LaTeX Formulas** (KaTeX) beautifully.
- **⚙️ AI Configuration:**
    - **Secure Storage:** API Keys are now stored in the **OS Keyring** (Windows Credential Manager / MacOS Keychain), not in the database.
    - **Multi-Provider Support:** Native support for **Google Gemini**, **OpenRouter**, **OpenAI**, and **Ollama** (via OpenAI-compatible mode).
    - **Dynamic Switch:** Instantly switch between models without restarting the app.

### 🛠 Changed
- **Backend Architecture:**
    - Refactored into a Clean Architecture: `API (Router) -> Service -> Repository -> Database`.
    - Standardized Dependency Injection via `src/api/deps.py`.
    - **Services:** Split logic into `LocalPaperService` (Library), `PaperContentService` (PDF/Parsing), and `PaperChatService` (RAG).
- **Frontend Logic:**
    - **Client-side Search:** Instant filtering for Local Library data.
    - **Smart Hooks:** Introduced `useAnalyzeWithSave` to handle the complex flow of "Check -> Save -> Download -> Analyze".
    - **UI Polish:** Prevented elastic overscroll, improved Dark Mode contrast for buttons, and added Skeleton Loaders for smoother UX.

### 🔧 Fixed
- **Ollama Integration:** Fixed connection issues by standardizing Ollama requests to use the `/v1` (OpenAI-compatible) endpoint.
- **Timezone Mismatch:** Fixed date discrepancies between ArXiv Search (UTC) and Local Library by enforcing UTC serialization.
- **Cache Invalidation:** Fixed bugs where UI showed stale data (ToC/History) after deleting a paper by properly removing React Query cache keys.
- **PDF Parsing:** Improved Regex logic to correctly detect bold numbered headers (e.g., `**1. Introduction**`) and ignore table contents.

---

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
    - Integrated `uv` for lightning-fast Python dependency management.
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