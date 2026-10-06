'use client'

import { Typography } from 'antd'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { siteConfig } from '@/shared/config/site'
import { ADMIN_ROUTES } from '@/shared/constants'

const { Text } = Typography

/**
 * Nhãn thương hiệu trên đầu menu trái. Dùng dải gradient thương hiệu
 * (#2A753F → #8CC63F, màu logo BuildX) giống nút chính của site để hai khu vẫn là một sản phẩm,
 * dù khu quản trị chạy trên Ant Design còn site chạy Tailwind.
 */
export function AdminBrand({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations('admin')

  return (
    <Link
      href={ADMIN_ROUTES.DASHBOARD}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 60,
        padding: collapsed ? '0 20px' : '0 18px',
        borderBottom: '1px solid var(--admin-border)',
        overflow: 'hidden'
      }}
    >
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 9,
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          background: 'linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))'
        }}
      >
        SV
      </span>
      {collapsed ? null : (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
          <Text strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            {siteConfig.name}
          </Text>
          <Text type='secondary' style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            {t('shell.brandSuffix')}
          </Text>
        </span>
      )}
    </Link>
  )
}
