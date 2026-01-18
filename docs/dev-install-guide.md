# 🛠️ Developer Installation Guide

This guide covers the setup process for the **Bridge Research** application, a hybrid desktop app built with **Tauri v2 (Rust)**, **React 19**, and a **Python FastAPI Sidecar**.

## Prerequisites

Ensure you have the following installed on your machine:

1.  **Node.js (v18+) & npm**: [Download](https://nodejs.org/)
2.  **Rust & Cargo** (Required for Tauri):
    *   Windows: Install via [Rustup](https://rustup.rs/) (Ensure C++ Build Tools are installed).
    *   Mac/Linux: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3.  **Python (v3.11+)**: [Download](https://www.python.org/)
4.  **UV (Python Package Manager)**:
    *   We use `uv` for ultra-fast dependency management.
    *   Install: `pip install uv`

---

## 🚀 Quick Start (Windows)

We provide automated scripts to make your life easier.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/bridge-research.git
cd bridge-research
```

### 2. Install Dependencies

**Frontend & Core (Node/Rust):**
```bash
npm install
```

**Backend (Python):**
```bash
cd python-sidecar
uv sync
cd ..
```

### 3. Running in Development Mode

To start the app with Hot Module Replacement (HMR) for both React and Python:

```bash
# Run this from the root directory
.\scripts\run-dev.bat
```

*   **Note:** If you modify Python code, use the flag `--rebuild-sidecar` to rebuild the binary:
    ```bash
    .\scripts\run-dev.bat --rebuild-sidecar
    ```

---

## 🏗️ Building for Production

To create the installer (`Setup.exe`) and portable binary:

```bash
.\scripts\build-prod.bat
```

Artifacts will be generated in:
*   **Installer:** `src-tauri/target/release/bundle/nsis/`
*   **Portable:** `src-tauri/target/release/`

---

## 🧩 Project Structure

*   **`src/`**: React Frontend (UI).
*   **`src-tauri/`**: Rust Core (OS interactions, Window management).
*   **`python-sidecar/`**: Python Backend (AI Logic, Database, ArXiv API).
*   **`scripts/`**: Automation scripts for dev and build.

## 🐛 Troubleshooting

*   **Port 14201 already in use:** The Python sidecar uses port 14201. Ensure no zombie processes are running.
*   **Tauri Build Error:** Try running `cd src-tauri && cargo clean` before building again.
