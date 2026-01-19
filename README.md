# 🌉 Bridge Research App

> **From Paper to Practice.**  
> A Research Assistant that bridges the gap between Academic Research and Engineering Implementation.

![Banner](./assets/repo-banner.png)

## 📖 Introduction

In the rapidly evolving landscape of AI and Data Science, staying updated with ArXiv papers is crucial. However, simply reading abstract is not enough. Engineers and CTOs need to know:
*   "Can I implement this?"
*   "Is there code available?"
*   "What is the computational cost?"

**Bridge Research App** helps you answer these questions. It is a desktop application designed to search, filter, analyze, and "bridge" the knowledge from papers to practical solutions.

## ✨ Key Features (v0.1.0)

*   **🔍 Advanced ArXiv Search:**
    *   Smart query builder (e.g., `all:LLM AND cat:cs.AI`).
    *   Filter by **Date Range** and **Topics** (AI, CV, NLP, etc.).
*   **⚡ Hybrid Performance:**
    *   Built with **Tauri v2** (Rust) for a lightweight footprint.
    *   Powered by a **Python FastAPI Sidecar** for robust data processing.
*   **🌐 Native Experience:**
    *   Opens PDFs and Links in your default browser (Chrome/Edge).
    *   Auto-detects GitHub/HuggingFace links in abstracts.
    *   Multi-language support (English / Vietnamese).
*   **🛡️ Local-First:**
    *   No login required.
    *   Data processing happens locally (Phase 1).

## 📥 Installation (For Users)

We offer two ways to use Bridge Research App on Windows:

### Option 1: Installer (Recommended)
1.  Go to the **[Releases Page](https://github.com/triet4p/bridge-research/releases)**.
2.  Download the latest `Bridge Research_x.x.x_x64-setup.exe`.
3.  Run the installer. The app will be available in your **Start Menu**.

### Option 2: Portable
1.  Go to the **[Releases Page](https://github.com/triet4p/bridge-research/releases)**.
2.  Download the zip file or executable (if available).
3.  *Note: For the best experience and auto-updates, please use the Installer.*

## 💻 Setup for Developers

If you want to contribute or build the app from source, please follow our detailed guide:

👉 **[Developer Installation Instructions](docs/dev-install-instruction.md)**

## 🛠️ Tech Stack

*   **Core:** Tauri v2 (Rust)
*   **Frontend:** React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query.
*   **Backend (Sidecar):** Python 3.11+, FastAPI, SQLModel (SQLite), UV (Package Manager).
*   **Build System:** NSIS (Windows Installer), PyInstaller.

## 🗺️ Roadmap

*   [x] **Phase 1 (v0.1.0):** Foundation, ArXiv Search, Hybrid Architecture.
*   [ ] **Phase 2:** Local Database (Save papers), Deep Analysis with LLMs (Gemini/Ollama).
*   [ ] **Phase 3:** Github Code Inspector & Feasibility Scoring.

## 📄 License

This project is licensed under the **CC BY-NC 4.0** (Creative Commons Attribution-NonCommercial 4.0 International).  
See the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for the AI Community.*