'use client'

import { Heart } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { EmptyState, Photo } from '@/shared/components/common'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { useFavorites, type FavoriteEntry } from '@/shared/favorite'
import { formatDisplayDate } from '@/shared/utils'

/**
 * Tab "Dự án yêu thích" ở trang Tài khoản (mục IX, Hình 18).
 *
 * Lưới 2 cột thẻ mẫu đã ♥: ảnh kèm nút tim ĐỎ góc phải, tên mẫu, 2 tag và dòng
 * "Lưu ngày {ngày}". Bấm thẻ mở chi tiết mẫu; bấm tim bỏ lưu — thẻ biến mất
 * khỏi danh sách ngay.
 */
export function FavoriteGrid() {
  const t = useTranslations('account.favorites')
  const locale = useLocale() as Locale
  const { favorites, remove } = useFavorites()
  const [selected, setSelected] = useState<FavoriteEntry | null>(null)

  if (favorites.length === 0) {
    return <EmptyState icon={Heart} title={t('empty.title')} description={t('empty.description')} />
  }

  return (
    <>
      {/* Hình 18: lưới 2 cột, không phải 3. */}
      <div className='grid gap-4 sm:grid-cols-2'>
        {favorites.map((entry) => (
          <article
            key={entry.templateId}
            className='bg-card hover:border-primary/50 relative overflow-hidden rounded-xl border transition-colors'
          >
            <div className='relative'>
              <Photo className='aspect-4/3 w-full' src={entry.imageUrl} alt={entry.name} />
              <Button
                variant='ghost'
                size='icon'
                aria-label={t('remove')}
                title={t('remove')}
                onClick={() => remove(entry.templateId)}
                className='bg-background hover:bg-background absolute top-2 right-2 z-10 rounded-full shadow-sm'
              >
                {/* Hình 18: tim ĐỎ đặc — quy ước "đã lưu", không dùng màu thương hiệu. */}
                <Heart className='fill-destructive text-destructive size-4' />
              </Button>
            </div>

            <div className='space-y-2 p-3'>
              <h3 className='line-clamp-1 text-sm font-semibold'>{entry.name}</h3>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex flex-wrap gap-1.5'>
                  <Badge variant='secondary'>{entry.tagLabel}</Badge>
                  <Badge variant='outline'>{t(`kind.${entry.kind}`)}</Badge>
                </div>
                <span className='text-muted-foreground shrink-0 text-xs'>
                  {t('savedAt', { date: formatDisplayDate(entry.savedAt, locale) })}
                </span>
              </div>
            </div>

            <button
              type='button'
              onClick={() => setSelected(entry)}
              className='focus-visible:ring-ring absolute inset-0 focus-visible:ring-2 focus-visible:outline-none'
            >
              <span className='sr-only'>{entry.name}</span>
            </button>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className='sm:max-w-2xl'>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <Photo
                className='aspect-4/3 w-full rounded-xl'
                src={selected.imageUrl}
                alt={selected.name}
                sizes='(max-width: 640px) 100vw, 640px'
              />
              <div className='flex flex-wrap items-center gap-2'>
                <Badge>{selected.tagLabel}</Badge>
                <Badge variant='secondary'>{t(`kind.${selected.kind}`)}</Badge>
                <span className='text-muted-foreground text-xs'>
                  {t('savedAt', { date: formatDisplayDate(selected.savedAt, locale) })}
                </span>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
