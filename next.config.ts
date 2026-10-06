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
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${BMT_API_ORIGIN}/api/v1/:path*` }]
  },
  poweredByHeader: false,
  // Type-safe `Link`/`router` routes.
  typedRoutes: true,
  images: {
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
