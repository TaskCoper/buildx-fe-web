import type { ReactNode } from 'react'

import { SiteFooterWithContent } from '@/shared/layouts/site-footer.server'
import { ChatDock } from '../chat-dock'
import { MainChrome } from './main-chrome'

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
