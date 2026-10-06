# Phân quyền route và section admin

Triển khai ngày 05/10/2026 theo STORY-RBAC-004 (AC-001, AC-002, AC-003, AC-005, AC-006, AC-007), TDD-RBAC-001..003 và BR-RBAC-001/005/006/009/010/011. Phạm vi xem công trình đối chiếu BR-SITE-003 và backend hiện tại. Thay đổi backend được người dùng đồng ý trong cùng tác vụ.

Frontend đợi kiểm tra phiên trước khi dựng trang riêng tư. Khách chưa đăng nhập được đưa về popup đăng nhập; đường dẫn và query được giữ lại. Tài khoản Customer dùng các trang thiết kế, tài khoản, checkout, giám sát và luồng nhà thầu sau landing. Staff dùng khu admin; truy cập nhầm loại tài khoản hiện thông báo từ chối với đường quay về. Các trang công khai và link chia sẻ vẫn giữ luồng hiện có.

`GET /api/v1/users/me` bổ sung:

| Trường        | Nguồn                           | Ý nghĩa                                                                                  |
| ------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `accountKind` | `User.AccountKind`              | Customer hoặc Staff, kể cả khi chưa được gán role.                                       |
| `roleCodes`   | Mã của role hệ thống đang giữ   | Nhận diện Admin bằng mã `admin`; không nhận diện bằng tên role tự tạo.                   |
| `permissions` | Claim `perm` của token hiện tại | Hợp quyền đã có hiệu lực, bỏ trùng. Không tính lại từ role trong DB khi đọc hồ sơ phiên. |

Frontend giữ cookie HttpOnly do backend cấp và marker không nhạy cảm `bmt.auth`; không đọc hoặc lưu token. Profile đã lưu trên thiết bị không được dùng để mở trang riêng tư trước khi `/users/me` hoàn tất. Nếu backend chưa có contract mới, trang riêng tư từ chối truy cập; không tự suy ra quyền hoặc dùng mock trong chế độ API thật.

Nguồn chính sách FE là `src/shared/auth/route-access.ts`; danh sách mã quyền là `permissions.ts`, đối chiếu `PermissionNames` của backend. Menu và `AdminRouteGuard` dùng cùng hàm kiểm tra. Trang thiếu quyền không dựng component dữ liệu, nhóm menu rỗng bị ẩn. `/admin` chọn mục đầu tiên được phép trong menu; không có mục nào thì báo thiếu quyền. Không xóa route hoặc màn hình.

| Section                                                      | Quyền cần có                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Đơn hàng, giao dịch, khách hàng                              | `commerce.read`                                                                         |
| Vai trò                                                      | `role.manage`                                                                           |
| Nhân viên                                                    | `user.manage`                                                                           |
| Phân công                                                    | `assignment.manage`                                                                     |
| Nhật ký quyền                                                | `audit.read`                                                                            |
| Công trình                                                   | `assignment.manage` hoặc `supervision.complete`; phạm vi tài nguyên do backend kiểm tra |
| Gói bán                                                      | `plan.manage`                                                                           |
| Kết nối thanh toán                                           | `payment.connection.manage`                                                             |
| Tư vấn và lịch hẹn                                           | `consultation.manage`                                                                   |
| Loại công trình, phong cách                                  | `estimate.catalog.manage`                                                               |
| Thư viện mẫu                                                 | `library.manage`                                                                        |
| Bài viết và danh mục bài viết                                | `news.manage`                                                                           |
| Video hướng dẫn                                              | `guide.manage`                                                                          |
| Lời mời báo giá                                              | `quotation-request.manage`                                                              |
| Nhà thầu, phạm vi thi công và các màn CMS cục bộ chưa có API | Role hệ thống Admin, giữ điều kiện hiện có                                              |

Role Admin vẫn cần permission đối với API phân quyền theo mã. Ở trang Nhân viên, tạo tài khoản cần cả `user.manage` và `role.manage`; tải danh sách role và gán/thu hồi role chỉ chạy khi có `role.manage`. Trong trang Phân công, chọn nhân viên cần thêm `user.manage` vì API danh sách nhân viên có điều kiện này; thiếu quyền thì giữ trường ở trạng thái vô hiệu hóa và giải thích lý do. Các nút thao tác vòng đời gói trong Đơn hàng cần riêng `package.cancel`, `supervision.complete` hoặc `supervision.unassign`. Có quyền đọc không tự cho phép ghi; backend tiếp tục kiểm tra phân công khi hoàn tất/mở lại gói.

