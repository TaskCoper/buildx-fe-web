'use client'

import { Typography } from 'antd'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Logo } from '@/shared/components/common'
import { siteConfig } from '@/shared/config/site'
import { ADMIN_ROUTES } from '@/shared/constants'

const { Text } = Typography

/** Logo ngang mặc định; khi menu thu gọn chỉ cắt lấy biểu tượng ngôi nhà ở bên trái ảnh. */
const BUILDX_LOGO = '/images/brand/buildx-logo.png'

/**
 * Nhãn thương hiệu trên đầu menu trái: logo BuildX thật (cùng logo của site, nên admin đặt lại ảnh `brand.logo` thì khu
 * quản trị cũng đổi theo) kèm dòng nhỏ "Khu quản trị". Menu thu gọn chỉ còn biểu tượng ngôi nhà.
 */
export function AdminBrand({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations('admin')

  return (
    <Link
      href={ADMIN_ROUTES.DASHBOARD}
      aria-label={`${siteConfig.name} — ${t('shell.brandSuffix')}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 60,
        padding: collapsed ? '0 20px' : '0 18px',
        borderBottom: '1px solid var(--admin-border)',
        overflow: 'hidden'
      }}
    >
      {collapsed ? (
        <span style={{ display: 'block', width: 38, height: 30, flexShrink: 0, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo tĩnh trong public/, cắt bằng CSS nên không qua next/image */}
          <img
            src={BUILDX_LOGO}
            alt=''
            style={{ display: 'block', height: 28, width: 'auto', maxWidth: 'none', marginLeft: -3 }}
          />
        </span>
      ) : (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <Logo className='h-7 max-w-40' />
          <Text
            type='secondary'
            style={{
              fontSize: 10,
              lineHeight: 1,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}
          >
            {t('shell.brandSuffix')}
          </Text>
        </span>
      )}
    </Link>
  )
}
