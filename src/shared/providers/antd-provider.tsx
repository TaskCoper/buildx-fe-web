'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd'
import enUS from 'antd/locale/en_US'
import viVN from 'antd/locale/vi_VN'
import { useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'

/**
 * Ant Design runtime for the admin area ONLY.
 *
 * The public site is Tailwind + shadcn (mục I–IX); antd would fight those
 * tokens. Mounting the registry inside `app/[locale]/(admin)/layout.tsx` keeps
 * antd's CSS-in-JS out of every public route's bundle while still giving the
 * back office a full component kit.
 *
 * `AntdRegistry` collects the styles generated during SSR and inlines them in
 * the streamed HTML, so the admin shell never flashes unstyled.
 */

/**
 * Brand palette mirrored from `globals.css` (`--primary` ≈ #16A34A). antd's
 * CSS-in-JS cannot read OKLCH custom properties, so the hex equivalents are
 * restated here — keep the two in sync when the brand colour changes.
 */
const BRAND = {
  primary: '#2a753f',
  primaryHover: '#3a8a4f',
  primaryActive: '#1f5c30',
  success: '#2a753f',
  warning: '#d99a0b',
  error: '#dc2626',
  info: '#0ea5e9'
} as const

export function AntdProvider({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <AntdRegistry>
      <ConfigProvider
        locale={locale === 'en' ? enUS : viVN}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: BRAND.primary,
            colorInfo: BRAND.info,
            colorSuccess: BRAND.success,
            colorWarning: BRAND.warning,
            colorError: BRAND.error,
            colorLink: BRAND.primary,
            // Match the public site's 0.625rem radius scale.
            borderRadius: 10,
            borderRadiusLG: 14,
            borderRadiusSM: 8,
            // Be Vietnam Pro is loaded by the locale layout as a CSS variable
            // and carries the full Vietnamese subset.
            fontFamily: 'var(--font-be-vietnam), var(--font-geist-sans), system-ui, sans-serif',
            fontSize: 14,
            wireframe: false
          },
          components: {
            Layout: {
              headerBg: isDark ? '#141618' : '#ffffff',
              headerHeight: 60,
              headerPadding: '0 20px',
              bodyBg: isDark ? '#0f1113' : '#f6f8f6',
              siderBg: isDark ? '#141618' : '#ffffff'
            },
            Menu: {
              itemBorderRadius: 10,
              itemMarginInline: 8,
              itemHeight: 38,
              activeBarWidth: 0,
              itemSelectedBg: isDark ? 'rgba(42,117,63,0.28)' : '#eaf3ec',
              itemSelectedColor: isDark ? '#8cc63f' : BRAND.primaryActive
            },
            Card: { borderRadiusLG: 14 },
            Table: { headerBg: isDark ? '#1a1d1f' : '#f3f6f3', borderRadius: 12, cellPaddingBlock: 12 },
            Button: { primaryShadow: 'none', defaultShadow: 'none', controlHeight: 36 },
            Segmented: { itemSelectedBg: isDark ? 'rgba(42,117,63,0.32)' : '#eaf3ec' },
            Statistic: { contentFontSize: 26 }
          }
        }}
      >
        {/* Context-aware `message` / `modal` / `notification` — the static
            methods are deprecated and cannot read the theme above. */}
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  )
}
