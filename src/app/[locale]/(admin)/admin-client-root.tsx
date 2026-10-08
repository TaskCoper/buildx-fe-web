'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { LoadingSpinner } from '@/shared/components/common'

function AdminLoading() {
  const t = useTranslations('common')
  return <LoadingSpinner className='min-h-svh' label={t('loading')} />
}

/**
 * Khu quản trị chỉ dựng ở trình duyệt (CSR): không dựng HTML ở server, không gửi nội dung quản trị trong HTML dựng sẵn.
 *
 * Mọi thứ ở đây phụ thuộc phiên đăng nhập và quyền của từng người, dữ liệu lấy qua TanStack Query ở client, nên dựng ở
 * server chỉ tốn công và dễ lệch hydrate (Ant Design chèn CSS-in-JS lúc chạy). Trang trả về chỉ có vòng quay chờ; sau khi
 * hydrate thì tải bộ khung admin rồi mới kiểm tra phiên và quyền.
 */
const AdminApp = dynamic(() => import('./admin-app').then((module) => module.AdminApp), {
  ssr: false,
  loading: () => <AdminLoading />
})

export function AdminClientRoot({ children }: { children: ReactNode }) {
  return <AdminApp>{children}</AdminApp>
}
