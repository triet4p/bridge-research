# Vectorless RAG Idea for ArXiv PDF

Đặc điểm của ArXiv PDF là khi dùng `pymupdf4llm` để convert, sẽ ra 1 định dạng markdown khá đẹp với các header `#, ##,..., 1, 2,` rất chuẩn (mặc dù nội dung trong 1 phần có thể có chút xáo trộn do ko đọc ảnh, layout sai 1 chút).

Tôi nhận thấy, kể cả chunking theo header và vector là rất phung phí. 

Tôi có ý tưởng về `Vectorless, no-chunking` dựa trên cách PageIndex làm.

1. Index tài liệu
Sau khi dùng pymupdf4llm để chuyển thành định dạng markdown, thực hiện tạo ToC(Table of content) cho tài liệu dựa vào cấu trúc markdown, ví dụ
```json
[
    {
        "title": "Heading 1",
        "text": "abcxyz", // Có thể bỏ qua nếu muốn ko lưu lặp lại nội dung các section con, hoặc summary (dùng các model summary text nhẹ như bart-cnn của facebook chả hạn)
        "level": 0, 
        "children": [
            {
                "title": "Subsection 1.1",
                "text": "Full text nếu ko có nội dung con",
                "level": 1,
            }
        ]
    }
]
```

2. Khi có query của người dùng (ngôn ngữ tự nhiên) tới LLM:
    - LLM suy luận, chuyển thành 1 dạng ngôn ngữ query có ý nghĩa là: Liệu các phần nào sẽ liên quan tới câu hỏi này (suy luận dựa trên trường text/summary tại các node), ví dụ có thể là:
      H1 & H3.2 & H4.5 & H4.6 
    - Ta viết 1 tool/function thực thi câu truy vấn trên vào ToC của tài liệu => ra các context cho LLM
    - Nhét các context vào LLM (vì thường nếu giới hạn số lá thì token ko nhiều, thậm chí hiệu quả hơn vector).

Ưu điểm: Giữ được tính suy luận toàn cục và liên kết giữa các phần. Context recall thường oke vì ta bảo lưu toàn bộ 1 subsection/section,... Ko bị phụ thuộc vào sự không chắc chắn của embedding.
