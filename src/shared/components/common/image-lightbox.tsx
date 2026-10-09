'use client'

import { ChevronLeft, ChevronRight, Loader2, Maximize, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { getImageProps } from 'next/image'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'

import { canOptimizeImage } from '@/shared/lib/image-src'
import { cn } from '@/shared/lib/utils'

export interface LightboxPhoto {
  /** Ảnh nét để xem và zoom. */
  url: string
  caption?: string
  /**
   * Ảnh nhỏ của CHÍNH ảnh này mà trang đã tải sẵn (ví dụ bản đang hiện ở khung xem). Hiện ngay khi mở hộp, trong lúc `url`
   * còn tải, nên người xem không phải nhìn khung trống.
   */
  placeholderUrl?: string
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

const MIN_SCALE = 1
const MAX_SCALE = 8

/** Khung xem cố định theo màn hình: ảnh nhỏ và ảnh nét cùng nằm trong khung này nên đổi ảnh không làm bố cục nhảy. */
const STAGE_WIDTH = 'min(94vw, 1500px)'
const STAGE_HEIGHT = '84vh'

/** Cỡ rộng (px) xin bộ tối ưu của Next cho ảnh công khai trong hộp xem ảnh. */
const OPTIMIZED_WIDTH = 1920

/**
 * Ảnh công khai (public/ hoặc host đã khai báo) đi qua bộ tối ưu của Next để về AVIF/WebP đúng cỡ thay vì tải bản gốc;
 * ảnh khác (ví dụ route nội dung cần cookie, đã được trang đổi cỡ riêng) giữ nguyên.
 */
function resolvePhotoUrl(url: string): string {
  if (!canOptimizeImage(url)) return url
  const { src, srcSet } = getImageProps({ src: url, alt: '', width: OPTIMIZED_WIDTH, height: OPTIMIZED_WIDTH }).props
  // Với `width` cố định, `src` là bản 2x (gấp đôi cỡ): lấy bản 1x đầu tiên trong `srcSet` cho đúng cỡ đã định.
  return srcSet?.split(',')[0]?.trim().split(' ')[0] || src
}

/** Tải trước một ảnh vào bộ nhớ đệm của trình duyệt (rê chuột vào nút phóng to, ảnh kế bên…). */
export function preloadImage(url: string | undefined | null) {
  if (!url || typeof window === 'undefined') return
  const image = new Image()
  image.decoding = 'async'
  image.src = resolvePhotoUrl(url)
}

/**
 * Hộp xem ảnh lớn, dùng chung toàn site khách: bấm ảnh ở trang → phóng ra toàn màn hình, có zoom như hộp xem ảnh của khu
 * admin — lăn chuột / nhấp đúp / véo hai ngón để phóng, kéo để di chuyển ảnh, thanh công cụ phóng to · thu nhỏ · xoay · đặt
 * lại, mũi tên chuyển ảnh. Esc / bấm nền / nút X để đóng.
 *
 * Vẽ qua portal ra `document.body` và `position: fixed` nên mở ra không tác động gì tới bố cục trang bên dưới.
 */
export function ImageLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  closeLabel,
  previousLabel,
  nextLabel
}: ImageLightboxProps) {
  const t = useTranslations('common.imageViewer')
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

  // Tải sẵn ảnh liền trước và liền sau để bấm mũi tên là có ngay.
  useEffect(() => {
    if (index === null || photos.length < 2) return
    preloadImage(photos[(index + 1) % photos.length]?.url)
    preloadImage(photos[(index - 1 + photos.length) % photos.length]?.url)
  }, [index, photos])

  const photo = index !== null ? photos[index] : undefined
  // Hộp chỉ mở sau một cú bấm (phía client) nên `document` luôn có; SSR thì `index` là null.
  if (typeof document === 'undefined') return null

  const close = closeLabel ?? t('close')
  const previous = previousLabel ?? t('previous')
  const next = nextLabel ?? t('next')

  return createPortal(
    <AnimatePresence>
      {photo && index !== null ? (
        <motion.div
          role='dialog'
          aria-modal='true'
          aria-label={photo.caption ?? t('title')}
          data-image-lightbox
          // Các popup tự bật (CTA của trang mẫu…) dò `[role=dialog][data-state=open]` để không mở đè lên hộp đang mở.
          data-state='open'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          className='pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm'
        >
          {/* `key` theo ảnh: chuyển ảnh là dựng lại khung zoom nên mức phóng và góc xoay về mặc định. */}
          <LightboxStage key={index} photo={photo} />

          <div className='pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4'>
            <span
              data-lightbox-counter
              className={cn(
                'rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white tabular-nums ring-1 ring-white/25 backdrop-blur',
                photos.length < 2 && 'invisible'
              )}
            >
              {t('counter', { current: index + 1, total: photos.length })}
            </span>
            {photo.caption ? (
              <p className='max-w-[60vw] truncate pt-1.5 text-center text-sm font-medium text-white'>{photo.caption}</p>
            ) : (
              <span />
            )}
            <button
              type='button'
              onClick={onClose}
              aria-label={close}
              className='pointer-events-auto flex size-10 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none'
            >
              <X className='size-5' />
            </button>
          </div>

          {photos.length > 1 ? (
            <>
              <button
                type='button'
                data-lightbox-prev
                onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
                aria-label={previous}
                className='absolute left-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none sm:left-6'
              >
                <ChevronLeft className='size-5' />
              </button>
              <button
                type='button'
                data-lightbox-next
                onClick={() => onNavigate((index + 1) % photos.length)}
                aria-label={next}
                className='absolute right-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none sm:right-6'
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

type LoadState = 'loading' | 'ready' | 'failed'

/**
 * Khung zoom của MỘT ảnh. Ảnh nhỏ (nếu có) nằm dưới, ảnh nét nằm trên và hiện dần khi tải xong; cả hai cùng kích thước nên
 * không có cú nhảy. Xoay bằng cách đổi chỗ chiều rộng và chiều cao của lớp chứa rồi xoay nó, để khung zoom bên ngoài không
 * đổi kích thước.
 */
function LightboxStage({ photo }: { photo: LightboxPhoto }) {
  const t = useTranslations('common.imageViewer')
  const fullUrl = resolvePhotoUrl(photo.url)
  const placeholderUrl = photo.placeholderUrl ? resolvePhotoUrl(photo.placeholderUrl) : undefined
  const controls = useRef<ReactZoomPanPinchContentRef>(null)
  const [scale, setScale] = useState(MIN_SCALE)
  const [turns, setTurns] = useState(0)
  const [load, setLoad] = useState<LoadState>('loading')
  const sideways = turns % 2 !== 0
  const hasPlaceholder = Boolean(placeholderUrl) && placeholderUrl !== fullUrl

  const reset = () => {
    controls.current?.resetTransform()
    setTurns(0)
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === '+' || event.key === '=') controls.current?.zoomIn()
      else if (event.key === '-' || event.key === '_') controls.current?.zoomOut()
      else if (event.key === '0') {
        controls.current?.resetTransform()
        setTurns(0)
      } else if (event.key === 'r' || event.key === 'R') setTurns((value) => value + (event.shiftKey ? -1 : 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const toolButton =
    'flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35'

  return (
    <>
      <TransformWrapper
        ref={controls}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        centerOnInit
        limitToBounds
        wheel={{ step: 0.25 }}
        doubleClick={{ mode: 'toggle', step: 1.4 }}
        panning={{ velocityDisabled: true }}
        onTransform={(ref) => setScale(ref.state.scale)}
      >
        <TransformComponent
          wrapperStyle={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
          contentStyle={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
        >
          <div className='relative size-full' data-lightbox-stage>
            <div
              className='absolute top-1/2 left-1/2 transition-transform duration-200 motion-reduce:transition-none'
              style={{
                width: sideways ? STAGE_HEIGHT : STAGE_WIDTH,
                height: sideways ? STAGE_WIDTH : STAGE_HEIGHT,
                transform: `translate(-50%, -50%) rotate(${turns * 90}deg)`
              }}
            >
              {hasPlaceholder ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh có thể là route nội dung cần cookie hoặc URL ngoài
                <img
                  src={placeholderUrl}
                  alt=''
                  draggable={false}
                  className='absolute inset-0 size-full object-contain select-none'
                />
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element -- như trên */}
              <img
                src={fullUrl}
                alt={photo.caption ?? ''}
                draggable={false}
                data-lightbox-image
                onLoad={() => setLoad('ready')}
                onError={() => setLoad('failed')}
                ref={(img) => {
                  if (img?.complete && img.naturalWidth > 0) setLoad('ready')
                }}
                className={cn(
                  'absolute inset-0 size-full object-contain transition-opacity duration-200 select-none',
                  load === 'ready' || !hasPlaceholder ? 'opacity-100' : 'opacity-0'
                )}
              />
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>

      {load === 'loading' ? (
        <span
          role='status'
          className='pointer-events-none absolute top-16 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white'
        >
          <Loader2 className='size-3.5 animate-spin' />
          {t('loading')}
        </span>
      ) : null}
      {load === 'failed' ? (
        <span
          role='alert'
          className='pointer-events-none absolute top-16 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white'
        >
          {t('loadFailed')}
        </span>
      ) : null}

      <div
        role='toolbar'
        aria-label={t('toolbar')}
        className='absolute bottom-4 flex items-center gap-0.5 rounded-full bg-black/60 p-1 shadow-lg backdrop-blur'
      >
        <button
          type='button'
          aria-label={t('zoomOut')}
          disabled={scale <= MIN_SCALE + 0.001}
          onClick={() => controls.current?.zoomOut()}
          className={toolButton}
        >
          <ZoomOut className='size-4.5' />
        </button>
        <span className='min-w-12 text-center text-xs font-medium text-white tabular-nums' data-lightbox-scale>
          {Math.round(scale * 100)}%
        </span>
        <button
          type='button'
          aria-label={t('zoomIn')}
          disabled={scale >= MAX_SCALE - 0.001}
          onClick={() => controls.current?.zoomIn()}
          className={toolButton}
        >
          <ZoomIn className='size-4.5' />
        </button>
        <span aria-hidden className='mx-1 h-5 w-px bg-white/25' />
        <button
          type='button'
          aria-label={t('rotateLeft')}
          onClick={() => setTurns((value) => value - 1)}
          className={toolButton}
        >
          <RotateCcw className='size-4.5' />
        </button>
        <button
          type='button'
          aria-label={t('rotateRight')}
          onClick={() => setTurns((value) => value + 1)}
          className={toolButton}
        >
          <RotateCw className='size-4.5' />
        </button>
        <span aria-hidden className='mx-1 h-5 w-px bg-white/25' />
        <button type='button' aria-label={t('reset')} onClick={reset} className={toolButton}>
          <Maximize className='size-4.5' />
        </button>
      </div>
    </>
  )
}
