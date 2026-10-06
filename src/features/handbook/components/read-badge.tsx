'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { useIsRead } from '../store/handbook-read.store'

/** Nhãn "Đã đọc" trên thẻ mẫu / bài viết người dùng đã mở xem. */
export function ReadBadge({ id, className }: { id: string; className?: string }) {
  const t = useTranslations('handbook.read')
  const read = useIsRead(id)

  if (!read) return null

  return (
    <Badge data-read-badge variant='outline' className={cn('text-muted-foreground gap-1 overflow-hidden', className)}>
      <Check data-read-check className='size-3' />
      {t('badge')}
    </Badge>
  )
}
