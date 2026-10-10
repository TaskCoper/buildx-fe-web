# Làm mới cache nội dung CMS

Next.js vẫn cache nội dung công khai trong 60 giây để giảm số lần gọi BE. Sau khi lưu hoặc khôi phục một khối trong admin, giao diện gọi `POST /api/cms/revalidate` để hết hạn cache của trang và ngôn ngữ vừa sửa. Lần mở hoặc tải lại trang tiếp theo lấy dữ liệu mới từ BE, không phải chờ chu kỳ 60 giây.

API nằm trên **Next.js**, vì cache cần xoá thuộc Next.js. API này không sửa hay xoá dữ liệu trong database.

## Request

```http
POST /api/cms/revalidate
Content-Type: application/json

{"pageKey":"home","locale":"vi"}
```

`pageKey`: `home`, `footer`, `contractors`, `handbook`, `plans`, `supervision` hoặc `all`. `locale`: `vi`, `en` hoặc `all`. Hai trường đều bắt buộc; không nhận đường dẫn, tag hay trường khác từ caller.

```json
{ "revalidated": true, "pageKey": "home", "locale": "vi", "tags": ["cms:home:vi"] }
```

`{"pageKey":"all","locale":"all"}` xoá cache cả sáu trang ở cả hai ngôn ngữ. Footer dùng tag riêng và làm mới layout của ngôn ngữ tương ứng, vì chân trang xuất hiện trên nhiều trang, kể cả trang pháp lý.

Trang CMS `supervision` dùng tag `cms:supervision:{locale}` và cập nhật đường dẫn `/{locale}/plans/supervision`, theo STORY-CMS-003. Không dùng đường dẫn `/{locale}/supervision`.

## Xác thực

- **Admin trong trình duyệt:** gửi cookie đăng nhập và `Origin` trùng origin của `NEXT_PUBLIC_APP_URL`. Next.js chuyển cookie tới `GET /api/v1/admin/pages/{pageKey}/sections` trên BE để kiểm phiên và quyền `news.manage`. Khi chọn `all`, dùng `home`/`vi` để kiểm cùng policy. Request kiểm quyền dùng `no-store` và timeout 5 giây.
- **BE hoặc công cụ vận hành:** cấu hình `CMS_REVALIDATION_SECRET` trên server Next.js và gửi `Authorization: Bearer <secret>`. Không đặt secret trong biến `NEXT_PUBLIC_*` hoặc mã trình duyệt. Khi chưa cấu hình secret, API từ chối mọi Bearer token.

BE đã nối webhook tự động cho thao tác lưu và xoá bản nội dung CMS. Handler ghi thông báo vào MassTransit Outbox cùng transaction; consumer gọi API này **sau khi commit**. Cấu hình `CLIENT_BASE_URL` của BE trỏ tới Next.js và cùng `CMS_REVALIDATION_SECRET` ở hai bên để bật. Admin vẫn gọi trực tiếp để làm mới frontend đang sử dụng. BE ở máy chủ bên ngoài không gọi được `localhost:3000` trên laptop. Khi triển khai thật, dùng URL public của Next.js.

Docker Compose truyền `BMT_API_ORIGIN` và `CMS_REVALIDATION_SECRET` vào container lúc chạy. `BMT_API_ORIGIN` còn được dùng lúc build để tạo rewrite `/api/v1`; khi đổi URL này phải build lại image để rewrite và lời gọi CMS từ server cùng trỏ đúng BE. Secret chỉ truyền lúc chạy, không đưa vào build args. Workflow deploy nhận GitHub Environment Secret `CMS_REVALIDATION_SECRET`; script `.docker/sync-env-secrets.sh` nhận biến cùng tên trong file môi trường của frontend.

Chỉ dùng hợp đồng `/api/cms/revalidate` và tag `cms:{pageKey}:{locale}`. Các tên `REVALIDATE_SECRET`, `FRONTEND_REVALIDATE_SECRET`, tag `page-sections:{pageKey}` và API `/api/revalidate` trong commit thử nghiệm không thuộc luồng này. Nếu môi trường từng cấu hình các tên đó, cần cấu hình lại `CMS_REVALIDATION_SECRET` cùng giá trị ở cả hai repository trước khi bật webhook mới.

## Lỗi và giới hạn

| HTTP | Điều kiện                                                           |
| ---- | ------------------------------------------------------------------- |
| 400  | JSON, trang, ngôn ngữ hoặc Content-Type không hợp lệ                |
| 401  | Thiếu phiên, phiên hết hạn hoặc secret sai/chưa cấu hình            |
| 403  | Origin không hợp lệ hoặc BE từ chối quyền                           |
| 503  | Không kiểm được quyền do BE lỗi, timeout hoặc phản hồi sai hợp đồng |

Admin chỉ gọi API sau khi ít nhất một khối lưu thành công, kể cả khi một số khối khác lỗi. Khôi phục mặc định cũng làm mới cache. Lỗi xoá cache được báo riêng: nội dung đã lưu vẫn giữ nguyên, chu kỳ 60 giây còn làm cơ chế dự phòng.

Trang Cẩm nang lấy khối nội dung bằng TanStack Query trong trình duyệt. Trang Bảng giá lấy nội dung từ server cho HTML đầu tiên, rồi dùng TanStack Query để cập nhật trong trình duyệt. Admin đồng thời hết hạn query công khai của trang và ngôn ngữ vừa sửa trong phiên hiện tại. Với `plans`, cache dùng tag `cms:plans:{locale}` và đường dẫn `/{locale}/plans`. API không đẩy nội dung tới tab của người đọc đang mở; tab đó cần tải lại. API cũng không xoá cache CDN ngoài Next.js. Nếu chạy nhiều instance Next.js, cần cache dùng chung hoặc gọi tới mọi instance.

## Kiểm chứng

`npm run test:cms-cache` kiểm phạm vi tag/path, hết hạn ngay, xác thực cookie/secret, từ chối request sai và giữ TTL 60 giây. Kiểm thực tế cần chạy bản production (`npm run build` rồi `npm run start`), sửa một khối trong admin và tải lại trang công khai ngay sau khi lưu.

Nguồn: `TDD-HB-003`, `STORY-HB-004`, `BR-HB-003`; endpoint kiểm quyền trong `bmt-be/src/bmt-be.presentation/apis/handbook/PageSectionApi.cs`. Cơ chế hết hạn dùng [`revalidateTag(tag, { expire: 0 })`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), kết hợp [`revalidatePath`](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).