Sau refresh token, frontend đọc lại `/users/me` trước khi mở lại trang riêng tư. Phiên cũng được kiểm tra khi quay lại cửa sổ và mỗi 60 giây lúc đang đăng nhập. Việc đổi quyền chỉ áp dụng sau khi token được cấp lại theo BR-RBAC-009; gọi `/users/me` không làm thay đổi thời điểm hiệu lực. Lỗi 401 không refresh được hoặc vẫn 401 sau retry sẽ xóa auth và cache truy vấn. 403 của một thao tác không đăng xuất người dùng.

Các lời gọi nền tới dự án, gói hiện tại và lịch sử mua của khách trên trang công khai cũng đợi phiên Customer hợp lệ; tài khoản Staff không gọi các API này.

Thay đổi giao diện gồm ẩn mục menu và nút không đủ quyền, trang từ chối truy cập có đường quay về, trang đích admin theo quyền và menu tài khoản nhân viên không dẫn vào màn riêng của khách hàng. Bản dịch có trong cả vi/en. Proxy hiện chuyển `/en` về `/vi` theo cấu hình sẵn có.

Kiểm tra chính sách FE: `pnpm test:auth`. Kiểm tra backend: `GetMeAuthorizationTests`, `GetMePhoneNumberTests`, `AccessClaimsBuilderTests`. Chạy các quality gate và build khi thay đổi route. Test dùng dữ liệu thử không thay thế nghiệm thu API đã triển khai; cần đưa contract backend mới lên môi trường đích trước khi phát hành frontend này. Không cần migration cho các trường mới.

Kết quả kiểm chứng ngày 05/10/2026:

| Kiểm tra                                                         | Kết quả                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Đạt. Build tải font Google khi được phép truy cập mạng.                                                                                                                                                                                                                                                                                          |
| `pnpm test:auth`                                                 | 21/21 ca đạt; đã thêm vào CI.                                                                                                                                                                                                                                                                                                                    |
| Backend, ba nhóm test nêu trên với `--no-restore`                | 12/12 ca đạt, gồm phân biệt role hệ thống và role tự tạo cùng tên.                                                                                                                                                                                                                                                                               |
| Trình duyệt, client API thật của FE nối máy chủ giả lập contract | Đạt: giữ query khi yêu cầu đăng nhập; đăng nhập tới mục được phép; Customer vào admin và Staff vào tài khoản khách bị từ chối; thiếu permission không gọi API section; Staff không role không bị coi là Customer; bắt đổi mật khẩu; refresh thành công và thất bại; quyền thay đổi sau refresh; cache Admin cũ không mở quyền trước `/users/me`. |
| Bố cục và thao tác                                               | Kiểm tra ở 1440 và 390 px; menu điện thoại, thông báo thiếu quyền và đường quay về bằng bàn phím. Không tràn ngang ở phần kiểm tra. Bản dịch mới có đủ vi/en; `/en` vẫn chuyển về `/vi` theo cấu hình hiện có.                                                                                                                                   |
| `pnpm knip`                                                      | Còn 4 file, 6 export và 2 type chưa dùng. Chạy trên bản HEAD trước thay đổi trả đúng cùng danh sách; không phát sinh mục mới từ tác vụ này.                                                                                                                                                                                                      |

Backend đã push lên `develop`, commit `d9ccab0aafb24da9e3431380188b452ae710d131`, và deploy thành công vào môi trường `dev` ngày 05/10/2026. [Pipeline triển khai](https://github.com/TaskCoper/bmt-be/actions/runs/37323930993) đã hoàn tất cả build và deploy. Kiểm tra sau deploy tại `https://bmt-api.vnzdna.com`: Swagger trả 200 và schema `GetMeBasic` có đủ `accountKind`, `roleCodes`, `permissions`; danh sách gói công khai trả 200; `/api/v1/users/me` không có phiên trả 401.

Frontend chưa deploy. Chưa nghiệm thu luồng phân quyền bằng phiên đăng nhập với backend đã triển khai. Đặc tả contract đã cập nhật trong `../bmt-documentation/tdd/TDD-RBAC-001.md`.
