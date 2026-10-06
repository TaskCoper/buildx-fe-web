'use client'

import { Bot, LayoutGrid } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'

interface AssistantDockProps {
  /** Whether the AI chatbot panel is open. */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Floating, bottom-centered toggle group (multi-select). "Interface" is the base
 * view — always active and impossible to deselect. "AI Chatbot" is an
 * independent toggle: turning it on opens the right-side chat panel
 * (Trello-drawer style) while "Interface" stays lit alongside it.
 */
export function AssistantDock({ open, onOpenChange }: AssistantDockProps) {
  const t = useTranslations('assistant')

  const segment = (active: boolean) =>
    cn(
      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
      active ? 'glass-selected text-foreground' : 'text-muted-foreground hover:text-foreground'
    )

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4'>
      <div className='glass-panel pointer-events-auto flex items-center gap-1 rounded-full p-1'>
        {/* Always-on base view — clicking it never deselects. */}
        <button type='button' aria-pressed disabled className={cn(segment(true), 'cursor-default')}>
          <LayoutGrid className='size-4' />
          {t('uiTab')}
        </button>
        <button type='button' aria-pressed={open} onClick={() => onOpenChange(!open)} className={segment(open)}>
          <Bot className='size-4' />
          {t('chatTab')}
        </button>
      </div>
    </div>
  )
}
