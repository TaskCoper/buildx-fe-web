# Tích hợp Thiết kế & Dự toán — 03/10/2026

Luồng `/design` dùng REST API khi `NEXT_PUBLIC_USE_MOCK_API=false`. Đã hoàn thiện client và kiểm thử bằng phản hồi API giả lập trên bản production. Chưa nghiệm thu với tài khoản, AI, tệp xuất và dịch vụ email thật.

## Căn cứ

Đã đọc tài liệu trong `../bmt-documentation`: TDD-PROJ-001–005; STORY-PROJ-001–003; BR-PROJ-001–005, 007; các quy tắc hạn mức SUB và phân quyền RBAC liên quan; ST-PROJ-001, 015, 021, 033, 072, 073, 116, 117 và UT-PROJ-001, 015, 033. Đối chiếu màn hình với `MO_TA_GIAO_DIEN.md`, endpoint, DTO và handler trong `../bmt-be`.

OpenAPI tại `https://bmt-api.vnzdna.com/swagger/v1/swagger.json` trả HTTP 200 khi kiểm tra. Việc này xác nhận tài liệu endpoint đang truy cập được, chưa chứng minh các giao dịch nghiệp vụ hoạt động. Backend đang có hợp đồng kết quả `mock-v1`; cần nghiệm thu lại khi adapter AI thật sẵn sàng.

## Phần đã nối

- Danh sách dự toán có phân trang, đọc chi tiết, đổi tên, xoá theo kết quả từng mục và đọc hạn mức gói. Lỗi tải danh sách có thông báo thử lại.
- Tạo dự toán: tên tối đa 200 ký tự Unicode, mô tả tối đa 500; gửi nguyên mô tả; modal chỉ có tên và mô tả; địa chỉ nhập ở Bước 1. Giữ cùng khóa idempotency khi thử lại yêu cầu lỗi mạng/máy chủ.
- Nhập liệu: đọc danh mục ghim, địa chỉ và dữ liệu server; tự lưu nối tiếp bằng `expectedInputVersion`, `changedFields` và khóa idempotency. Đọc lại dữ liệu chuẩn hóa sau lưu, giữ phần người dùng sửa trong lúc chờ. Xung đột giữ bản đang nhập và chờ người dùng chủ động tải bản đã lưu. Không tự ghi đè.
- Chờ bản đồ hoàn tất trước khi lưu cặp địa chỉ và tọa độ. Có mạng lại chỉ tự thử lỗi mạng/máy chủ, không tự lặp lỗi dữ liệu.
- Gửi xử lý: giữ khóa khi yêu cầu chưa được xác nhận; lần gửi mới sau tác vụ đã được tiếp nhận dùng khóa mới. Lưu mã tác vụ trong phiên; F5 chỉ đọc trạng thái/kết quả, không gửi lại AI.
- Kết quả: kiểm tra cấu trúc ba nhóm chi phí, số tiền và tiền tệ VND; giữ tổng tiền server kể cả bằng 0. Dữ liệu sai hiện lỗi tải lại, không tự tạo số tiền thay thế hoặc gọi AI mới.
- Excel/PDF: gọi xuất tệp, chờ trạng thái và tải bằng HTTP có xác thực. Lỗi không chuyển sang tự sinh tệp mock. Client chia sẻ, QR và email dùng endpoint backend; email nhận trạng thái từ chối/bỏ qua là thất bại.

## Thay đổi giao diện

- Modal tạo dự toán: bỏ ô địa chỉ, bản đồ và hướng dẫn địa chỉ; mô tả thể hiện đúng mục đích gửi cùng đầu vào.
- Bước nhập liệu: có thông báo xung đột và thao tác tải lại bản server; lỗi danh mục/dữ liệu có thử lại.
- Bước chờ dự toán và hồ sơ: chế độ API dùng trạng thái chờ, ẩn phần trăm và số bản vẽ mô phỏng. Chế độ mock vẫn phục vụ xem thử.
- Danh sách và trang kết quả: lỗi đọc hiện thông báo thay vì danh sách rỗng hoặc dữ liệu mẫu. Không xoá màn hình hay trường nhập khác.

## Kiểm chứng

`pnpm typecheck`, `pnpm lint`, `pnpm format:check` và `pnpm build` đã đạt. Build cần mạng để tải Google Fonts; chạy lại ngoài sandbox đã thành công.

Kiểm tra hàm thuần đạt: tổng tiền 0, từ chối kết quả sai cấu trúc/tiền tệ/số tiền, giới hạn Unicode, giữ khoảng trắng mô tả, so sánh diện tích số lớn và khai báo cặp tọa độ khi đổi địa chỉ.

Kiểm thử trình duyệt trên localhost:3000, chặn request API bằng dữ liệu kiểm soát, đã đạt các tình huống:

- Tạo không địa chỉ; thử lại lỗi 503 giữ khóa và mô tả.
- Tự lưu, mất phản hồi sau khi server đã lưu, thử lại cùng khóa; xung đột không tự ghi đè; tải lại chủ động.
- Chọn loại công trình/phong cách có ảnh; lưu địa chỉ và cặp tọa độ cùng nhau.
- Gửi xử lý lỗi 503 rồi thử lại; chờ đến thành công; hiển thị tổng do server trả.
- F5 không phát sinh lệnh gửi AI mới; kết quả sai cấu trúc hiện lỗi và phục hồi bằng đọc lại.
- Excel lỗi không tạo tệp thay thế; lỗi danh sách không hiện trạng thái rỗng.
- Form ở chiều rộng 390 px không tràn ngang; không ghi nhận lỗi JavaScript của trang trong hành trình.

Script kiểm tra tạm: `/private/tmp/savico-estimate-contract.mjs` và `/private/tmp/savico-estimate-browser.mjs`. Đây là kiểm tra hợp đồng và giao diện bằng fixture, không thay thế toàn bộ đặc tả ST/UT hoặc bằng chứng dữ liệu backend.

## Phần cần nghiệm thu tiếp

Cần môi trường/tài khoản kiểm thử để xác nhận cookie và phân quyền thật, trừ/hoàn hạn mức, xử lý AI, tệp Excel/PDF thực tế, gửi email và link chia sẻ giữa các phiên. Chưa kiểm chứng đầu cuối các nhánh này. Hình xem trước hồ sơ và một số thông tin trình bày cũ còn phụ thuộc dữ liệu minh họa; không dùng chúng làm bằng chứng backend đã sinh bản vẽ.
