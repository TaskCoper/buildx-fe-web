import { setRequestLocale } from 'next-intl/server'

import { CustomerDetail } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

/**
 * Khung trang tĩnh: khu quản trị chạy ở trình duyệt (CSR) nên mọi mã khách dùng chung một khung, dữ liệu lấy ở client.
 * Không dựng sẵn trang nào lúc build; trang đầu tiên được mở thì dựng rồi lưu đệm.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; id: string }>
}

/** Chi tiết tài khoản khách hàng (epic UserAccountManagement §2–§8). */
export default async function AdminCustomersIdPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  return <CustomerDetail id={id} />
}
