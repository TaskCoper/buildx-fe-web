'use client'

import { Check } from 'lucide-react'
import { useState, type CSSProperties } from 'react'

import { Photo } from '@/shared/components/common'
import { cn } from '@/shared/lib/utils'

function ChoiceCardPhoto({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <Photo
      className='choice-card-image choice-card-photo aspect-4/3 w-full transition-transform duration-500'
      imageClassName={cn(
        'transition-[filter,opacity] duration-700 ease-out',
        loaded ? 'opacity-100 blur-0' : 'opacity-45 blur-md'
      )}
      src={src}
      alt={alt}
      sizes='240px'
      onLoad={() => setLoaded(true)}
    />
  )
}

export interface ChoiceOption {
  value: string
  label: string
  /** Ảnh minh họa cho thẻ ảnh chọn nhanh. Bỏ trống khi dùng `compact`. */
  imageUrl?: string
  /** Giá trị cũ còn giữ trên hồ sơ nhưng không chọn mới được (phương án đã ngừng). */
  disabled?: boolean
}

interface ChoiceCardsProps {
  options: readonly ChoiceOption[]
  value: string | null
  onChange: (value: string) => void
  /** Compact pill buttons instead of image cards (Quy mô, Tum). */
  compact?: boolean
  invalid?: boolean
  className?: string
  /** Optional page-opening choreography; omitted everywhere except the documented reveal. */
  entranceStep?: number
}

/**
 * Nút / thẻ ảnh chọn nhanh dùng cho Quy mô, Tum, Kiểu kiến trúc và Phong cách
 * nội thất (mục III.2, trường 4, 5, 7, 8).
 */
export function ChoiceCards({ options, value, onChange, compact, invalid, className, entranceStep }: ChoiceCardsProps) {
  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {options.map((option) => (
          <button
            key={option.value}
            type='button'
            data-compact-choice
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              // Gọn vừa đủ để hàng "Số tầng" (5 nút) và "Tum" (2 nút) nằm chung
              // một dòng như Hình 04.
              'rounded-lg border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
              option.value === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:border-primary/50 hover:bg-muted/60',
              invalid && option.value !== value && 'border-destructive/60',
              option.disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    // `items-stretch` để mọi ô trong cùng một hàng cao bằng nhau.
    <div className={cn('grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3', className)}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            data-image-choice
            data-selected={selected}
            data-style-choice-reveal={entranceStep === undefined ? undefined : 'true'}
            data-entrance-step={entranceStep}
            data-entrance-order={entranceStep === undefined ? undefined : index}
            data-entrance-from={entranceStep === undefined ? undefined : 'soft-scale'}
            style={
              entranceStep === undefined ? undefined : ({ '--choice-reveal-delay': `${index * 85}ms` } as CSSProperties)
            }
            type='button'
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              // `h-full` + cột dọc: mọi thẻ trong lưới cao bằng nhau, ảnh luôn
              // bắt đầu cùng một mốc dù nhãn dài ngắn khác nhau.
              'group flex h-full flex-col overflow-hidden rounded-xl border text-left transition-all',
              selected ? 'border-transparent' : '',
              invalid && !selected && 'border-destructive/60'
            )}
          >
            <div className='relative'>
              {option.imageUrl ? (
                <ChoiceCardPhoto key={option.imageUrl} src={option.imageUrl} alt={option.label} />
              ) : (
                <span className='bg-muted block aspect-4/3 w-full' />
              )}
              {selected ? (
                <span
                  data-choice-check
                  className='bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full'
                >
                  <Check className='size-3.5' />
                </span>
              ) : null}
            </div>
            {/* Khung nhãn cao cố định 2 dòng: nhãn 1 dòng ("Tân cổ điển") và 2
                dòng ("Tối giản (Minimalism)") chiếm cùng chiều cao nên các thẻ
                không so le nhau. */}
            <span className='flex min-h-[3.25rem] items-start px-3 py-2.5'>
              <span className='line-clamp-2 text-sm leading-snug font-medium'>{option.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
