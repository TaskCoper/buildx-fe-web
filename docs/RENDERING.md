# Cách dựng trang và lưu cache

Các trang khách hiện dùng ISR 60 giây để cache HTML công khai hoặc khung trang dùng chung. Dữ liệu tài khoản, dự án, đơn hàng và quyền admin được lấy ở client bằng phiên hiện tại. Nội dung CMS có webhook riêng để hết hạn cache ngay sau khi lưu.

## ISR của site khách

Layout `(main)`, `(auth)` và `(checkout)` khai báo `revalidate = 60`. Các trang `callback`, `share/[token]` và `estimates/shared/[shareId]` khai báo cùng thời hạn. Trang có đoạn đường dẫn động trả `generateStaticParams() => []`, nên Next dựng và cache khi đường dẫn đó được mở lần đầu. `[...rest]` và route chuyển hướng admin cũ vẫn là trang động.

60 giây là thời hạn cache. Sau thời hạn, lượt truy cập tiếp theo có thể nhận bản cũ và kích hoạt dựng lại ở nền. Nếu không có truy cập hoặc backend lỗi, nội dung không được bảo đảm cập nhật sau đúng 60 giây. Đây là hành vi [ISR của Next.js](https://nextjs.org/docs/app/guides/incremental-static-regeneration).

ISR hiện chỉ lưu khung dùng chung của các trang riêng tư. Server không đọc cookie đăng nhập để lấy hồ sơ, dự án hay đơn hàng rồi đưa các dữ liệu đó vào HTML chung. `AuthBootstrap` xác nhận `/users/me` ở client trước khi dựng nội dung riêng tư; backend kiểm quyền cho mỗi request dữ liệu. Khi thêm dữ liệu theo phiên vào Server Component, phải đánh giá lại cách dựng và dùng SSR động khi cần. Không ép mọi tính năng tương lai phải dùng ISR.

Các query `createProject`, `project`, `plan`, `offer`, `tab`, `request` và `stage` được đọc bằng `useSearchParams()` ở client. Query không tạo bản cache HTML riêng. Trang bảng giá giám sát có `Suspense` cục bộ với bảng giá công khai làm fallback, nên HTML ban đầu vẫn có bảng giá. Các trang riêng tư chờ xác thực trước khi hiện dữ liệu. Next.js giải thích ảnh hưởng của hook này tới HTML tĩnh tại [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

Layout đăng nhập tự gọi `setRequestLocale(locale)` trước khi dựng `Link` của next-intl. Nhờ vậy, việc xác định ngôn ngữ không phải đọc header của từng request và làm cả nhóm trang thành động.

## Admin lấy dữ liệu ở client

`(admin)/layout.tsx` giữ metadata `noindex`, `nofollow` và CSS, rồi import `AdminApp`, một Client Component. Next tải mã khung admin theo route cùng lúc với kiểm tra phiên. HTML ban đầu chỉ có loading; form và dữ liệu quản trị xuất hiện sau khi client xác nhận phiên và quyền.

Không dùng thêm `dynamic(..., { ssr: false })` cho toàn bộ khung admin. Trong bản thử nghiệm, root guard đã chặn dựng khung khi chưa xác thực, nên cách này tạo một bước tải nối tiếp: `/users/me` trả về, sau đó trình duyệt mới yêu cầu module khung admin. Import trực tiếp bỏ bước chờ này, vẫn giữ dữ liệu ở client và Ant Design trong nhóm route admin. `ssr: false` vẫn phù hợp với thành phần thật sự cần API riêng của trình duyệt; xem [hướng dẫn lazy loading](https://nextjs.org/docs/app/guides/lazy-loading).

CSR không thay thế phân quyền của backend. Cookie `bmt.auth` chỉ giúp điều hướng sớm; marker này không chứng minh phiên hợp lệ. Cache HTML loading của admin cũng không chứa quyền hay hồ sơ của người dùng.

## Làm mới nội dung CMS

Hợp đồng duy nhất là `POST /api/cms/revalidate`, payload `{ "pageKey": "home", "locale": "vi" }`, tag `cms:{pageKey}:{locale}`. Backend giao thông báo qua Outbox sau commit. Next gọi `revalidateTag(tag, { expire: 0 })` và `revalidatePath` để lần đọc tiếp theo lấy nội dung mới. Xem [CMS_CACHE.md](CMS_CACHE.md) để cấu hình secret, quyền gọi API và phạm vi Footer.

API không đẩy HTML mới tới tab đang mở. Người đọc cần tải lại hoặc điều hướng lại. Khi có CDN ngoài Next.js hay nhiều instance dùng cache riêng, cần xử lý tầng cache đó khi triển khai.

## Ảnh

Ảnh tĩnh trong `public/images` là AVIF. Ảnh hiển thị qua `next/image` (kể cả `Photo` và `RevealPhoto`) được Next đổi sang AVIF cho trình duyệt hỗ trợ, trình duyệt cũ nhận WebP; cấu hình nằm ở `images.formats` trong `next.config.ts`. Ảnh admin tải lên CDN cũng hưởng lợi, miễn là được hiển thị bằng `next/image`.

- **Thêm ảnh mới:** chạy `node scripts/optimize-images.mjs <đường dẫn ảnh>`, rồi trỏ code tới file `.avif` vừa tạo. Script thu nhỏ ảnh quá lớn và giữ nguyên ảnh mà AVIF không nhỏ hơn đáng kể (icon vài KB). Thêm `--delete-originals` để xoá bản gốc sau khi đổi; thêm `--dry-run` để chỉ xem kết quả.
- **Hiển thị ảnh:** dùng `Photo` hoặc `next/image` để Next chọn định dạng và đúng cỡ khung. Chỉ dùng thẻ `<img>` khi bắt buộc: ảnh `/api/…` cần cookie phiên (`next/image` tải từ máy chủ nên không mang cookie), ảnh xem trước dạng `blob:`, ảnh nằm trong HTML bài viết, và URL do admin dán ở host lạ.
- **Ảnh từ URL admin dán:** gọi `canOptimizeImage` (`shared/lib/image-src.ts`) để chọn giữa `next/image` và `<img>`. Với host ngoài `images.remotePatterns`, bản production không báo lỗi mà ảnh vỡ lặng lẽ. Khi thêm host vào `remotePatterns`, thêm cả vào `OPTIMIZABLE_IMAGE_HOSTS`; `pnpm test:images` kiểm hai danh sách khớp nhau.
- **Đổi ảnh trong `public/`:** nếu giữ nguyên tên file, trình duyệt và bộ nhớ đệm ảnh của Next có thể còn giữ bản cũ. Đặt tên file mới khi đổi nội dung ảnh.

## Kiểm chứng

Chạy `pnpm build`, sau đó `pnpm test:rendering`. Bộ test chạy output standalone trong thư mục cache riêng và gọi API fixture chỉ đọc. Nó kiểm manifest production, header ISR, cache HIT, nội dung Home và Footer sau webhook, HTML bảng giá có query, khung riêng tư không gọi `/users/me` ở server, loading/noindex của admin và chuyển hướng khách chưa đăng nhập. CI chạy bộ test sau build.

Các test này không kiểm luồng thanh toán hay tích hợp database thật. Khi sửa query hoặc guard, kiểm thêm trên trình duyệt với tài khoản/fixture phù hợp: tab nhà thầu, giai đoạn giám sát, dự án gắn với gói mua và quyền truy cập admin. Không dùng kiểm tra chuỗi trong source code để kết luận ISR/CSR chạy đúng.
