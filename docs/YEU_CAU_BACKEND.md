# Yêu cầu Backend — phần Frontend (BuildX) cần để nối tiếp

Người gửi: đội Frontend. Cập nhật: 27/09/2026, đối chiếu Swagger `https://bmt-api.vnzdna.com/swagger`.

Tài liệu này liệt kê những phần **Frontend chưa nối được vào API** và cần Backend bổ sung/chỉnh. Đã sắp theo ưu tiên. Mỗi mục ghi rõ Frontend cần gì và đề xuất endpoint/field cụ thể.

Bối cảnh: Frontend đã nối xong Đăng nhập, Hồ sơ tài khoản, Gói hiện tại, Tư vấn 1:1 (gửi yêu cầu), và toàn bộ khu quản trị có API (Tin tức, KTS, Danh mục dự toán, Thư viện mẫu, Gói, Đơn, Giao dịch, RBAC).

**Cần trước nhất (P0):** ① endpoint upload/presign ảnh · ② `GET /estimates` (danh sách) + `DELETE /estimates/{id}` · ③ khối `presentation` cho gói (để trang Bảng giá + Checkout chạy được).

## Bản deploy để đối chiếu

**Link:** https://vnz-bmt-savico-abcxyz.vercel.app/vi (mặc định tiếng Việt; đổi `/vi` → `/en` cho tiếng Anh). Đăng nhập admin thử: cần tài khoản admin do BE cấp.

Route của từng phần (nối vào sau `…vercel.app`):

| Phần                                  | Route                                                                 | Mục trong tài liệu               |
| ------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| Trang chủ                             | `/vi`                                                                 | —                                |
| Thiết kế & Dự toán (3 bước)           | `/vi/design`                                                          | P0.2, và Bước 1/2/3              |
| Bảng giá                              | `/vi/plans` · giám sát `/vi/plans/supervision`                        | P0.3                             |
| Checkout                              | `/vi/checkout/confirm?plan=…` → `/checkout/{orderId}/payment`         | P0.3 (chỉ chờ plan presentation) |
| Tư vấn 1:1                            | `/vi/consult`                                                         | — (đã nối, không cần BE)         |
| Cẩm nang — bài viết                   | `/vi/handbook` · chi tiết `/vi/handbook/bai-viet/{id}`                | — (FE tự làm)                    |
| Cẩm nang — thư viện mẫu               | `/vi/handbook/mau` · chi tiết `/vi/handbook/mau/{id}` (cần đăng nhập) | — (FE tự nối)                    |
| Hướng dẫn                             | `/vi/guide`                                                           | P2.5                             |
| Tìm nhà thầu                          | `/vi/contractors`                                                     | P2.6                             |
| Tài khoản (Gói hiện tại, Lịch sử mua) | `/vi/account` · lịch sử tư vấn `/vi/account/consultations`            | P1.4                             |

---

## P0 — Chặn nhiều tính năng, ưu tiên cao nhất

### 1. Endpoint upload / presign ảnh

- **Vấn đề:** ảnh đầu vào là URL, và Backend chỉ chấp nhận URL thuộc `UploadedFileOption__AllowedHosts` (link ngoài trả `422`). Nhưng **không có endpoint để upload lên host đó**, và Frontend không biết host được phép là gì.
- **Ảnh hưởng (site):** khách **không upload được ảnh lô đất ở Bước 1** (dự toán) — hiện `inputImageUrl` chỉ nhận URL có sẵn.
- **Đề xuất:** thêm endpoint upload trực tiếp hoặc cấp presigned URL (ví dụ `POST /uploads` trả `{ uploadUrl, fileUrl }`), và/hoặc công bố danh sách host được phép.

### 2. Danh sách và xóa bản dự toán

- **Thiếu:** `GET /estimates` (danh sách bản dự toán của tôi, có phân trang) và `DELETE /estimates/{id}`.
- **Ảnh hưởng:** màn "Dự án của tôi" (điểm vào luồng thiết kế) không liệt kê được dự án thật; khách không xóa được. Hiện chỉ vào được từng bản qua tạo mới.
- **Đề xuất:** `GET /estimates?pageIndex=&pageSize=&keyword=` → danh sách tóm tắt (id, tên, trạng thái, ngày, ảnh cover nếu có); `DELETE /estimates/{id}`.

### 3. Trường trình bày của Gói (Plan presentation)

