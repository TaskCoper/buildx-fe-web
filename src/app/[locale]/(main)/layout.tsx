import type { ReactNode } from 'react'

import { SiteFooterWithContent } from '@/shared/layouts/site-footer.server'
import { ChatDock } from '../chat-dock'
import { MainChrome } from './main-chrome'

/**
 * Khung trang dùng chung có ISR 60 giây. Sau thời hạn, lượt truy cập tiếp theo
 * kích hoạt làm mới nền; CMS có webhook /api/cms/revalidate để hết hạn ngay.
 * Phải là số viết thẳng vì Next đọc giá trị này lúc build.
 */
export const revalidate = 60

/**
 * Khung chung cho mọi trang (mục I + II.1): thanh công cụ cố định trên cùng,
 * footer nền tối, chatbox AI nổi ở góc phải dưới.
 */
export default async function MainLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip'>
      <MainChrome />
      <main className='min-w-0 flex-1 overflow-x-clip'>{children}</main>
      <SiteFooterWithContent locale={locale} />
      <ChatDock />
    </div>
  )
}
