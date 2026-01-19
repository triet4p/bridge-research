### 📅 Master Plan Phase 2

Mục tiêu cốt lõi:
1.  **Memory:** Lưu bài báo quan tâm vào Database cục bộ (SQLite).
2.  **Intelligence:** Tích hợp LLM (Gemini/Ollama) để đọc hiểu, tóm tắt và chat với bài báo.
3.  **Data Pipeline:** Tải PDF -> Parse Text -> RAG (Retrieval-Augmented Generation).

---

### 📦 Sprint 1: Local Database & Persistence (Khoảng 2-3 ngày)
Hiện tại ta chỉ search xong để đó. Giờ cần chức năng "Lưu lại" để đọc sau.

1.  **Backend (Python):**
    *   Hoàn thiện `src/services/paper_service.py`:
        *   `save_paper(paper: Paper)`: Lưu vào SQLite.
        *   `get_saved_papers()`: Lấy danh sách đã lưu.
        *   `delete_paper(id)`: Xóa.
        *   `update_status(id, status)`: Đánh dấu đã đọc/đang đọc.
    *   API Endpoints tương ứng trong `api/v1/endpoints/papers.py`.

2.  **Frontend (React):**
    *   Sửa `PaperCard`: Nút "Chat & Analyze" sẽ tự động lưu paper vào DB nếu chưa lưu.
    *   Thêm Tab "Saved Papers" (hoặc "Library") trên Header để xem lại các bài đã lưu.
    *   Cập nhật Store để sync trạng thái `is_downloaded` giữa Search và Library.

---

### 🧠 Sprint 2: AI Foundation & Settings (Khoảng 2 ngày)
Xây dựng não bộ để kết nối với các mô hình ngôn ngữ.

1.  **Settings UI:**
    *   Tạo màn hình cài đặt API Key (Gemini, OpenRouter) hoặc URL (Ollama).
    *   Lưu cấu hình này vào `config.json` (hoặc SQLite) ở local user.

2.  **Backend AI Service (DSPy Integration):**
    *   Cài đặt `dspy-ai` và cấu hình LM (Language Model).
    *   Tạo `src/services/ai_service.py`.
    *   Implement tính năng đơn giản nhất: **"Generate Summary"** (Tóm tắt nhanh dựa trên Abstract).

---

### 📚 Sprint 3: RAG Pipeline (Chat with PDF) (Khoảng 3-4 ngày)
Đây là tính năng "Killer Feature": Chat với toàn bộ nội dung PDF chứ không chỉ Abstract.

1.  **PDF Pipeline:**
    *   Backend: Hàm tải PDF từ URL về thư mục `AppData/papers/`.
    *   Backend: Dùng thư viện (như `pymupdf` hoặc `marker`) để convert PDF sang Markdown text.

2.  **Vector Store (RAG):**
    *   Setup **ChromaDB** (bản embedded nhẹ) trong Python Sidecar.
    *   Khi user bấm "Deep Analyze":
        1.  Tải PDF.
        2.  Chunking text.
        3.  Embedding & Save vào ChromaDB.

3.  **Chat Logic:**
    *   API `POST /chat`: Nhận câu hỏi -> Query ChromaDB -> Gửi context + câu hỏi cho LLM (Gemini/Ollama) -> Trả lời.

---