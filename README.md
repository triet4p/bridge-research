# 🌉 Bridge Research App

> **From Paper to Practice.**  
> A professional AI Research Assistant that bridges the gap between academic theory and engineering reality.

![Banner](./assets/repo-banner.png)

## 📖 Introduction

In the lightning-fast world of AI and Data Science, keeping up with ArXiv is a full-time job. Reading abstracts isn't enough for engineers and CTOs who need to know:
*   "Is this actually implementable?"
*   "What are the hidden hardware costs?"
*   "Where is the source code?"

**Bridge Research App** is a high-performance desktop application designed to help you cut through the noise. It doesn't just find papers; it analyzes them, tracks global trends, and provides actionable intelligence for your next project.

---

## ✨ Key Features

### 🔍 Precision ArXiv Discovery
*   **Smart Search:** Find exactly what you need with advanced filters for specific AI domains, date ranges, and complex keyword queries.
*   **Instant Previews:** Skim through abstracts and metadata without ever leaving the app or opening a browser tab.

### 📚 Personal Research Library
*   **Local Persistence:** Save important papers to your own local database. Your research stays with you, offline and organized.
*   **Auto-Managed PDFs:** One-click downloads and automatic file organization. Never hunt through your 'Downloads' folder for a paper again.

### 🤖 Interactive "Talk-to-Paper" RAG
*   **Deep Reasoning Chat:** Don't just read—ask. Query specific sections, tables, or formulas. The AI understands the context of the entire PDF.
*   **Smart Document Navigation:** View a reconstructed Table of Contents and jump directly to the most relevant sections of any complex paper.
*   **Rich Mathematical Rendering:** Complex formulas and technical tables are rendered beautifully in high-fidelity Markdown and LaTeX.

### 📈 Real-time Trend Radar
*   **Bird's-eye View:** Analyze up to 500 papers at once to visualize which research domains are exploding and which are cooling down.
*   **Interactive Intelligence:** Click on any trend or technical keyword to instantly see the specific papers driving that movement.
*   **Technical Keyword Tracking:** Stay ahead of the curve by identifying emerging techniques (like LoRA, MoE, or RAG) before they become mainstream.

### 🧠 Agentic Intelligence Reporting
*   **Professional Synthesis:** Our AI Agent doesn't just summarize; it writes multi-page, structured intelligence reports complete with executive summaries and implementation roadmaps.
*   **Evidence-Based Insights:** Every claim in the report is backed by citations from the latest papers, providing a verifiable "Bridge" to implementation.

### ⚙️ Tailored AI Orchestration
*   **Task-Specific Routing:** Assign different AI models to different jobs. Use fast models for summaries and high-reasoning models for deep research.
*   **Privacy & Flexibility:** Support for both high-end cloud providers (Gemini, OpenAI, Claude) and fully local models (Ollama) to keep your data private.

---

## ⚡ User Experience & Performance

*   **Instant-On Interface:** Experience a zero-lag startup. The UI is ready for you to browse your library while the heavy AI engines warm up in the background.
*   **Professional Desktop Feel:** A sleek, dark-mode optimized interface with smooth animations and real-time progress tracking for long-running analysis tasks.
*   **Rock-Solid Stability:** Built-in protection against API rate limits and connection issues ensures your research workflow is never interrupted.

---

## 📥 Installation (Windows)

### For users
1.  Go to the **[Releases Page](https://github.com/triet4p/bridge-research/releases)**.
2.  Download the latest `Bridge Research_x.x.x_x64-setup.exe`.
3.  Run the installer. The app will be available in your **Start Menu**.

### For developers
See [Developer Start Guide](./docs/dev-install-guide.md)

---

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query, Recharts.
*   **Core:** Tauri v2 (Rust).
*   **Backend (Sidecar):** Python 3.11+, FastAPI, DSPy (Agentic Framework), SQLModel (SQLite).
*   **Build System:** NSIS, PyInstaller, UV.

---

## 🗺️ Roadmap

*   [x] **Phase 1:** Hybrid Architecture & ArXiv Integration.
*   [x] **Phase 2:** Local Library & Deep Document Chat (RAG).
*   [x] **Phase 3:** Trend Radar & Agentic Reporting Workflow.
*   [ ] **Phase 4:** Github Code Inspector (Tech-stack & License Analysis).
*   [ ] **Phase 5:** Feasibility Scorer (Implementation Difficulty & Hardware Estimator).

---

## 📄 License

This project is licensed under the **CC BY-NC 4.0** (Creative Commons Attribution-NonCommercial 4.0 International).  
See the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for the AI Community.*