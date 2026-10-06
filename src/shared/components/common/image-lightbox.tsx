'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface LightboxPhoto {
  url: string
  caption?: string
}

interface ImageLightboxProps {
  photos: readonly LightboxPhoto[]
  /** Chỉ số ảnh đang xem; `null` = đóng. */
  index: number | null
  onClose: () => void
  onNavigate: (nextIndex: number) => void
  closeLabel?: string
  previousLabel?: string
  nextLabel?: string
}

/**
 * Hộp xem ảnh lớn: bấm ảnh ở trang → phóng ra toàn màn hình. Esc / bấm nền / nút X để
 * đóng, mũi tên (phím hoặc nút) để chuyển ảnh.
 *
 * Vẽ qua portal ra `document.body` và `position: fixed` nên mở ra không tác động gì tới
 * bố cục trang bên dưới; ảnh giữ nguyên tỉ lệ (`object-contain`), không bao giờ tràn màn hình.
 */
export function ImageLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  closeLabel = 'Close',
  previousLabel = 'Previous',
  nextLabel = 'Next'
}: ImageLightboxProps) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (index === null) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (photos.length < 2) return
      if (event.key === 'ArrowLeft') onNavigate((index - 1 + photos.length) % photos.length)
      if (event.key === 'ArrowRight') onNavigate((index + 1) % photos.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, photos.length, onClose, onNavigate])

  // Mở ra thì khoá cuộn nền để trang bên dưới không nhúc nhích.
  useEffect(() => {
    if (index === null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [index])

  const photo = index !== null ? photos[index] : undefined
  // Hộp chỉ mở sau một cú bấm (phía client) nên `document` luôn có; SSR thì `index` là null.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {photo ? (
        <motion.div
          role='dialog'
          aria-modal='true'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          className='fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8'
        >
          <motion.figure
            key={index}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className='relative flex max-h-full max-w-full flex-col items-center'
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh có thể là URL ngoài, cần đo theo kích thước gốc */}
            <img
              src={photo.url}
              alt={photo.caption ?? ''}
              className='max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl'
            />
            {photo.caption ? (
              <figcaption className='mt-3 max-w-full text-center text-sm font-medium text-white'>
                {photo.caption}
              </figcaption>
            ) : null}
          </motion.figure>

          <button
            type='button'
            onClick={onClose}
            aria-label={closeLabel}
            className='absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25'
          >
            <X className='size-5' />
          </button>

          {photos.length > 1 && index !== null ? (
            <>
              <button
                type='button'
                onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
                aria-label={previousLabel}
                className='absolute left-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:left-6'
              >
                <ChevronLeft className='size-5' />
              </button>
              <button
                type='button'
                onClick={() => onNavigate((index + 1) % photos.length)}
                aria-label={nextLabel}
                className='absolute right-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:right-6'
              >
                <ChevronRight className='size-5' />
              </button>
            </>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
