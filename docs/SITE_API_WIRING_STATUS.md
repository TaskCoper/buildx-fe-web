# Trạng thái nối API — site khách (BuildX ↔ BMT API)

Cập nhật: 27/09/2026, sau đợt BE thêm API gửi AI dự toán + thư viện mẫu. Đối chiếu Swagger `https://bmt-api.vnzdna.com/swagger` và spec `TaskCoper/bmt-documentation`.

**Bản deploy:** https://vnz-bmt-savico-abcxyz.vercel.app/vi — bản đồ route từng trang xem `docs/YEU_CAU_BACKEND.md`.

> **29/09/2026 — đối soát lại Swagger:** kết quả đầy đủ (bug đã sửa `cancelOrder`, các điểm cần BE xác nhận, endpoint có contract nhưng FE chưa nối) nằm ở **`docs/BE_API_GAPS.md` mục 7**.

Nguyên tắc: UI khách đã chốt, không sửa design; chỉ map dữ liệu API vào type UI. Chức năng nào API **chưa đáp ứng đủ** UI thì **không gọi API**, giữ dữ liệu mẫu, và ghi ở đây để báo BE.

## Đã nối API thật

| Khu                         | Chức năng                                                           | Endpoint                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng nhập                   | login, đăng ký, đăng xuất, khôi phục phiên, hồ sơ                   | `/users/login,register,logout,refresh_token,me`                                                                                                            |
| Đổi mật khẩu lần đầu        | bắt buộc đổi khi `mustChangePassword`                               | `/users/change_password`                                                                                                                                   |
| Tài khoản                   | cập nhật hồ sơ                                                      | `PUT /users/me`                                                                                                                                            |
| **Cẩm nang – Thư viện mẫu** | danh sách, bộ lọc, chi tiết, mở theo lượt, lịch sử, hạn mức tra cứu | `/design-templates`, `/design-templates/{id}/access-info`, `/open`, `/library-versions/{id}` + `/assets`, `/me/library-history`, `/me/design-subscription` |

## Chưa nối được — lý do và thứ BE cần bổ sung

### 1. Dự toán 3 bước (features/design) — cụm chính, gần đủ API

API đã có: tạo/lưu đầu vào (`POST /estimates`, `GET /estimates/{id}`, `/catalog`, `PUT /input`, `PATCH /name`), **gửi AI + poll** (`POST /estimates/{id}/generations`, `GET .../{operationId}`), và (thêm 27/09) **Bước 3**: kết quả (`GET /estimates/{id}/result`), xuất PDF/Excel (`/exports`), chia sẻ link/QR/revoke (`/shares`), gửi email (`/emails`), xem hồ sơ chia sẻ công khai (`/public/estimate-shares/{id}`). Vẫn **chưa nối** vì 3 điểm:

- **Không có `GET /estimates`** (danh sách dự toán của tôi) và **không có xóa** → màn "Dự án của tôi" (entry) không hiện được dự án thật; tạo bằng API thì không thấy trong danh sách (lệch dữ liệu).
- **Không có endpoint upload ảnh.** `inputImageUrl` chỉ nhận URL https → khách không upload được ảnh lô đất ở Bước 1.
- **Lệch mô hình đầu vào Bước 1:** UI có 1 ô phong cách, API tách 2 (`architectureStyleId` + `interiorStyleId`); loại công trình UI là danh sách cố định, API cần uuid từ catalog; mã tỉnh/phường khác kiểu; API bắt `areaM2` mà UI không có ô diện tích.
  → **BE cần:** `GET /estimates` (list) + xóa + endpoint upload ảnh. Có đủ 3 cái + chấp nhận đổi UI Bước 1 là nối được trọn luồng (Bước 2, 3 đã sẵn API).

### 2. Cẩm nang – Bài viết (news)

`/news/articles` + `/news/categories` có sẵn nhưng: **không có `slug`** (UI định tuyến bài theo slug); trả `contentHtml` thay cho nội dung có cấu trúc (UI dựng khối theo mục); danh mục dạng cây không khớp nhãn phẳng; thiếu bài nổi bật, gắn giai đoạn/chủ đề Cẩm nang, số phút đọc, tags. → Giữ mock. **BE cần:** slug + nội dung có cấu trúc (hoặc chấp nhận render HTML), trường nổi bật/giai đoạn/tags.

### 3. Bảng giá (features/plans)

`GET /plans` có, nhưng model gói của BE rất gọn (mã, tên, mô tả, giá tháng/năm, quyền lợi lượt) — **thiếu toàn bộ field trình bày thẻ**: tier, nhãn "phổ biến", ảnh, dòng đối tượng, nút CTA, quà tặng, quyền lợi nổi bật, danh sách quyền lợi phong phú. User chọn giữ thẻ đầy đủ và chờ BE thêm `presentation` (form admin đã gửi sẵn khối này). → Giữ mock cho tới khi BE thêm cột trình bày.

### 4. Thanh toán (features/checkout)

API là tạo đơn theo `planId` + `offerKey`, QR SePay tự xác nhận (`/payment-orders`). UI có mã giảm giá, nút "Tôi đã chuyển khoản", hóa đơn VAT, thông tin người mua — **API không có**. Thẻ gói ở checkout cũng đọc CMS. → Giữ mock. **BE cần:** mã giảm giá, hóa đơn (nếu còn dùng).

### 5. Tài khoản – Gói hiện tại & Lịch sử mua (features/account)

`/me/design-subscription` thiếu hạn mức tư vấn 1:1 mà UI hiển thị, và số lượt phải khớp Bước 1 (đang mock). `/payment-orders` thiếu mã hạng gói ổn định (tier), trạng thái hoàn tiền, hóa đơn để map sang lịch sử mua. → Giữ mock (chỉ "cập nhật hồ sơ" đã nối).

### 6. Tư vấn 1:1 (features/consultation)

Chỉ có `POST /consultation-requests`. UI cần: điểm đánh giá / số lượt đánh giá / ảnh công trình KTS, **lịch trống & khung giờ**, **"Lịch tư vấn của tôi"**, hủy lịch — API đều thiếu. `consultantId` UI là id CMS, không phải uuid `/architects`. → Giữ mock. **BE cần:** trường hiển thị KTS, lịch trống, `GET /me/consultation-requests`, hủy.

### 7. Giám sát thi công (features/supervision)

API có `/me/construction-sites` (CRUD) + `/me/supervision-grants` (+ gán vào công trình), nhưng UI giám sát theo **6 giai đoạn** (upload ảnh, bình luận, yêu cầu thay đổi) — API **không có giai đoạn/file/bình luận**; cũng chưa có màn quản lý "công trình của tôi" trong UI để nối phần CRUD. → Giữ mock. **BE cần:** API giai đoạn giám sát, file, bình luận, yêu cầu thay đổi.

### 8. Không có API liên quan (giữ mock hoàn toàn)

- **Hướng dẫn** (guide): chưa có endpoint.
- **Tìm nhà thầu** (contractors): chưa có endpoint.
- **Chatbot**: chưa có endpoint.
- **Đăng ký thiết bị push** (PUSH-001): chỉ dành mobile, không ảnh hưởng web.

## Cơ chế

Các module `features/<f>/api/<f>.api.ts` chạy mock làm nền, chỉ ghi đè bằng hàm đã nối API. Vì vậy tắt cờ mock (`NEXT_PUBLIC_USE_MOCK_API=false`) thì chức năng chưa nối vẫn chạy dữ liệu mẫu, không gọi vào endpoint không tồn tại. Chi tiết field-level của từng gap xem thêm `docs/BE_API_GAPS.md`.
