# Project Structure Blueprint
bridge-research-app/
├── 📂 .vscode/                 # Cấu hình debug/settings cho VSCode (quan trọng để debug đa ngôn ngữ)
├── 📂 bridge-ui/               # [Frontend] React 19 + Vite + Tailwind
│   ├── 📂 src/
│   │   ├── 📂 components/      # UI Components (PaperCard, ChatBubble...)
│   │   ├── 📂 features/        # Feature-based modules (DeepResearch, TrendRadar...)
│   │   ├── 📂 hooks/           # React Hooks (useSearch, useAgent...)
│   │   ├── 📂 stores/          # State Management (Zustand/Context)
│   │   └── 📂 services/        # API Client gọi xuống Rust/Python
│   ├── vite.config.ts
│   └── package.json
│
├── 📂 bridge-desktop/          # [Host] Tauri v2 (Rust Core) - Thay thế cho 'src-tauri'
│   ├── 📂 src/
│   │   ├── 📂 commands/        # Các hàm Rust expose cho Frontend gọi
│   │   ├── 📂 lifecycle/       # Quản lý vòng đời App, System Tray, Menu
│   │   └── main.rs             # Entry point của Rust
│   ├── tauri.conf.json         # Cấu hình chính của Tauri
│   └── Cargo.toml
│
├── 📂 bridge-ai-engine/        # [Brain] Python Agent (FastAPI + DSPy)
│   ├── 📂 core/                # Core logic (Config, Logger, Base Classes)
│   ├── 📂 agents/              # Các Agent cụ thể (ReaderAgent, SearchAgent, CoderAgent)
│   ├── 📂 knowledge/           # Xử lý dữ liệu (RAG, Vector Store, SQLite Models)
│   ├── 📂 api/                 # FastAPI Routes (giao tiếp với Rust/UI)
│   ├── main.py                 # Entry point khởi chạy Server
│   └── requirements.txt
│
├── 📂 bridge-storage/          # [Data] Nơi chứa DB, logs khi chạy dev (được gitignore)
│   └── local.bridge            # SQLite database file
│
├── 📂 scripts/                 # Scripts tự động hóa (Build, Dev, Sign)
│   ├── dev-start.sh            # Script chạy cả 3 môi trường cùng lúc
│   └── build-all.sh            # Script đóng gói Python -> Binary & Build App
│
├── package.json                # Root package (quản lý scripts chung)
└── README.md