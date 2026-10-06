'use client'

import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { useFavoriteStore } from './favorite.store'
import type { FavoriteInput } from './favorite.types'
import { useIsFavorite } from './use-favorite'

interface FavoriteButtonProps {
  /** Everything the account screen needs to render this item later (mục IV). */
  item: FavoriteInput
  className?: string
  /** `icon` for the ♥ overlaid on a card; `full` for a labelled button. */
  variant?: 'icon' | 'full'
}

/**
 * Nút ♥ Yêu thích dùng chung ở mọi vị trí (mục VI): bấm để lưu, bấm lại để bỏ.
 * Trạng thái hiển thị nhất quán trên mọi màn hình vì cùng đọc `useFavoriteStore`.
 */
export function FavoriteButton({ item, className, variant = 'icon' }: FavoriteButtonProps) {
  const t = useTranslations('favorite')
  const active = useIsFavorite(item.templateId)
  const toggle = useFavoriteStore((s) => s.toggle)
  const [pulse, setPulse] = useState<'save' | 'remove' | null>(null)

  const actionLabel = active ? t('remove') : t('add')
  const visualLabel = variant === 'full' && active ? t('saved') : actionLabel

  return (
    <Button
      type='button'
      variant={variant === 'icon' ? 'ghost' : 'outline'}
      size={variant === 'icon' ? 'icon' : 'sm'}
      aria-pressed={active}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const nextActive = !active
        toggle(item)
        setPulse(nextActive ? 'save' : 'remove')
        window.setTimeout(() => setPulse(null), 520)

        if (nextActive) {
          toast.success(t('savedToast'), { description: t('viewSaved') })
        } else {
          toast(t('removedToast'), {
            action: {
              label: t('undo'),
              onClick: () => toggle(item)
            }
          })
        }
      }}
      data-favorite-button
      data-favorite-variant={variant}
      data-favorite-active={active}
      data-favorite-pulse={pulse ?? 'idle'}
      className={cn(variant === 'icon' && 'relative overflow-visible rounded-full', className)}
    >
      <span data-favorite-heart className='relative grid size-4 place-items-center' aria-hidden>
        <Heart className='absolute inset-0 size-4 transition-colors' />
        <span
          data-favorite-fill
          className='absolute inset-0 overflow-hidden'
          style={{ clipPath: active ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)' }}
        >
          <Heart className='fill-primary text-primary size-4' />
        </span>
        {variant === 'icon'
          ? Array.from({ length: 4 }).map((_, index) => (
              <span key={index} data-favorite-particle data-index={index} aria-hidden />
            ))
          : null}
      </span>
      {variant === 'full' ? (
        <span key={visualLabel} data-favorite-label className='inline-block'>
          {visualLabel}
        </span>
      ) : null}
    </Button>
  )
}
