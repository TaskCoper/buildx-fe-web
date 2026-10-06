'use client'

import { HelpCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'

/**
 * Nút "?" trên các màn hình của luồng 3 bước — mở đúng video / bài hướng dẫn
 * tương ứng trong trang Hướng dẫn (mục II.4, theo Phụ lục 01 mục 5).
 *
 * `topic` khớp với id nhóm trên trang Hướng dẫn; `features/design` không import
 * `features/guide` nên anchor được truyền vào dạng chuỗi.
 */
export function HelpLink({ topic, className }: { topic: string; className?: string }) {
  const t = useTranslations('design.help')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`${ROUTES.GUIDE}#${topic}`}
          aria-label={t('label')}
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] inline-flex size-8 items-center justify-center rounded-full transition-colors',
            className
          )}
        >
          <HelpCircle className='size-4' />
        </Link>
      </TooltipTrigger>
      <TooltipContent>{t('tooltip')}</TooltipContent>
    </Tooltip>
  )
}
