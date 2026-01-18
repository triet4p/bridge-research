# Bridge Research Idea - Ý tưởng cho project Bridge Research App

## Về mặt business
- Hiện nay, có rất nhiều hệ thống hỗ trợ Research như:
    - [NotebookLM](https://notebooklm.google.com): Đọc các tài liệu pdf, index tốt và QA non-hallunciation.
    - Các LLM lớn như Gemini, ChatGPT đều có chức năng Deep Research.
- Bối cảnh: Với các công ty IT trong lĩnh vực data và AI, họ thường phải tìm hiểu các tài liệu nghiên cứu để hiểu rõ về các công nghệ và xu hướng hiện tại để xem có áp dụng được gì với công ty không. Nhưng, dù dùng các công cụ kể trên, ta chỉ biết được paper đó nói về cái gì, chưa tính tới các yếu tố như:
    - Độ phức tạp triển khai trong thực tế (chi phí, nhân lực, nỗ lực tái hiện code, tài nguyên).
    - Độ phù hợp với bài toán IT thực tế cần giải quyết.

Do đó, tôi nung nấu ý tưởng về 1 hệ thống làm cầu nối giữa các Research Paper, các bài đăng công nghệ trên Web, Social network với việc triển khai trong các bài toán của công ty.

### Scope
Những chức năng tôi muốn triển khai:
- Có thể tìm kiếm (không lưu trữ database) và hiển thị các tài liệu Research Paper, các bài đăng công nghệ trên Web, Social network (như ở [Legacy Arxiv AI Reader](./legacy-arxiv-ai-reader-llms.md)). Trích xuất được abstract để user có thể lướt nhanh qua, có các metadata cần thiết, link bài báo gốc (cái này khá giống hệ thống cũ.)

- Trend Radar (giống hệ thống cũ), phân tích, gom nhóm các bài báo/tin tức.

- Phát triển Search Engine phù hợp dựa trên các bài báo/tin tức đang hiển thị. Bản chất là filtering dựa trên title, tác giả, abstract, tags, và các metadata khác.

- Với mỗi bài báo paper, cần đọc/hiểu được bài báo full (dùng AI):
    - Giải quyết vấn đề gì?
    - Ý tưởng mới lạ gì?
    - Cách tiếp cận chi tiết của họ?
    - Có source code/implement không? 
    - Resource (compute,phần cứng,...) họ sử dụng.
    - Họ có những kết luận gì?
    - LICENSE của họ là thương mại hay phi thương mại (nếu có open-source datasets/implements).
    - Có các nghiên cứu liên quan nào không? Được nhắc tới trong bài báo
    
  Sau khi phân tích, có thể:
    - Lưu kết quả một cách có cấu trúc trong Database để sau người dùng có thể xem lại các mục đã phân tích về bài báo đó.
    - Có thể tự động tạo báo cáo định dạng markdown, LaTex -> xuất ra PDF.

- Người dùng có thể tích chọn nhiều bài báo để tạo báo cáo so sánh/research các bài báo, tin tức cùng 1 chủ đề. (Cái này khá liên quan tới chức năng trên). (Hệ thống legacy cũng có chức năng này nhưng đơn thuần dùng abstract, quá đơn giản).

- Chức năng phân tích mã nguồn từ các repo github thành:
    - Tech stack
    - Tutorials

  Cái này để xem ý tưởng là vậy nhưng coding thì sẽ thế nào?

- Chức năng khá quan trọng là user có thể trình bày bài toán của mình, hệ thống cần phải:
    - Đưa ra suggest các ý tưởng liên quan từ các bài báo (cái này có thể dựa vào abstract cũng như thông tin có cấu trúc). Ưu tiên kiểu candidate-rerank: Đầu tiên cứ recommend theo abstract/title, nhưng nhiều; sau đó dùng chức năng phân tích bài báo ra dữ liệu cấu trúc ở trên để phân tích độ tương đồng/nhìn nhận ý tưởng,...
    - Nếu người dùng chọn 1 paper và hỏi xem áp dụng được những gì, cần áp dụng các thông tin trích xuất được hoặc cả bài báo gốc để đưa ra kết luận.
    - Tra tin tức xem có ai đã từng áp dụng / xử lý các bài toán tương tự. Kinh nghiệm là gì.
    - Xem có ai đã từng áp dụng các công nghệ liên quan từ paper vào thực tế để lấy kinh nghiệm.
  
  NOTES: Hệ thống cần phải hiểu, suy 1 ra 2, tức là ko chỉ dựa vào những gì trong khi nó search paper/tin tức, mà từ những cái chủ để/câu từ đó mà nó tạo ra các suy luận về dạng bài toán, tìm kiếm cả cách tiếp cận trong quá khứ, search tiếp chả hạn.

- Hỗ trợ cả cloud model (Gemini, OpenRouter) và cả local model (Ollama) trong các chức năng cần AI như đọc/hiểu/phân tích tài liệu.

- Có chức năng xuất file dữ liệu để có thể import vào app ở các thiết bị khác. Tức là trạng thái của hệ thống có thể được lưu trữ dưới dạng file mang đi được.

- Có UI rõ ràng, tùy bạn phân tách sự khác nhau giữa paper/tin tức không,... Theme thân thiện, dễ thao tác và sử dụng.

- Ứng dụng desktop, chạy trên Windows (First, ưu tiên), MacOS, Linux.

- Các tính năng có thể ưu tiên sau:
    - Đọc blog của các tập đoàn lớn để xem xu thế công nghệ.
    - Với AI, có thể đọc hugging face xem model nào mới ra không? có khác biệt gì, có link paper không???
    - Code2Paper, Paper2Code (thực ra đã bao hàm trong các ý trên, có thể phát triển thêm).

### Out of scope.
- Không đăng nhập (ko quản lý user).
- Không tốn công xây dựng database tập trung.
- Không bắt chước/đi vào giải các bài toán như QA tài liệu (đã có ông khác làm cực tốt, mình không tranh làm gì), implement (mấy ông AI code quá kinh rồi, chỉ cần 1 phân tích/ý tưởng đủ tốt thôi), ... TÓm lại không cố gắng triển khai lại những gì đã quá tốt rồi.

## Về mặt công nghệ triển khai.
- Techstack của tôi: 
    - Python (mạnh), đã từng dùng các framework xây AI Agent như langchain, dspy,...
    - Rust: Biết chút, nhưng đang học nhanh để tối ưu xử lý
    - JS/TS: Ở mức đủ để coding.
    - AI: Hiểu về RAG/AI Agent, CV, NLP, ...
    - Data: Biết về Database, SQL, Cloud,...

- Chưa biết nên dùng ngôn ngữ/framework nào để triển khai ứng dụng tích hợp nhiều tính năng AI mà vẫn nhẹ nhàng, dễ dev, dễ test, production không bị khuếch đại tài nguyên (RAM/DIsk).