# Đọc tài liệu trước khi triển khai tính năng hoặc API

Quy trình dùng chung cho `savico-implement-feature` và `savico-integrate-api`. Đường dẫn bên dưới tính từ gốc `savico-ai/`, không tính từ thư mục skill hay working directory của terminal.

## Xác định nguồn

- Frontend đang phát triển: `savico-ai/`.
- Backend: `../bmt-be/`; đọc hướng dẫn của backend trước khi khảo sát hoặc sửa phần tương ứng. Việc đọc code backend không đồng nghĩa được giao sửa backend.
- Nghiệp vụ và thiết kế: `../bmt-documentation/`. Đọc hướng dẫn áp dụng tại đó. Không lấy tài liệu cũ trong backend, code mock hoặc ví dụ trong `templates/` làm yêu cầu đã xác nhận.
- Giao diện: `docs/MO_TA_GIAO_DIEN.md` và `docs/TRANG_THAI_DUNG_KHUNG.md`. Tài liệu UI không thay thế hợp đồng API, và API hiện tại không tự cho phép xoá UI.

## Tìm và đọc đầy đủ

1. Dùng `rg --files ../bmt-documentation` để lập danh sách. Tìm theo mã, tên tính năng, route hoặc từ nghiệp vụ bằng `rg -n`, loại `templates/` khỏi kết quả nghiệp vụ. Không đoán mã domain từ tên thư mục frontend vì một màn hình có thể dùng nhiều domain.
2. Đọc User Story trong `userstory/`, Business Rule trong `businessrule/`, TDD trong `tdd/`, đặc tả trong `unittest/` và `systemtest/` liên quan. Xem thêm `database/`, `discovery/`, `debt/` khi được dẫn tới; không coi ghi chú nháp là quyết định đã duyệt.
3. Với yêu cầu triển khai tính năng, đọc hết các TDD thuộc tính năng trước khi viết code. Ví dụ tính năng PAY cần đọc toàn bộ `tdd/TDD-PAY-*.md`. Không đọc một TDD rồi code ngay trước khi đọc phần còn lại. Với sửa API hẹp, xác định các TDD chi phối endpoint và các bên gọi bị tác động.
4. Tìm tham chiếu trong toàn bộ nội dung: References, Rules, Dependencies, Flow, AC, Trace to, TEST_LINKS, mã tài liệu, Markdown link và wiki-link. Mở và đọc nguồn, không dùng đoạn kết quả tìm kiếm thay cho toàn văn. Nếu output bị cắt, đọc tiếp phần còn thiếu.
5. Đi theo tham chiếu đệ quy và tìm cả tham chiếu ngược tới mã đang làm. Theo dõi file/mã đã đọc để tránh vòng lặp; kiểm tra từng section/AC được trỏ tới. Với `DOC-KEY/section: ghi chú`, tìm mã và section thật, không suy ra chỉ từ tên file. Liên kết tương đối tính từ file nguồn. Đọc phần được dẫn tới của domain khác để hiểu ràng buộc, không tự mở rộng phạm vi triển khai.
6. Ghi ngắn nguồn đã đọc và ánh xạ `Story/AC → BR → TDD/API → UT/ST → phần code cần sửa`. Trước khi sửa code, báo contract, quyền, trạng thái, phần dùng chung và điểm thiếu/mâu thuẫn. Tham chiếu mới phát hiện trong lúc làm phải được đọc trước khi tiếp tục phần phụ thuộc.

## Khi thiếu hoặc mâu thuẫn

- Nêu chính xác file/mã/section thiếu, tài liệu trùng mã, nguồn không truy cập được hoặc điểm tài liệu khác code/API. Không tự đặt endpoint, DTO, enum, mã lỗi, hạn mức hay quyền.
- Yêu cầu rõ ràng mới nhất của người dùng được ưu tiên. Nếu chưa có quyết định cho mâu thuẫn nghiệp vụ, hỏi đúng điểm ảnh hưởng đến hành vi; chỉ tạm dừng phần phụ thuộc và tiếp tục phần độc lập.
- Code backend cho biết implementation hiện tại; OpenAPI của môi trường đích cho biết contract được công bố. Hai nguồn có thể khác phiên bản. Xác minh trước khi kết luận endpoint đã triển khai hoặc đã được kiểm thử.
- Không tự tạo tài liệu để che tham chiếu lỗi. Khi được giao sửa tài liệu, đọc template tương ứng và giữ mã, cấu trúc, tham chiếu; không tự điền phê duyệt hay kết quả kiểm thử chưa chạy.
