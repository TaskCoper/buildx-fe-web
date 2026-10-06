'use client'

import { Photo } from '@/shared/components/common'
import { cn } from '@/shared/lib/utils'
import { useHandbookReadStore } from '../store/handbook-read.store'
import type { HandbookArticle } from '../types/handbook.types'
import { ReadBadge } from './read-badge'

interface ArticleCardProps {
  article: HandbookArticle
  className?: string
  /** Bấm thẻ mở popup đọc bài viết. */
  onOpen?: (article: HandbookArticle) => void
}

/** Bài viết tư vấn tĩnh — chọn theo loại công trình / kiểu kiến trúc đã chọn. */
export function ArticleCard({ article, className, onOpen }: ArticleCardProps) {
  const markRead = useHandbookReadStore((s) => s.markRead)

  return (
    <article
      className={cn(
        'bg-card relative flex gap-3 overflow-hidden rounded-xl border p-3',
        onOpen && 'hover:border-primary/50 transition-colors',
        className
      )}
    >
      <Photo className='size-20 shrink-0 rounded-lg' src={article.imageUrl} alt={article.title} sizes='80px' />
      <div className='min-w-0 space-y-1'>
        <h3 className='line-clamp-2 text-sm font-semibold'>{article.title}</h3>
        <ReadBadge id={article.id} />
      </div>

      {onOpen ? (
        <button
          type='button'
          onClick={() => {
            markRead(article.id)
            onOpen(article)
          }}
          className='focus-visible:ring-ring absolute inset-0 focus-visible:ring-2 focus-visible:outline-none'
        >
          <span className='sr-only'>{article.title}</span>
        </button>
      ) : null}
    </article>
  )
}
