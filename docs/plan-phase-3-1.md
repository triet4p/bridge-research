Chào bạn, đây là bản kế hoạch triển khai chi tiết cho hai tính năng: **Specialized LM Routing** (Hệ thống điều hướng Model chuyên biệt) và **Trend Radar** (Radar xu hướng công nghệ). 

Chúng ta sẽ triển khai theo lộ trình 3 giai đoạn để đảm bảo tính ổn định của hệ thống hiện tại.

---

### Giai đoạn 1: Nâng cấp hạ tầng Model Routing (The Foundation)
Giai đoạn này nhằm cho phép App sử dụng model khác nhau cho các task khác nhau.

#### 1.1. Cấu trúc dữ liệu (Database & DTO)
*   **Update `LMSetting` Model:** Thêm trường `task_routing_json` (kiểu JSON string) lưu trữ map giữa `task_id` và `{provider, model}`.
*   **Các Task IDs định nghĩa sẵn:** 
    *   `default`: Model mặc định.
    *   `summary`: Dùng cho tóm tắt nhanh abstract.
    *   `chat`: Dùng cho RAG chat chuyên sâu.
    *   `trend`: Dùng cho phân tích Trend Radar (cần model nhanh/rẻ).
    *   `code`: Dùng cho phân tích Github (sau này).

#### 1.2. Logic Backend (`LMSettingService`)
*   **Instance Pool:** Thay vì một biến `_ACTIVE_LM` duy nhất, ta sẽ dùng một `Dict[str, dspy.LM]` để cache các instance model theo task.
*   **Routing Logic:** 
    *   Khi một Service yêu cầu LM, nó sẽ gọi `get_lm_for_task(task_name)`.
    *   Hệ thống kiểm tra config riêng cho task đó -> Nếu không có -> Dùng config `default` -> Nếu không có -> Báo lỗi.

#### 1.3. UI Settings
*   Thiết kế lại Modal Settings: Thêm tab "Task Routing" cho phép người dùng gán Model cho từng mục đích.

---

### Giai đoạn 2: Phát triển Trend Radar Engine (Backend)
Giai đoạn này tập trung vào việc xử lý dữ liệu lớn từ ArXiv.

#### 2.1. Data Acquisition (ArXiv Bulk Fetch)
*   Xây dựng hàm `fetch_bulk_papers`: Cho phép fetch số lượng lớn (ví dụ 100-200 bài) trong một khoảng thời gian nhất định.
*   **Kỹ thuật:** Sử dụng `asyncio` để fetch song song các trang kết quả từ ArXiv API (vì ArXiv giới hạn mỗi request tối đa 100 kết quả).

#### 2.2. Micro-Tagging Pipeline (The "Map" Phase)
*   **DSPy Signature (`PaperTagger`):** Trích xuất `primary_domain`, `key_methods`, `problem_addressed` từ abstract.
*   **Concurrency:** Sử dụng `asyncio.gather` với giới hạn số lượng request đồng thời (Semaphore) để tránh bị rate limit từ Provider (Gemini/OpenRouter).
*   **Optimization:** Chỉ gửi 1000 ký tự đầu của abstract để tiết kiệm token mà vẫn đủ ngữ cảnh để tag.

#### 2.3. Trend Synthesis (The "Reduce" Phase)
*   **Logic xử lý Python:** 
    *   Thống kê tần suất các Domain (NLP, CV, Multi-modal...).
    *   Gom nhóm các bài báo có chung `Key Methods`.
*   **AI Synthesis:** Gửi bảng thống kê số liệu cho Model chuyên biệt (`task='trend'`) để viết một bản tóm tắt xu hướng (Markdown).

#### 2.4. Persistence (`TrendAnalysis` Table)
*   Lưu kết quả phân tích vào DB để người dùng xem lại mà không cần chạy lại (tốn phí).

---

### Giai đoạn 3: Trực quan hóa Trend Radar (Frontend)
Giai đoạn này làm cho dữ liệu trở nên dễ hiểu.

#### 3.1. Visualization Components
*   **Radar Chart:** Sử dụng thư viện `Recharts`. Các trục (Axes) sẽ là các Domain chính (ví dụ: LLM Efficiency, Vision-Language, Robotics...).
*   **Topic Cloud:** Hiển thị các từ khóa (Key methods) nổi bật.
*   **Trend Report View:** Hiển thị bài viết phân tích từ AI kèm danh sách các bài báo tiêu biểu cho từng xu hướng.

#### 3.2. User Experience (UX)
*   **Trend Dashboard:** Một View mới hoàn toàn bên cạnh Search và Library.
*   **Cost & Time Warning:** Trước khi bắt đầu, hiển thị thông báo: "Hệ thống sẽ phân tích 150 bài báo. Ước tính: 40k tokens (~0.01$) và 45 giây. Bạn có muốn tiếp tục?"

---

### Tóm tắt luồng xử lý dữ liệu (Data Flow)

1.  **User** chọn "Analyze Last 7 Days" trên UI.
2.  **React** gọi API `/papers/trends/generate?days=7`.
3.  **FastAPI** nhận lệnh -> **ArXivService** fetch 200 bài báo mới nhất.
4.  **LMSettingService** cung cấp model `gemini-1.5-flash` (đã được routing cho task `trend`).
5.  **TrendService** chạy vòng lặp `async` gọi LLM để tag 200 bài báo.
6.  **TrendService** tổng hợp số liệu -> Gọi LLM viết report.
7.  **FastAPI** trả về JSON (Thống kê + Report + List bài báo).
8.  **React** render Radar Chart và Markdown Report.

---

### Tài liệu tham khảo cho việc triển khai:
1.  **DSPy Concurrency:** Sử dụng `dspy.async` (nếu có) hoặc bọc trong `run_in_executor` để không block FastAPI event loop.
2.  **Recharts Radar:** [Recharts Documentation](https://recharts.org/en-US/examples/SimpleRadarChart).
3.  **ArXiv API Pagination:** [ArXiv API User Manual](https://arxiv.org/help/api/user-manual#_paging_results).

**Bạn có đồng ý với bản kế hoạch này không?** Nếu có, tôi sẽ bắt đầu chuẩn bị các lệnh `<<vibe>>` và `<<implement>>` để chúng ta nâng cấp phần **LMSetting Routing** trước (vì nó là nền tảng cho mọi thứ sau này).