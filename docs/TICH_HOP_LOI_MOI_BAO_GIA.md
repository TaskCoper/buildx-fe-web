# Tích hợp lời mời báo giá

Frontend đã nối luồng khách gửi lời mời từ công trình đã lưu và màn quản trị `/admin/invitations` với REST API BMT. Chế độ API thật không dùng kho CMS localStorage để tạo lời mời hoặc cập nhật trạng thái.

## Nguồn và phạm vi

Đối chiếu STORY-RFQ-001–003, BR-RFQ-001–006, toàn bộ TDD-RFQ-001, các đặc tả ST/UT liên quan đến gửi, chống trùng, bản hồ sơ, quyền đọc, lịch và cập nhật trạng thái trong `../bmt-documentation/`. Contract được kiểm tra với API, DTO, validator, handler, snapshot builder và query của `../bmt-be/`, cùng OpenAPI môi trường đích ngày 04/10/2026.

RFQ mới được ưu tiên ở các điểm khác mô tả UI v1.1 cũ: giới hạn cấu hình thay cho số 3 cố định; một lời mời cho mỗi nhà thầu; bản đã gửi có ngân sách; người quản lý được chuyển trực tiếp giữa bốn trạng thái. Không tạo mã KS/INV minh họa, lịch rảnh giả hoặc lịch sử chuyển trạng thái suy đoán.

## Giữ giao diện mẫu S18

Trang `/contractors/[projectId]/invitations` giữ bố cục mẫu: liên kết quay lại ở trên, tiêu đề căn trái, ô đếm và nút mời thêm, thẻ nhà thầu với hàng thông tin và bốn chấm tiến trình; cột phải gồm ý nghĩa trạng thái, bản hồ sơ đã gửi và đội hỗ trợ. Nút xem hồ sơ mở panel xem nhanh; bản hồ sơ mở từ cột phải hoặc dòng phiên bản trên từng thẻ. Khi hoàn tất, thẻ vẫn có lối chọn quản lý thi công. Theo yêu cầu ngày 06/10/2026, sau khi gửi thành công hệ thống chuyển thẳng đến S18 cho cả API thật và mock; khi mời nhiều nhà thầu, chỉ chuyển sau nhà thầu cuối. Trang xác nhận S17 giữ giao diện hiện tại và vẫn truy cập được bằng URL cũ.

Giới hạn và lượt còn lại lấy từ server. Khối hồ sơ đọc snapshot của lời mời mới nhất; mỗi thẻ mở đúng snapshot của nó. Không lấy loại công trình, diện tích hoặc tệp từ hồ sơ gốc đã sửa. Contract khách chưa trả mã hiển thị INV, thời điểm cập nhật, lịch sử chuyển trạng thái hoặc phạm vi thi công. Giữ vị trí các trường bằng nhãn chưa có dữ liệu; không dùng UUID làm mã hiển thị và không dựng lịch sử từ trạng thái hiện tại. Chấm tô xanh thể hiện trạng thái hiện tại; chỉ nấc Đã gửi có mốc tạo được API trả về. Bản hồ sơ từ API có ngân sách nên khung ghi chú dùng nội dung về bản lưu bất biến, không hứa hồ sơ không chứa giá.

## API đã nối

Các đường dẫn dưới đây có tiền tố `/api/v1`; dùng Axios chung, cookie auth và lớp bóc `Result<T>` hiện có.

| Thao tác                                             | Endpoint                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Gửi một nhà thầu                                     | `POST /me/construction-sites/{siteId}/quotation-requests`                |
| Đọc danh sách, giới hạn và lượt còn lại              | `GET /me/construction-sites/{siteId}/quotation-requests`                 |
| Khách xem thông tin và bản đã gửi                    | `GET /me/quotation-requests/{requestId}`                                 |
| Đọc danh sách quản trị, lọc trạng thái và phân trang | `GET /admin/quotation-requests`                                          |
| Đọc chi tiết quản trị                                | `GET /admin/quotation-requests/{requestId}`                              |
| Sửa lịch, trạng thái, ghi chú nội bộ                 | `PATCH /admin/quotation-requests/{requestId}`                            |
| Tải tệp của bản đã gửi                               | `GET /quotation-requests/{requestId}/attachments/{attachmentId}/content` |

Body gửi gồm `contractorId`, `desiredAt`, `contactPhone`, `surveyNote`; header `Idempotency-Key` là UUID. Ngày giờ có offset `+07:00`. Email thông báo lấy từ tài khoản, không có trường email override. Số liên lạc tối đa 20 ký tự theo validator CONSULT, ghi chú tối đa 5000 ký tự. Không cập nhật điện thoại tài khoản khi sửa số cho lời mời.

## Hành vi

