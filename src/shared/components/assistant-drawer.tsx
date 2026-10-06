'use client'

import type { ReactNode } from 'react'
import { Bot, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface AssistantDrawerProps {
  open: boolean
  onClose: () => void
  /** The chat content, injected by the app layer (`features/chatbot`). */
  children: ReactNode
}

/**
 * Right-side AI chatbot drawer shell (Trello-style). Owns the slide-in chrome —
 * title bar and close button — and hosts whatever chat UI the app layer injects.
 * Kept feature-agnostic so `shared/` never imports `features/`.
 */
export function AssistantDrawer({ open, onClose, children }: AssistantDrawerProps) {
  const t = useTranslations('assistant')

  return (
    <>
      {/* Lớp nền tối làm mờ phần còn lại của trang (cả header) khi drawer mở;
          bấm ra ngoài để đóng. */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity ease-out motion-reduce:transition-none',
          open ? 'duration-300' : 'duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        data-assistant-drawer
        aria-hidden={!open}
        className={cn(
          'bg-background/85 fixed top-3 right-3 bottom-3 z-50 flex w-full max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          open ? 'opacity-100 duration-[320ms]' : 'pointer-events-none opacity-0 duration-200'
        )}
        style={{
          transform: open ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(32px, 32px, 0) scale(0.72)'
        }}
      >
        <header className='flex items-center gap-3 border-b px-4 py-3'>
          <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full'>
            <Bot className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold'>{t('title')}</p>
            <p className='text-muted-foreground truncate text-xs'>{t('subtitle')}</p>
          </div>
          <Button variant='ghost' size='icon' onClick={onClose} aria-label={t('close')}>
            <X className='size-4' />
          </Button>
        </header>
        <div className='min-h-0 flex-1 px-3 pt-3 pb-20'>{children}</div>
      </aside>
    </>
  )
}
