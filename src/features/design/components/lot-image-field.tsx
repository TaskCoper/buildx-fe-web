'use client'

import { ImagePlus, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { FieldLabel } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { useApiErrorText } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { uploadImage } from '@/shared/media'
import type { EntranceSide } from '../services/estimate-input.logic'
import { LOT_IMAGE_TYPES, lotImageProblem } from '../services/pipeline.logic'

/** Đọc kích thước ảnh ở trình duyệt; không đọc được (định dạng lạ) thì để BE quyết định. */
async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

/** Vạch đánh dấu cạnh có cửa vào, nằm sát mép khung ảnh. */
const ENTRANCE_BAR: Record<EntranceSide, string> = {
  Top: 'inset-x-6 top-0 h-1 rounded-b-full',
  Bottom: 'inset-x-6 bottom-0 h-1 rounded-t-full',
  Left: 'inset-y-6 left-0 w-1 rounded-r-full',
  Right: 'inset-y-6 right-0 w-1 rounded-l-full'
}

interface LotImageFieldProps {
  estimateId: string
  value: string | null
  onUploaded: (url: string) => void
  onRemove: () => void
  disabled?: boolean
  invalid?: boolean
  /** Cạnh có cửa vào đang áp dụng; có thì tô vạch ở cạnh đó của khung ảnh. */
  entranceSide?: EntranceSide | null
  className?: string
}

/**
 * Ảnh lô đất của luồng bốn chặng (BR-PROJ-015, TDD-PROJ-007 mục C): bắt buộc, JPG/PNG/WebP tối đa 10 MB, tối thiểu
 * 640×480, cạnh dài không quá 3 lần cạnh ngắn. Tải bằng purpose `EstimateLotImage` kèm `estimateId`; ảnh cũ giữ
 * nguyên cho tới khi ảnh mới tải xong (BR-PROJ-002 khoản 8). Kiểm ở đây chỉ để báo sớm, BE đọc lại byte thật.
 */
export function LotImageField({
  estimateId,
  value,
  onUploaded,
  onRemove,
  disabled,
  invalid,
  entranceSide,
  className
}: LotImageFieldProps) {
  const t = useTranslations('design.pipeline.lotImage')
  const apiErrorText = useApiErrorText()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function pick(file: File | undefined) {
    if (!file) return
    try {
      const size = await imageSize(file)
      const problem = lotImageProblem({ type: file.type, size: file.size, width: size?.width, height: size?.height })
      if (problem) {
        toast.error(t(`problem.${problem}`))
        return
      }
      setUploading(true)
      const uploaded = await uploadImage(file, 'EstimateLotImage', { estimateId })
      onUploaded(uploaded.url)
    } catch (error) {
      toast.error(apiErrorText(error, t('uploadError')))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div id='field-inputImageUrl' className={cn('space-y-2', className)}>
      <FieldLabel hint={t('hint')} required>
        {t('label')}
      </FieldLabel>
      {value ? (
        <div className='bg-muted/30 group relative h-56 overflow-hidden rounded-xl border'>
          <Image
            src={value}
            alt={t('label')}
            width={800}
            height={600}
            className='h-56 w-full object-contain p-3'
            unoptimized
          />
          {entranceSide ? <span aria-hidden className={cn('bg-primary absolute', ENTRANCE_BAR[entranceSide])} /> : null}
          {disabled ? null : (
            <div className='absolute top-2 right-2 flex gap-1.5'>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='h-8 rounded-full px-3 text-xs'
                onClick={() => fileRef.current?.click()}
              >
                {t('replace')}
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='icon'
                aria-label={t('remove')}
                onClick={onRemove}
                className='size-8 rounded-full'
              >
                <X className='size-4' />
              </Button>
            </div>
          )}
          {uploading ? (
            <span className='bg-background/70 absolute inset-0 flex items-center justify-center'>
              <Loader2 className='size-5 animate-spin' />
            </span>
          ) : null}
        </div>
      ) : (
        <button
          type='button'
          onClick={() => fileRef.current?.click()}
          disabled={uploading || disabled}
          className={cn(
            'text-muted-foreground hover:bg-muted/50 flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-sm transition-colors',
            invalid && 'border-destructive'
          )}
        >
          {uploading ? <Loader2 className='size-6 animate-spin' /> : <ImagePlus className='size-6' />}
          <span className='text-foreground font-medium'>{uploading ? t('uploading') : t('upload')}</span>
          {/* Điều kiện ảnh chỉ cần khi chọn ảnh; có ảnh rồi thì ẩn cho gọn. */}
          <span className='max-w-sm text-center text-xs text-pretty'>{t('constraints')}</span>
        </button>
      )}
      <input
        ref={fileRef}
        type='file'
        accept={LOT_IMAGE_TYPES.join(',')}
        className='hidden'
        onChange={(event) => void pick(event.target.files?.[0])}
      />
    </div>
  )
}
