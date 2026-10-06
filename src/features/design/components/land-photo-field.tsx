'use client'

import { ImagePlus, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { LAND_PHOTO_ACCEPT, LAND_PHOTO_MAX_BYTES } from '../constants/design.constants'
import type { BuildingType } from '../types/design.types'
import { FieldLabel } from '@/shared/components/common'

interface LandPhotoFieldProps {
  value: string | null
  onChange: (value: string | null) => void
  /** Căn hộ đổi nhãn thành "Ảnh mặt bằng căn hộ hiện trạng" (mục III.2, trường 1). */
  buildingType: BuildingType | null
  invalid?: boolean
}

/**
 * Trường 1 — Ảnh lô đất (mục III.2).
 *
 * Chụp ảnh hoặc kéo-thả / bấm tải ảnh; preview ngay sau khi tải.
 * JPG, PNG, HEIC tối đa 10MB. Không có ô nhập kích thước — hình dạng và tỷ lệ
 * lô đất do AI tự nhận diện từ ảnh.
 */
export function LandPhotoField({ value, onChange, buildingType, invalid }: LandPhotoFieldProps) {
  const t = useTranslations('design.input.landPhoto')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorPulse, setErrorPulse] = useState(false)
  const dragDepthRef = useRef(0)

  const isApartment = buildingType === 'apartment'
  const label = isApartment ? t('labelApartment') : t('label')
  const hint = isApartment ? t('hintApartment') : t('hint')
  const uploadComplete = uploadPercent >= 100 || (Boolean(value) && previewUrl === null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function reject(message: string) {
    setError(message)
    setErrorPulse(false)
    window.requestAnimationFrame(() => setErrorPulse(true))
    window.setTimeout(() => setErrorPulse(false), 420)
  }

  function accept(file: File | undefined) {
    if (!file) return
    if (!LAND_PHOTO_ACCEPT.includes(file.type as (typeof LAND_PHOTO_ACCEPT)[number])) {
      reject(t('errorType'))
      return
    }
    if (file.size > LAND_PHOTO_MAX_BYTES) {
      reject(t('errorSize'))
      return
    }
    setError(null)
    setUploadPercent(1)
    setPreviewUrl(URL.createObjectURL(file))
    // Data URL chứ không phải `URL.createObjectURL`: bản nháp Bước 1 được lưu
    // lại (mục III.2), mà blob URL chết ngay khi tải lại trang — mở lại nháp sẽ
    // thấy ảnh vỡ. Ảnh thật sẽ do endpoint upload trả URL khi backend sẵn sàng.
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable) setUploadPercent(Math.max(1, Math.round((event.loaded / event.total) * 92)))
    }
    reader.onload = () => {
      setUploadPercent(100)
      onChange(String(reader.result))
      window.setTimeout(() => setPreviewUrl(null), 380)
    }
    reader.onerror = () => {
      setPreviewUrl(null)
      setUploadPercent(0)
      reject(t('errorType'))
    }
    reader.readAsDataURL(file)
  }

  function remove() {
    // Xóa giá trị form và preview trong cùng một nhịp. Trì hoãn `onChange`
    // khiến ảnh cũ còn là nguồn dữ liệu hợp lệ trong lúc animation chạy và có
    // thể bị một render khác ghi trở lại. Reset input để người dùng cũng có thể
    // chọn lại đúng file vừa xóa (trình duyệt không phát `change` nếu value cũ
    // vẫn còn và người dùng chọn cùng một file).
    onChange(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setUploadPercent(0)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className='relative space-y-2'>
      <FieldLabel htmlFor='land-photo' hint={hint} required>
        {label}
      </FieldLabel>

      {value || previewUrl ? (
        <div data-photo-preview className='group relative h-56 overflow-hidden rounded-xl border'>
          <Image
            src={previewUrl ?? value ?? ''}
            alt={label}
            width={800}
            height={600}
            data-upload-complete={uploadComplete}
            className='h-56 w-full object-cover transition-[opacity,filter,transform] duration-300'
            style={
              uploadPercent > 0 && uploadPercent < 100
                ? {
                    opacity: 0.48 + uploadPercent * 0.0052,
                    filter: `blur(${Math.max(0, 9 - uploadPercent * 0.09)}px)`
                  }
                : undefined
            }
            unoptimized
          />
          <span
            aria-hidden
            className='pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15'
          />
          {uploadComplete ? (
            <Button
              type='button'
              variant='secondary'
              size='icon'
              aria-label={t('remove')}
              onClick={remove}
              className='absolute top-2 right-2 rounded-full opacity-60 transition-opacity group-hover:opacity-100'
            >
              <X className='size-4' />
            </Button>
          ) : null}
          {uploadPercent > 0 && uploadPercent < 100 ? (
            <span className='bg-muted absolute right-0 bottom-0 left-0 h-1 overflow-hidden'>
              <span
                className='bg-primary block h-full transition-[width] duration-150'
                style={{ width: `${uploadPercent}%` }}
              />
            </span>
          ) : null}
        </div>
      ) : (
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            dragDepthRef.current += 1
            setDragging(true)
          }}
          onDragLeave={() => {
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
            if (dragDepthRef.current === 0) setDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            dragDepthRef.current = 0
            setDragging(false)
            accept(e.dataTransfer.files[0])
          }}
          data-photo-dropzone
          data-dragging={dragging}
          data-uploading={uploadPercent > 0 && uploadPercent < 100}
          data-error={Boolean(error)}
          data-error-pulse={errorPulse}
          className={cn(
            'flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-colors',
            dragging && 'border-primary bg-primary/5',
            invalid || error ? 'border-destructive' : 'border-border hover:border-primary/50 hover:bg-muted/40'
          )}
        >
          <ImagePlus data-photo-icon className='text-muted-foreground size-8' />
          <span className='text-sm font-medium'>{t('cta')}</span>
          <span className='text-muted-foreground text-xs'>{t('constraints')}</span>
        </button>
      )}

      <input
        ref={inputRef}
        id='land-photo'
        type='file'
        accept={LAND_PHOTO_ACCEPT.join(',')}
        capture='environment'
        className='sr-only'
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {error ? (
        <p data-upload-error className='text-destructive text-sm'>
          {error}
        </p>
      ) : null}
    </div>
  )
}