- ID hồ sơ cục bộ được tra sang `constructionSiteId` thật trước khi gọi API; hồ sơ chưa lưu không được gửi.
- Hồ sơ chưa có mã server hiện lời nhắc lưu hồ sơ, không hiện trạng thái tải vô hạn. Query lời mời theo cả mã công trình đã lưu; lưu hồ sơ xong sẽ lấy lại giới hạn thay vì giữ kết quả của bản nháp.
- Mỗi cặp hồ sơ–nhà thầu chỉ mời một lần ở mọi trạng thái. Lượt đã dùng không hoàn lại khi hoàn tất hoặc ẩn nhà thầu. Nhà thầu đang hiển thị nhưng tạm ngừng nhận dự án vẫn được mời.
- Giới hạn, số đã gửi và lượt còn lại lấy từ response server. Danh sách khách đọc tiếp các trang để không bỏ sót lời mời. Bảng so sánh giữ bố cục tối đa ba cột; khách có thể mời thêm các nhóm khác nếu hồ sơ còn lượt.
- Khi chọn nhiều nhà thầu, mỗi lần xác nhận gửi một lời mời rồi chuyển sang nhà thầu kế tiếp. Lời mời đã thành công vẫn tồn tại nếu lần sau lỗi hoặc khách dừng chọn lịch. Hàng đợi gắn với tài khoản và hồ sơ.
- Khi mất phản hồi hoặc lỗi 5xx, lưu body và khóa gửi trong sessionStorage theo tài khoản/hồ sơ/nhà thầu. Thử lại và F5 dùng đúng body, khóa cũ; form giữ nguyên trong lúc chưa rõ kết quả. Lỗi từ chối rõ ràng cho phép sửa thông tin và thử lại. Không tự retry POST với khóa mới.
- F5 màn xác nhận/theo dõi đọc API. Bốn trạng thái là `Sent`, `Received`, `ContractorReceived`, `Completed`; khách chỉ xem trạng thái hiện tại, lịch đề nghị và lịch hiện tại.
- Khách và người quản lý xem bản hồ sơ tại thời điểm gửi, gồm ngân sách, tầng/tum, phong cách, nguồn dự toán, bản đồ VietMap chỉ đọc và tệp riêng tư. Tệp tải qua lời mời, không qua URL tệp của hồ sơ gốc. Tiền và diện tích giữ chuỗi số, định dạng không mất độ chính xác.
- Admin lưu cả `status`, `appointmentAt`, `internalNote` và `expectedVersion`. Xung đột version khóa lưu cho tới khi người dùng tải lại. Không có thao tác khách sửa/hủy/xóa lời mời, hoặc thao tác quản trị hủy/từ chối ngoài bốn trạng thái.
- Quyền backend là `quotation-request.manage`; không suy ra từ quyền phân công hoặc quyền cấu hình. Khách không nhận ghi chú nội bộ. Lỗi đọc không biến thành danh sách rỗng hoặc hiện lại dữ liệu cũ.

## Kiểm chứng và giới hạn

Build production và các cổng kiểm tra TypeScript, ESLint, Prettier được chạy. Kịch bản trình duyệt `/private/tmp/savico-rfq-browser.mjs` dùng API giả lập ở chế độ frontend API thật để kiểm body/header, thử lại sau mất phản hồi/F5, gửi nhiều nhà thầu, giới hạn thay đổi, nhà thầu bị ẩn, bản hồ sơ/tệp, cập nhật admin, xung đột version, quyền riêng tư và màn hình nhỏ. SDK VietMap chạy thật với style thử; không kiểm chứng tile dịch vụ thật trong kịch bản này.

Kiểm tra khôi phục S18 ngày 04/10/2026: kịch bản trình duyệt `/private/tmp/savico-rfq-restored-browser.mjs` đạt với API giả lập, gồm bố cục máy tính, điện thoại 390px không tràn ngang, bốn chấm và trạng thái hiện tại, giới hạn/nút mời thêm từ server, bản hồ sơ bất biến, tải tệp riêng tư, panel nhà thầu, hộp thoại hỗ trợ mở bằng bàn phím, lịch đã điều chỉnh, nhà thầu bị ẩn, lỗi đọc và danh sách rỗng. Trang xác nhận S17 vẫn mở được bản đã gửi. Không gọi thao tác ghi trên backend thật. Bản tiếng Anh chưa kiểm tra trên trình duyệt vì proxy hiện chủ động chuyển `/en` về `/vi`; cả hai bộ chuỗi đã được cập nhật. Build, TypeScript, ESLint và Prettier đạt.

OpenAPI đích có các endpoint RFQ; yêu cầu GET không đăng nhập trả 401. Đây chỉ chứng minh contract công khai và yêu cầu xác thực, không chứng minh lưu dữ liệu hoặc email thành công. Chưa có phiên khách/admin thật để kiểm POST/PATCH trên môi trường đích; không gửi lời mời hoặc email thật để thử. Chưa chạy trọn bộ ST với PostgreSQL và SMTP thử.

UI chỉnh giới hạn toàn hệ thống chưa bổ sung trong lần này; frontend nhận giới hạn hiện hành từ danh sách lời mời của từng hồ sơ. API đánh giá nhà thầu chưa nối: giữ nút cùng thông báo chưa tích hợp, không ghi đánh giá giả trong chế độ thật. Phạm vi/mô tả nhu cầu trong SITE vẫn là dữ liệu cục bộ; chỉ nội dung khách nhập vào ghi chú khảo sát được gửi trong `surveyNote`. Luồng đăng ký triển khai và giám sát ngoài RFQ giữ mức tích hợp hiện có. Cổng quản trị frontend vẫn dùng AdminGuard hiện có (role admin); chưa mở rộng cổng này cho tài khoản nhân viên chỉ có permission RFQ. Chưa deploy.
