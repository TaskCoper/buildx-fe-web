import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

/**
 * next-intl plugin wires the i18n request configuration into the build.
 * Point it at the request config so server components can resolve messages.
 */
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * Origin of the BMT .NET API. The browser calls `/api/v1/*` on this app and
 * Next forwards it here, so the API's httpOnly `accessToken`/`refreshToken`
 * cookies are set on our own domain — no third-party cookies, no CORS.
 */
const BMT_API_ORIGIN = (process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com').replace(/\/$/, '')

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${BMT_API_ORIGIN}/api/v1/:path*` }]
  },
  // `apple-app-site-association` không có đuôi tệp nên Next trả `application/octet-stream`; iOS yêu cầu JSON
  // (liên kết sâu / Universal Links). `assetlinks.json` của Android có đuôi `.json` nên đã đúng kiểu. Hai tệp nằm ở
  // `public/.well-known/` và phải trả 200 trực tiếp, không redirect (proxy.ts đã bỏ qua mọi đường dẫn có dấu chấm).
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }]
      }
    ]
  },
  poweredByHeader: false,
  // Type-safe `Link`/`router` routes.
  typedRoutes: true,
  images: {
    // Mặc định Next chỉ phát WebP. Liệt kê AVIF trước để trình duyệt hỗ trợ nhận AVIF (nhỏ hơn WebP khoảng 20–30% ở cùng
    // chất lượng), trình duyệt cũ vẫn nhận WebP. Áp dụng cho MỌI ảnh qua `next/image`, kể cả ảnh admin tải lên CDN.
    formats: ['image/avif', 'image/webp'],
    // Ba cấu hình dưới đây là NGUỒN GỐC của tốc độ ảnh: mỗi bậc `w` / mức `q` là một cache key riêng của bộ tối ưu và một
    // lần resize nguội tốn 2–6 giây (đo 12/10/2026 trên site thật: 3,5–5,8 giây TTFB), nên danh sách cố tình THƯA và chỉ có
    // MỘT mức nén. Phải khớp `src/shared/lib/image-variants.ts` (`scripts/image-variants.test.mjs` kiểm); `/api/warm` sinh
    // trước đúng các bậc này sau mỗi lần nội dung đổi. Thêm bậc mới phải có lý do thật.
    deviceSizes: [640, 828, 1080, 1600, 1920],
    imageSizes: [96, 192, 384],
    qualities: [75],
    // Ảnh admin tải lên mang key mới ở mỗi lần tải nên nội dung không bao giờ đổi: giữ bản đã resize 30 ngày thay vì mặc định.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Danh sách host này phải khớp `OPTIMIZABLE_IMAGE_HOSTS` trong `src/shared/lib/image-src.ts` (có test kiểm).
    remotePatterns: [
      // Royalty-free catalogue photography (see `shared/lib/imagery.ts`).
      // Replace with the CMS asset host once admin uploads the real catalogue.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Ảnh nhà thầu gửi qua Google Drive (`driveImage` trong contractors.seed).
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Thumbnail video YouTube của các bước hướng dẫn (epic GuideStepManagement).
      { protocol: 'https', hostname: 'i.ytimg.com' },
      // Kho tệp của backend — Bizfly Simple Storage (TDD-CTR-001/External API).
      // Ảnh thật do admin tải lên (tin tức, hướng dẫn, nhà thầu, thư viện mẫu) trả
      // về từ host này; thiếu nó thì `next/image` ném lỗi và LÀM GÃY CẢ TRANG.
      { protocol: 'https', hostname: '**.ss.bfcplatform.vn' },
      // CDN mới của backend (VCCloud): ảnh kiến trúc sư, thumbnail thư viện mẫu… trả về từ host này.
      { protocol: 'https', hostname: 'bmt-cdn-vnzdna.cdn.vccloud.vn' }
      // Add CDN / asset hosts served by the backend here.
      // { protocol: 'https', hostname: 'cdn.example.com' },
    ]
  }
}

export default withNextIntl(nextConfig)
