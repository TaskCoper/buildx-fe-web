'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface SpecialtyFilterOption {
  id: string
  label: string
}

interface SpecialtyFilterProps {
  value: string
  onValueChange: (value: string) => void
  options: readonly SpecialtyFilterOption[]
  /** Giá trị của mục "Tất cả chuyên môn". */
  allValue: string
  allLabel: string
  ariaLabel: string
  className?: string
}

/**
 * Bảng lọc chuyên môn của trang Tư vấn 1:1 — dựng riêng trên `@radix-ui/react-select`
 * (không đụng tới `shared/components/ui/select`, primitive đó còn dùng ở nhiều
 * form khác) vì cần một bộ hiệu ứng đặc thù mà bản dùng chung không có:
 *
 * - Nút: mũi tên lật ¼ vòng + viền xanh SUỐT lúc mở (mục 1).
 * - Bảng: nở từ mép trên ngay dưới nút (scaleY từ gốc trên), đóng nhanh hơn mở
 *   (mục 2) — CSS keyframe theo `data-state` (`.specialty-panel`), vì bản
 *   `@radix-ui/react-select` đang dùng không có `forceMount` để nhường hẳn
 *   việc mount/unmount cho Motion như các primitive Radix khác.
 * - Dòng đang chọn: một dải nền mang `layoutId` DUY NHẤT — đổi mục thì Motion
 *   tự "trượt" dải đó từ dòng cũ sang dòng mới; dấu tick mờ ở dòng cũ, nảy nhẹ
 *   ở dòng mới (mục 3).
 * - Điều hướng bàn phím (↑↓/Enter/Esc), bấm ra ngoài, đóng khi cuộn — toàn bộ
 *   đến từ chính Radix Select, không viết lại (mục 4, 5).
 *
 * ★ Chọn một mục KHÁC mục đang chọn: Radix tự đóng panel ngay lập tức, cắt
 * ngang dải nền + tick đang chạy. `pendingCloseRef` hoãn lệnh đóng thật
 * (`setOpen(false)`) lại `SELECTION_CLOSE_DELAY` để dải nền trượt dọc + tick
 * mờ/nảy kịp chạy hết trước khi panel biến mất; đóng vì lý do khác (Esc, bấm
 * ra ngoài) vẫn đóng ngay, không có gì để chờ.
 */
const SELECTION_CLOSE_DELAY = 420

export function SpecialtyFilter({
  value,
  onValueChange,
  options,
  allValue,
  allLabel,
  ariaLabel,
  className
}: SpecialtyFilterProps) {
  const [open, setOpen] = useState(false)
  const pendingCloseRef = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useReducedMotion()
  const selectedLabel =
    value === allValue ? allLabel : (options.find((option) => option.id === value)?.label ?? allLabel)
  const selectedIndex = value === allValue ? 0 : Math.max(0, options.findIndex((option) => option.id === value) + 1)

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    []
  )

  const handleValueChange = (next: string) => {
    pendingCloseRef.current = next !== value
    onValueChange(next)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      pendingCloseRef.current = false
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
      setOpen(true)
      return
    }
    if (pendingCloseRef.current) {
      if (!closeTimerRef.current) {
        closeTimerRef.current = setTimeout(
          () => {
            pendingCloseRef.current = false
            closeTimerRef.current = null
            setOpen(false)
          },
          reduceMotion ? 0 : SELECTION_CLOSE_DELAY
        )
      }
      return
    }
    setOpen(false)
  }

  return (
    <SelectPrimitive.Root value={value} onValueChange={handleValueChange} open={open} onOpenChange={handleOpenChange}>
      <SelectPrimitive.Trigger asChild>
        <button
          type='button'
          aria-label={ariaLabel}
          className={cn(
            'bg-card flex h-9 w-48 items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-sm transition-colors outline-none',
            open ? 'border-ring' : 'border-input hover:border-foreground',
            className
          )}
        >
          {/* Đổi mục thì nhãn nút MỜ CHÉO — nhãn cũ mờ đi, nhãn mới mờ vào,
              chồng lên cùng một chỗ (mục 4). */}
          <span className='relative min-w-0 flex-1 text-left'>
            <AnimatePresence mode='popLayout' initial={false}>
              <motion.span
                key={selectedLabel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className='block truncate'
              >
                {selectedLabel}
              </motion.span>
            </AnimatePresence>
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className='shrink-0'>
            <ChevronDown className={cn('size-4', open ? 'text-primary' : 'text-muted-foreground')} />
          </motion.span>
        </button>
      </SelectPrimitive.Trigger>

      {/* `@radix-ui/react-select` ở bản đang dùng không có `forceMount`, nên
          không thể nhường việc mount/unmount cho `AnimatePresence` như các
          primitive Radix khác — mở/đóng panel dùng CSS keyframe theo
          `data-state` (`.specialty-panel` trong `globals.css`), Radix tự đợi
          animation xong rồi mới gỡ khỏi DOM. Bên trong vẫn dùng Motion cho
          từng dòng và dấu tick vì đó là hiệu ứng tự tay điều khiển, không
          phụ thuộc thời điểm unmount. */}
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position='popper'
          align='start'
          sideOffset={6}
          onCloseAutoFocus={(event) => event.preventDefault()}
          // Tên chuyên môn từ API có thể rất dài: bảng rộng bằng nút nhưng tối thiểu 16rem, tối đa 22rem; mỗi dòng cao cố định 32px
          // và cắt "…" (rê chuột xem đủ) để dải nền trượt theo chỉ số dòng không bao giờ lệch.
          style={{ minWidth: 'max(var(--radix-select-trigger-width), 16rem)', maxWidth: 'min(22rem, 92vw)' }}
          className='specialty-panel bg-popover text-popover-foreground z-50 overflow-hidden rounded-md border shadow-lg'
        >
          <SelectPrimitive.Viewport className='relative p-1'>
            <motion.span
              aria-hidden='true'
              initial={false}
              animate={{ y: selectedIndex * 32 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 440, damping: 38, mass: 0.75 }}
              className='bg-accent pointer-events-none absolute top-1 right-1 left-1 h-8 rounded-sm'
            />
            <SpecialtyRow value={allValue} label={allLabel} selected={value === allValue} index={0} />
            {options.map((option, index) => (
              <SpecialtyRow
                key={option.id}
                value={option.id}
                label={option.label}
                selected={value === option.id}
                index={index + 1}
              />
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

function SpecialtyRow({
  value,
  label,
  selected,
  index
}: {
  value: string
  label: string
  selected: boolean
  index: number
}) {
  return (
    <SelectPrimitive.Item value={value} asChild>
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.12, delay: index * 0.025 }}
        className={cn(
          'relative flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm outline-none select-none',
          !selected && 'hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted'
        )}
      >
        <SelectPrimitive.ItemText>
          <span className='block min-w-0 truncate' title={label}>
            {label}
          </span>
        </SelectPrimitive.ItemText>
        <span className='ml-auto flex size-3.5 shrink-0 items-center justify-center'>
          <AnimatePresence initial={false}>
            {selected ? (
              <motion.span
                key='tick'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Check className='text-primary size-4' />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </motion.div>
    </SelectPrimitive.Item>
  )
}
