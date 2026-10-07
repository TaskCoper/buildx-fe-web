'use client'

import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'

const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files')

interface FileDropZoneProps {
  /** Nhận các tệp vừa thả (đã cắt còn một tệp nếu không `multiple`). Việc kiểm loại / dung lượng do bên gọi lo. */
  onFiles: (files: File[]) => void
  disabled?: boolean
  multiple?: boolean
  className?: string
  children: ReactNode
}

/**
 * Biến một khối giao diện thành vùng KÉO THẢ tệp: kéo tệp từ máy vào là khối hiện khung nét đứt
 * "Thả tệp vào đây", thả xuống là gọi `onFiles`. Chỉ phản ứng với tệp từ máy (không phải chữ hay
 * liên kết đang kéo), nên không cản việc kéo-thả khác trong trang.
 *
 * Bọc ngoài các ô tải đã có sẵn (nút `Upload` của antd) — chúng vẫn bấm để chọn tệp như cũ. Cú thả
 * được bắt ở pha capture và dừng lại tại đây: nếu để lọt xuống `Upload` thì antd lọc tệp theo
 * `accept` và BỎ IM LẶNG tệp sai loại (thả nhầm PDF mà không thấy gì). Qua đây thì mọi tệp đều tới
 * `onFiles`, nơi bên gọi kiểm và báo lỗi như khi bấm chọn tệp.
 */
export function FileDropZone({ onFiles, disabled, multiple, className, children }: FileDropZoneProps) {
  const t = useTranslations('admin.imageUpload')
  const [over, setOver] = useState(false)
  // Kéo ngang qua các phần tử con bắn dragenter/dragleave lồng nhau: đếm để khung không nhấp nháy.
  const depth = useRef(0)

  const active = (event: DragEvent) => !disabled && carriesFiles(event)

  return (
    <div
      className={cn('relative', className)}
      onDragEnter={(event) => {
        if (!active(event)) return
        depth.current += 1
        setOver(true)
      }}
      onDragOver={(event) => {
        if (!active(event)) return
        // Không chặn mặc định thì trình duyệt không cho thả.
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (!active(event)) return
        depth.current -= 1
        if (depth.current <= 0) {
          depth.current = 0
          setOver(false)
        }
      }}
      onDropCapture={(event) => {
        if (!active(event)) return
        depth.current = 0
        setOver(false)
        event.preventDefault()
        event.stopPropagation()
        const files = Array.from(event.dataTransfer.files)
        if (files.length) onFiles(multiple ? files : files.slice(0, 1))
      }}
    >
      {children}
      {over ? (
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-[var(--ant-color-primary,#16a34a)] bg-[var(--admin-tint)] text-sm font-medium text-[var(--ant-color-primary,#16a34a)]'
        >
          {t('dropHint')}
        </div>
      ) : null}
    </div>
  )
}
