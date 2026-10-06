'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { FieldLabel } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'
import { useSubmitContractorReview } from '../hooks/use-invitations'
import { REVIEW_COMMENT_MAX_LENGTH, createReviewSchema, type ReviewFormValues } from '../schemas/review.schema'

interface ContractorReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** Lời mời được đánh giá — mỗi lời mời chỉ một lần. */
  invitationId: string
  contractorName: string
}

const STARS = [1, 2, 3, 4, 5] as const

/**
 * Form đánh giá nhà thầu sau khi lời mời hoàn tất.
 *
 * Bản mô tả không vẽ màn này: mục "Còn thiếu / chờ chốt" ghi rằng S09 quảng cáo
 * "chỉ khách đã làm việc qua SAVICO mới được đánh giá" nhưng không có chỗ để
 * đánh giá. Điều kiện mở form vì thế lấy đúng câu quảng cáo đó — nút chỉ hiện
 * trên thẻ nhà thầu đã ở nấc "Hoàn tất" của S18, và mock chặn lại lần nữa ở
 * `submitReview` để khi nối API thật backend chỉ việc lặp lại đúng luật.
 *
 * Chỉ thu MỘT con số sao: các màn S12/S13/S15/S18 đều chỉ hiển thị một giá trị
 * đánh giá, nên không tự bịa thêm tiêu chí chấm điểm nào.
 */
export function ContractorReviewDialog({
  open,
  onOpenChange,
  projectId,
  invitationId,
  contractorName
}: ContractorReviewDialogProps) {
  const t = useTranslations('contractors.rating')
  const tv = useTranslations('validation')
  const submitReview = useSubmitContractorReview(projectId)

  const schema = useMemo(
    () =>
      createReviewSchema({
        ratingRequired: t('ratingRequired'),
        commentMaxLength: tv('maxLength', { max: REVIEW_COMMENT_MAX_LENGTH })
      }),
    [t, tv]
  )

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0, comment: '' }
  })

  // Mở lại phải sạch lựa chọn của lần trước.
  const { reset } = form
  useEffect(() => {
    if (open) reset({ rating: 0, comment: '' })
  }, [open, reset])

  function onSubmit(values: ReviewFormValues) {
    submitReview.mutate(
      { invitationId, rating: values.rating, comment: values.comment },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('title', { name: contractorName })}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='rating'
              render={({ field }) => (
                <FormItem>
                  <FieldLabel hint={t('ratingHint')} required>
                    {t('ratingLabel')}
                  </FieldLabel>
                  <FormControl>
                    {/* Radio group thủ công: mỗi sao là một nút, để bàn phím
                        chọn được và trình đọc màn hình đọc ra "n sao". */}
                    <div role='radiogroup' aria-label={t('ratingLabel')} className='flex items-center gap-1'>
                      {STARS.map((star) => (
                        <button
                          key={star}
                          type='button'
                          role='radio'
                          aria-checked={field.value === star}
                          aria-label={t('starLabel', { count: star })}
                          onClick={() => field.onChange(star)}
                          className='focus-visible:ring-ring cursor-pointer rounded p-1 focus-visible:ring-2 focus-visible:outline-none'
                        >
                          <Star
                            className={cn(
                              'size-8 transition-colors',
                              star <= field.value ? 'fill-warning text-warning' : 'text-muted-foreground/40'
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='comment'
              render={({ field }) => (
                <FormItem>
                  <FieldLabel htmlFor='review-comment' hint={t('commentHint')}>
                    {t('commentLabel')}
                  </FieldLabel>
                  <FormControl>
                    <Textarea
                      id='review-comment'
                      rows={3}
                      placeholder={t('commentPlaceholder')}
                      maxLength={REVIEW_COMMENT_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type='submit' disabled={submitReview.isPending}>
                {t('submit')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
