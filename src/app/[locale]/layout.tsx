import { AuthBootstrap } from '@/features/auth'
import { CmsMessagesProvider } from '@/shared/cms'
import { routing } from '@/i18n/routing'
import { siteConfig } from '@/shared/config/site'
import { AppProviders } from '@/shared/providers'
import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Be_Vietnam_Pro, Geist, Geist_Mono, Sriracha } from 'next/font/google'
import { notFound } from 'next/navigation'

import '../globals.css'

const MOBILE_SCROLL_RESET_SCRIPT = `
(() => {
  const navigation = performance.getEntriesByType('navigation')[0];
  const isReload = navigation && navigation.type === 'reload';
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  if (!isReload || !isMobile) return;

  history.scrollRestoration = 'manual';

  const reset = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  reset();
  requestAnimationFrame(reset);
  requestAnimationFrame(() => requestAnimationFrame(reset));
})();
`

const PRICING_SCROLL_RESTORE_SCRIPT = `
(() => {
  const path = location.pathname.endsWith('/') ? location.pathname.slice(0, -1) : location.pathname;
  if (!path.endsWith('/plans')) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;

  const key = 'pricing-scroll:' + location.pathname + location.search;
  const navigation = performance.getEntriesByType('navigation')[0];
  const isReload = navigation && navigation.type === 'reload';
  const saved = Number(sessionStorage.getItem(key));
  let restoring = isReload && Number.isFinite(saved) && saved > 0;
  let frame = 0;
  const startedAt = performance.now();
  const root = document.documentElement;
  const previousMinHeight = root.style.minHeight;

  history.scrollRestoration = 'manual';

  if (restoring) {
    root.style.minHeight = Math.ceil(saved + window.innerHeight) + 'px';
    void root.offsetHeight;
    window.scrollTo(0, saved);
  }

  const save = () => {
    if (!restoring) sessionStorage.setItem(key, String(window.scrollY));
  };

  const restore = () => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(saved, maxScroll));

    const pageIsTallEnough = maxScroll >= saved - 2;
    const positionIsRestored = Math.abs(window.scrollY - saved) <= 2;
    if ((pageIsTallEnough && positionIsRestored) || performance.now() - startedAt > 5000) {
      restoring = false;
      root.style.minHeight = previousMinHeight;
      sessionStorage.setItem(key, String(window.scrollY));
      return;
    }

    frame = requestAnimationFrame(restore);
  };

  if (restoring) frame = requestAnimationFrame(restore);

  window.addEventListener('scroll', save, { passive: true });
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    root.style.minHeight = previousMinHeight;
    sessionStorage.setItem(key, String(window.scrollY));
  }, { once: true });
})();
`

const geistSans = Geist({
  variable: '--font-geist-sans',
  // 'latin-ext' covers Vietnamese diacritics; Geist has no 'vietnamese' subset.
  subsets: ['latin', 'latin-ext'],
  display: 'swap'
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap'
})

// Display font for headings & the brand shell — full Vietnamese subset support.
const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap'
})

/**
 * Chữ viết tay — chỉ dùng cho các dòng ghi chú nghiêng trên trang chủ (theo ảnh
 * mockup khách gửi). Phải có subset `vietnamese`: dấu tiếng Việt dựng sẵn (ệ,
 * ấ, ộ…) nằm ngoài `latin-ext`, thiếu nó là chữ rơi về font dự phòng giữa câu,
 * mỗi chữ một kiểu — Caveat (giống ảnh mockup nhất) rơi đúng vào lỗi đó nên
 * loại. Sriracha là font bút lông nghiêng gần kiểu trong ảnh và có tiếng Việt.
 */
const handwriting = Sriracha({
  variable: '--font-handwriting',
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: '400',
  display: 'swap'
})

export const metadata: Metadata = {
  // Mỗi trang tự đặt tiêu đề (`pageMetadata`), layout gắn đuôi "| BuildX" (góp ý BuildX, PC19).
  title: {
    default: 'BuildX',
    template: '%s | BuildX'
  },
  description: 'Plan, estimate and manage construction projects on one premium platform.',
  metadataBase: new URL(siteConfig.url)
}

/** Pre-render a static shell for every supported locale. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Enable static rendering for this locale segment.
  setRequestLocale(locale)

  // `data-scroll-behavior` trên <html>: `globals.css` bật `scroll-behavior: smooth` cho cả trang, nên
  // khi đổi trang Next cuộn về đầu bằng hiệu ứng trượt chậm từ chỗ đang đứng. Cờ này bảo Next tạm tắt
  // smooth đúng lúc chuyển route → nhảy thẳng lên đầu trang; cuộn neo / nút cuộn vẫn mượt.
  return (
    <html lang={locale} data-scroll-behavior='smooth' suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOBILE_SCROLL_RESET_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PRICING_SCROLL_RESTORE_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${beVietnamPro.variable} ${handwriting.variable} font-sans antialiased`}
      >
        {/* Messages are provided automatically from i18n/request.ts */}
        <NextIntlClientProvider>
          {/* Re-provides the catalogue with the copy the admin edited in the
              CMS layered on top, so every string on the site is editable
              without a deploy. No-ops until something is actually overridden. */}
          <CmsMessagesProvider>
            <AppProviders>
              {/* Resolves the session once for the whole app so auth guards
                  never deadlock waiting for initialization. */}
              <AuthBootstrap>{children}</AuthBootstrap>
            </AppProviders>
          </CmsMessagesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
