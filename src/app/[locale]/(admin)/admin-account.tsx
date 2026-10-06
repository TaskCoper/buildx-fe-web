'use client'

import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, Typography } from 'antd'
import { useTranslations } from 'next-intl'

import { useLogout } from '@/features/auth'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { ROUTES } from '@/shared/constants'
import { getInitials } from '@/shared/utils'

const { Text } = Typography

/**
 * Menu tài khoản của thanh trên khu quản trị.
 *
 * Nằm ở lớp `app/` chứ không trong `features/admin` vì chỉ lớp này được phép
 * dùng `features/auth` — feature không import feature khác (docs/ARCHITECTURE.md §2).
 */
export function AdminAccount() {
  const t = useTranslations('admin')
  const { user } = useAuth()
  const logout = useLogout()

  if (!user) return null

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          {
            key: 'identity',
            type: 'group',
            label: (
              <span style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
                <Text strong>{user.name}</Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {user.email}
                </Text>
              </span>
            )
          },
          { type: 'divider' },
          {
            key: 'site',
            icon: <UserOutlined />,
            label: <Link href={ROUTES.HOME}>{t('shell.viewSite')}</Link>
          },
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            danger: true,
            label: t('shell.logout'),
            onClick: () => logout.mutate()
          }
        ]
      }}
    >
      <Avatar src={user.avatarUrl} style={{ cursor: 'pointer', flexShrink: 0 }}>
        {getInitials(user.name)}
      </Avatar>
    </Dropdown>
  )
}
