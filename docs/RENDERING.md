# Cách dựng trang: site khách (ISR) và khu quản trị (CSR)

Cập nhật: 08/10/2026.

## Tóm tắt

- **Site của khách** (mọi route ngoài `(admin)`): dựng sẵn HTML rồi làm mới nền sau mỗi **60 giây** (ISR). Backend còn gọi webhook để làm mới **ngay** khi admin lưu hoặc xóa nội dung.
- **Khu quản trị** (`/admin/...`): chỉ chạy ở trình duyệt (CSR). HTML trả về chỉ có vòng quay chờ, không có nội dung quản trị.
- Kiểm bằng `pnpm test:rendering` (đọc mã nguồn, chạy trong vài giây). Việc dựng thật xem mục "Kiểm tra thực tế" ở cuối.

## Site của khách: ISR

Mỗi trang khách là một trang tĩnh (`●` trong bảng route của `next build`) kèm thời gian làm mới. Phản hồi có `Cache-Control: s-maxage=60, stale-while-revalidate=…` và `x-nextjs-cache: HIT`. Hết 60 giây, người xem kế tiếp vẫn nhận ngay bản cũ (`STALE`) và Next dựng lại bản mới ở nền.

Quy tắc để một trang giữ được ISR:

1. **Không đọc dữ liệu theo từng request ở server.** Cấm `searchParams` (prop của `page.tsx`), `cookies()`, `headers()`, `draftMode()`, `connection()`, `export const dynamic` và `fetch(..., { cache: 'no-store' })` trong `page.tsx` và `layout.tsx` của site khách. Chỉ một lần dùng là cả trang thành động (`ƒ`), không còn được lưu đệm.
2. **Tham số truy vấn (`?project=`, `?tab=`…) đọc ở client** bằng `useSearchParams()` trong một component client nhỏ cạnh trang (ví dụ `contractor-firm-view.tsx`). Trang công khai có nội dung cần cho tìm kiếm thì bọc component đó trong `<Suspense fallback={bản không có tham số}>` (ví dụ `plans/supervision`), để HTML dựng sẵn vẫn đủ nội dung.
3. **Trang có đoạn đường dẫn động** (`[projectId]`, `[slug]`…) phải có `generateStaticParams` trả `[]`: không dựng sẵn trang nào lúc build, trang đầu tiên được mở sẽ được dựng rồi lưu đệm (ISR theo yêu cầu). Ngoại lệ có chủ ý: `[...rest]` (404) để động, vì lưu đệm mỗi đường dẫn lạ sẽ làm đầy bộ nhớ đệm.
4. **Mỗi cụm trang khai báo `export const revalidate = 60`** (số viết thẳng, Next đọc lúc build): layout của `(main)`, `(auth)`, `(checkout)` và các trang đứng ngoài nhóm (`callback`, `share/[token]`, `estimates/shared/[shareId]`).
5. **Layout dùng `Link` của `@/i18n/navigation` ở server phải tự gọi `setRequestLocale(locale)`.** Layout con chạy trước khi trang đặt ngôn ngữ; thiếu bước này next-intl đọc `headers()` và cả nhóm trang thành động (từng làm `/forgot-password` mất ISR).
6. **Dữ liệu theo người dùng nằm ở client** (TanStack Query, phiên đăng nhập qua cookie httpOnly). Trang chỉ là khung dùng chung, nên các trang cần đăng nhập vẫn ISR được.

### Làm mới ngay khi admin sửa nội dung (webhook)

Nội dung CMS ở server (trang chủ, chân trang, trang pháp lý, trang Tìm nhà thầu) lấy qua `fetchPageSections`: `GET /pages/{pageKey}/sections`, làm mới 60 giây, **gắn thẻ `page-sections:{pageKey}`**. Backend gọi webhook sau khi transaction lưu hoặc xóa khối chữ đã commit:

```
POST {CLIENT_BASE_URL}/api/revalidate
x-revalidate-secret: <khóa>
{ "tags": ["page-sections:home"] }        // hoặc "paths": ["/vi/contractors"]
```

- Làm mới theo thẻ nên một lần gọi cập nhật mọi trang đã dùng khối chữ đó, kể cả chân trang nằm trong layout của cả nhóm trang.
- Thẻ hết hạn ngay (`expire: 0`): người xem kế tiếp nhận bản mới, không phải bản cũ trong lúc nó làm mới ngầm.
- Trả `200 { revalidated, tags, paths }`; `401` khóa sai; `400` nội dung sai khuôn (thẻ `[a-z0-9:_-]`, tối đa 64 ký tự; đường dẫn bắt đầu bằng `/`; tối đa 20 mục); `503` khi chưa đặt khóa (webhook tắt); chỉ nhận `POST`.
- Khóa so sánh bằng `timingSafeEqual`. Webhook chỉ là tăng tốc: lỗi hay chưa cấu hình thì trang vẫn tự làm mới sau tối đa 60 giây.

Cấu hình, hai phía phải **cùng một giá trị**:

| Phía     | Biến                                  | Ghi chú                                                        |
| -------- | ------------------------------------- | -------------------------------------------------------------- |
| Frontend | `REVALIDATE_SECRET` (container chạy)  | Để trống thì webhook tắt (503)                                 |
| Backend  | `FRONTEND_REVALIDATE_SECRET` (GitHub) | Để trống thì backend không gọi webhook                         |
| Backend  | `CLIENT_BASE_URL` (đã có)             | Địa chỉ web mà backend gọi: `{CLIENT_BASE_URL}/api/revalidate` |

Tạo khóa: `openssl rand -hex 32`. Server của web cũng cần `BMT_API_ORIGIN` lúc chạy (đã thêm vào `.docker/compose.yaml`) để tự gọi API khi dựng và làm mới trang.

## Khu quản trị: CSR

`(admin)/layout.tsx` chỉ giữ tiêu đề tab (`noindex`) và CSS. Toàn bộ bộ khung (Ant Design, kiểm tra đăng nhập, kiểm tra quyền, menu) nằm trong `AdminApp` và được nạp bằng `next/dynamic` với `ssr: false` ở `AdminClientRoot`. Vì vậy:

- HTML của mọi trang `/admin/...` chỉ có vòng quay chờ; sau khi hydrate mới tải bộ khung admin rồi kiểm tra phiên và quyền.
- Trang admin không tự lấy dữ liệu ở server; dữ liệu đi qua TanStack Query ở client.
- Trang có đoạn động (`customers/[id]`) có `generateStaticParams` để vẫn là khung tĩnh dùng chung.

## Kiểm tra thực tế

`pnpm test:rendering` đọc mã nguồn để giữ các quy tắc trên. Để kiểm thật, chạy bản build production:

1. `next build`: cột bên phải bảng route phải ghi `1m 1y` cho trang khách; chỉ `[...rest]`, `/admin/contractors/[id]` (chuyển hướng cũ) và các `/api/*` là `ƒ`.
2. `next start` (hoặc container) rồi gọi: `curl -sI /vi/contractors` phải có `x-nextjs-cache: HIT` và `s-maxage=60`; `curl -s /vi/admin/orders` chỉ có vòng quay chờ.
3. Gọi webhook với đúng khóa rồi tải lại trang khách: nội dung mới phải hiện ngay, không phải chờ 60 giây.
