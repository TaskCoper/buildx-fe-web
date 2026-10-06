'use client'

import { WarningOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import { useTranslations } from 'next-intl'

/**
 * Banner cảnh báo cho các màn quản trị CHƯA gắn API thật — vẫn đọc/ghi dữ liệu
 * mẫu trên trình duyệt (kho CMS localStorage). Đặt ở các component dùng chung
 * của luồng mock (`ResourceManager`, `DocumentEditor`); màn đã nối API dùng
 * `ApiResourceManager` nên không có banner này.
 */
export function MockApiNotice() {
  const t = useTranslations('admin.mockApiNotice')
  return (
    <Alert
      type='warning'
      showIcon
      icon={<WarningOutlined />}
      message={t('title')}
      description={t('description')}
      style={{ marginBottom: 12 }}
    />
  )
}