- **Thiếu:** model gói hiện chỉ có mã, tên, mô tả, giá tháng/năm, quyền lợi dạng lượt + bật/tắt. Thẻ gói ngoài web (đã chốt thiết kế) cần thêm: `tier` (hạng), `shortLabel`, `popular`, `fitLine` (đối tượng phù hợp), `imageUrl`, `ctaLabel`, danh sách **quyền lợi hiển thị tự do** (`benefitLines`: text + cờ nổi bật), và **quà tặng** (title, value, conditions, image...).
- **Ảnh hưởng:** trang Bảng giá không đọc được gói từ API (thiếu phần trình bày) → vẫn dùng dữ liệu tạm; kéo theo **Checkout chưa nối được** (không có `planId` thật). Frontend đã gửi sẵn khối `presentation` này trong payload tạo/sửa gói để dùng ngay khi Backend thêm cột.
- **Đề xuất:** thêm khối `presentation` (JSON hoặc các cột) vào `PlanRevision`, trả lại trong `GET /plans` để trang Bảng giá đọc gói từ API. Frontend đã gửi sẵn khối này ở payload tạo/sửa gói nên chỉ cần Backend lưu + trả lại.

---

## P1 — Mở khóa từng tính năng site khách

### 4. Tài khoản – Lịch sử mua

- **Thiếu:** map từ `/payment-orders` sang lịch sử: **hạng gói ổn định** (tier), trạng thái **hoàn tiền**, **hóa đơn**, và biết đơn nào đã kích hoạt gói hiện tại.
- **Đề xuất:** bổ sung các trường trên vào `PaymentOrderSummary`/detail, hoặc thống nhất UI chỉ hiện danh sách đơn phẳng.

---

## P2 — Chưa có API, cần làm mới (hiện chạy dữ liệu tạm)

Ba khu này chưa có endpoint nào; để vận hành 100% thì Backend cần thiết kế + làm API. Mô tả nhu cầu tối thiểu:

### 5. Hướng dẫn (guide)

- **Đọc công khai (khách không cần đăng nhập):**
  - `GET /guide/videos` → danh sách video hướng dẫn: `id`, `topic` (chủ đề), `title`, `description`, `thumbnailUrl`, `youtubeId`/`videoUrl`, `durationSeconds`, cờ `featured` (1 video nổi bật).
  - `GET /guide/articles` → bài hướng dẫn: `id`, `topic`, `title`, `excerpt`, `imageUrl`.
- Quản trị (thêm/sửa video, bài): nếu vận hành cần, thêm nhóm `admin/guide/*` (tương tự Tin tức).

### 6. Tìm nhà thầu (contractors) — hệ thống lớn

- **Danh bạ:** `GET /contractors` (lọc khu vực / chuyên môn, phân trang) + `GET /contractors/{id}` (hồ sơ: giới thiệu, công trình tiêu biểu, đánh giá, thông tin pháp lý đã xác minh).
- **Gửi nhu cầu (brief):** `POST /briefs` (khách nhập nhu cầu tìm nhà thầu) + `POST /briefs/from-design` (tạo brief từ một dự án thiết kế đã có) + `GET /me/briefs/{id}`.
- **Ghép nhà thầu:** trả danh sách nhà thầu phù hợp theo brief.
- **Lời mời báo giá:** khách gửi lời mời tới nhà thầu; theo dõi trạng thái (`GET /me/invitations`, cập nhật 4 nấc: mời → nhận → khảo sát → báo giá).
- **Lịch khảo sát:** đặt lịch khảo sát với nhà thầu.
- **Đánh giá:** `GET /contractors/{id}/reviews` + `POST` gửi đánh giá sau khi hợp tác.
- **Quản trị:** danh bạ nhà thầu, xác minh hồ sơ pháp lý, quy tắc đề xuất, lịch khảo sát (khu admin đã dựng sẵn giao diện theo spec, chờ API).

### 7. Chatbot / Trợ lý AI

- `POST /chatbot/messages` body `{ message, context }` → trả lời của AI. `context` là ngữ cảnh dự án (tên, khu vực, loại nhà, quy mô, gói, phong cách nội thất, đã có ảnh lô đất chưa) để AI trả lời sát dữ liệu. Cần tích hợp AI. Hạn mức hiển thị hiện tại là 10 tin/ngày — xác nhận có áp dụng không.

---

## Lỗi / điểm cần chỉnh (không phải tính năng mới)

1. **Đăng nhập sai email trả 500** `{"detail":"User does not exist"}` — nên trả **401** như sai mật khẩu, và **không để lộ** email có tồn tại hay không.
2. **Response lỗi không đồng nhất với Swagger:** Swagger mô tả `Result<T>` (`isSuccess/error/value`), nhưng lỗi xác thực/validate/500 thực tế trả **ProblemDetails** (`title/code/status/detail/messageCode/errors`). Frontend đã xử lý cả hai, nhưng nên thống nhất cho khớp tài liệu.
3. **Thông báo lỗi tiếng Anh** ("User does not exist") trong khi UI là tiếng Việt. Đề nghị trả **`messageCode` ổn định** cho mọi lỗi để Frontend dịch.
4. **Ảnh bị chặn theo host** trả `422` nhưng Frontend không biết host được phép → gắn với mục P0.1 (cần upload hoặc công bố host).
