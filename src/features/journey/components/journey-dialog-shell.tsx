'use client'

import { X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { PopupBrandLogo } from '@/shared/components/common'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'

interface JourneyDialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  /** Dải dưới cùng của popup; bỏ trống thì không có dải này. */
  footer?: ReactNode
}

export function JourneyDialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer
}: JourneyDialogShellProps) {
  const t = useTranslations('common.journey')
  const reduceMotion = useReducedMotion()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='max-h-[calc(100dvh-2rem)] w-[min(1080px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] gap-0 overflow-x-hidden overflow-y-auto rounded-[24px] border-0 bg-background p-0 shadow-2xl sm:max-w-[1080px]'
      >
        <div className='relative shrink-0 bg-background px-5 pt-5 sm:pt-5 sm:max-[900px]:px-6 min-[900px]:px-44 max-[899px]:pb-3'>
          <PopupBrandLogo />

          <div className='h-9 sm:h-10'>
            <DialogClose
              aria-label={t('close')}
              className='bg-muted/80 hover:bg-muted absolute top-5 right-5 flex size-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:right-6 sm:size-10'
            >
              <X className='size-5' strokeWidth={2.2} />
            </DialogClose>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
            className='mx-auto w-full pt-2.5 text-center'
          >
            <DialogTitle className='text-foreground text-[clamp(1.45rem,2.1vw,2rem)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance'>
              {title}
            </DialogTitle>
            <DialogDescription className='text-muted-foreground mt-2 text-[clamp(0.9rem,1.2vw,1rem)] leading-relaxed text-balance'>
              {description}
            </DialogDescription>
          </motion.div>
        </div>

        <div className='px-4 pt-5 sm:px-6 sm:pt-5 max-[899px]:px-4 max-[899px]:pb-4'>{children}</div>
        {footer ? (
          <div className='shrink-0 bg-background px-5 pt-4 pb-4 sm:px-6 max-[899px]:border-t max-[899px]:border-border/70 max-[899px]:pt-3'>
            {footer}
          </div>
        ) : (
          <div aria-hidden className='h-5 shrink-0 max-[899px]:h-3' />
        )}
      </DialogContent>
    </Dialog>
  )
}
