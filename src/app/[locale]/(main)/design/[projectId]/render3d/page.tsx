import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { designEstimateRoute } from '@/shared/constants/routes'

export function generateStaticParams() {
  return []
}

/**
 * Phối cảnh 3D nay là một tab của bước Dự toán & 3D (hai chặng chạy cùng lúc, BR-PROJ-010 sửa 13/10/2026). Giữ route cũ
 * để link đã gửi vẫn mở đúng tab.
 */
export default async function Render3dPage({ params }: { params: Promise<{ locale: Locale; projectId: string }> }) {
  const { locale, projectId } = await params
  redirect({ href: `${designEstimateRoute(projectId)}?tab=render3d`, locale })
}
