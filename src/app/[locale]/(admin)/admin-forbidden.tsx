'use client'

import { Button, Result, Space } from 'antd'
import { useTranslations } from 'next-intl'

import { useLogout } from '@/features/auth'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/shared/constants'

/**
 * Màn "không có quyền" của khu quản trị.
 *
 * Trạng thái rỗng mặc định của `AdminGuard` chỉ có một dòng chữ giữa trang
 * trắng — người vào nhầm bị kẹt, không có lấy một đường quay ra. Ở đây luôn có
 * hai lối: về trang chủ, hoặc đăng xuất để đăng nhập bằng tài khoản quản trị.
 */
export function AdminForbidden() {
  const t = useTranslations('auth.forbidden')
  const logout = useLogout()

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100svh', padding: 24 }}>
      <Result
        status='403'
        title={t('title')}
        subTitle={t('description')}
        extra={
          <Space>
            <Link href={ROUTES.HOME}>
              <Button type='primary'>{t('backHome')}</Button>
            </Link>
            <Button loading={logout.isPending} onClick={() => logout.mutate()}>
              {t('switchAccount')}
            </Button>
          </Space>
        }
      />
    </div>
  )
}
