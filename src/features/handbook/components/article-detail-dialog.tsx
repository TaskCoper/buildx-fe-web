'use client'

import { useTranslations } from 'next-intl'

import { Photo } from '@/shared/components/common'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import type { HandbookArticle } from '../types/handbook.types'

interface ArticleDetailDialogProps {
  article: HandbookArticle | null
  onClose: () => void
}

/** Bấm thẻ bài viết tư vấn → mở popup đọc nội dung đầy đủ. */
export function ArticleDetailDialog({ article, onClose }: ArticleDetailDialogProps) {
  const t = useTranslations('handbook.detail')
  const tArticle = useTranslations('handbook.article')

  return (
    <Dialog open={Boolean(article)} onOpenChange={(open) => !open && onClose()}>
      {/* Xem ghi chú ở `template-detail-dialog`: grid mặc định của DialogContent
          bóp hàng khi tràn khiến ảnh đè lên nội dung bài viết. */}
      <DialogContent className='flex flex-col sm:max-w-2xl'>
        {article ? (
          <>
            <DialogHeader>
              <DialogTitle className='pr-8 leading-snug'>{article.title}</DialogTitle>
              <DialogDescription>{tArticle('readingTime', { minutes: article.readingMinutes })}</DialogDescription>
            </DialogHeader>

            <Photo
              className='aspect-16/9 w-full shrink-0 rounded-xl'
              src={article.imageUrl}
              alt={article.title}
              sizes='(max-width: 640px) 100vw, 640px'
            />

            <div className='space-y-4 text-sm leading-relaxed'>
              {article.body.map((section, index) => (
                <section key={section.heading ?? index} className='space-y-2'>
                  {section.heading ? (
                    <h3 className='text-primary font-semibold'>
                      {index + 1}. {section.heading}
                    </h3>
                  ) : null}
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>

            <p className='text-muted-foreground text-xs'>{t('articleNote')}</p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
