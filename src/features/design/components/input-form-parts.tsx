'use client'

import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import type { SaveStatus } from '../hooks/use-estimate-input'

/* Phần dựng dùng chung của hai biểu mẫu nhập liệu (luồng cũ và luồng bốn chặng). */

/** Thẻ nhóm trường: số thứ tự + tiêu đề, nội dung chia lưới đều. */
export function SectionCard({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <section className='bg-card rounded-2xl border p-5 shadow-xs sm:p-6'>
      <header className='mb-5 flex items-center gap-3'>
        <span className='bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
          {index}
        </span>
        <h2 className='text-base font-semibold'>{title}</h2>
      </header>
      {children}
    </section>
  )
}

/** Thẻ chọn phong cách (kiến trúc / nội thất) ở cột phải. */
export function StyleCard({
  id,
  title,
  hint,
  required = false,
  children
}: {
  id: string
  title: string
  hint: string
  /** Dấu * cùng kiểu `FieldLabel`: nhóm phong cách đang hiện thì BE bắt buộc chọn một. */
  required?: boolean
  children: ReactNode
}) {
  return (
    <section id={id} className='bg-card rounded-2xl border p-5 shadow-xs sm:p-6'>
      <h2 className='text-base font-semibold'>
        {title}
        {required ? <span className='text-destructive ml-0.5'>*</span> : null}
      </h2>
      <p className='text-muted-foreground mt-1 mb-4 text-sm'>{hint}</p>
      {children}
    </section>
  )
}

/** Một nhóm phong cách bên trong thẻ "Thông tin bổ sung" của luồng bốn chặng; luôn bắt buộc khi đang hiện. */
export function StyleGroup({
  id,
  title,
  hint,
  children
}: {
  id: string
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <div id={id}>
      <h3 className='text-sm font-semibold'>
        {title}
        <span className='text-destructive ml-0.5'>*</span>
      </h3>
      <p className='text-muted-foreground mt-0.5 mb-3 text-xs'>{hint}</p>
      {children}
    </div>
  )
}

/** Dòng trạng thái tự lưu: chỉ báo "Đã lưu" sau khi BE xác nhận (BR-PROJ-003 khoản 8). */
export function SaveIndicator({
  status,
  message,
  onRetry
}: {
  status: SaveStatus
  message: string | null
  onRetry: () => void
}) {
  const t = useTranslations('design.inputApi.status')
  if (status === 'idle') return null
  if (status === 'error' || status === 'denied' || status === 'conflict') {
    return (
      <p className='text-destructive flex flex-wrap items-center justify-center gap-2 text-xs' role='status'>
        <AlertCircle className='size-3.5' />
        {status === 'conflict' ? t('conflict') : status === 'denied' ? (message ?? t('denied')) : t('error')}
        {status === 'error' || status === 'conflict' ? (
          <button type='button' onClick={onRetry} className='inline-flex items-center gap-1 font-medium underline'>
            <RefreshCw className='size-3' />
            {status === 'conflict' ? t('reloadSaved') : t('retry')}
          </button>
        ) : null}
      </p>
    )
  }
  return (
    <p className='text-muted-foreground flex items-center justify-center gap-1.5 text-xs' role='status'>
      {status === 'saved' ? null : <Loader2 className='size-3 animate-spin' />}
      {status === 'saved' ? t('saved') : status === 'saving' ? t('saving') : t('pending')}
    </p>
  )
}
