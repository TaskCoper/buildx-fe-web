'use client'

import { Check, Play, Video } from 'lucide-react'
import { motion } from 'motion/react'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { revealEase, RevealPhoto } from '@/shared/components/common'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { findMatchRange } from '../services/guide.service'
import { useGuideProgressStore } from '../store/guide-progress.store'
import type { GuideVideo } from '../types/guide.types'

/** Format seconds as m:ss — durations here are always under a minute or two. */
export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Rect gọn của thẻ vừa bấm — popup "bung" ra đúng từ đây (mục 7, ảnh 2). */
export interface VideoCardOrigin {
  dx: number
  dy: number
  width: number
  height: number
  viewportWidth: number
  element?: HTMLElement
}

/** Tô nền xanh nhạt đúng đoạn khớp `query` trong `text` (mục 2, ô tìm). */
export function HighlightedText({ text, query }: { text: string; query?: string }) {
  const range = query ? findMatchRange(text, query) : null
  if (!range) return <>{text}</>
  return (
    <>
      {text.slice(0, range.start)}
      <mark className='bg-accent text-inherit rounded-sm'>{text.slice(range.start, range.end)}</mark>
      {text.slice(range.end)}
    </>
  )
}

interface VideoCardProps extends Omit<ComponentProps<'article'>, 'children' | 'onClick'> {
  video: GuideVideo
  /** Tên bước mà video thuộc về — thẻ tự mang nhãn nên lưới không cần tách nhóm. */
  topicLabel?: string
  /** Số thứ tự hiển thị trước tiêu đề (vd 1 → "1."). */
  index?: number
  /** 'row' = ảnh trái, chữ phải (khu trang chủ); 'stacked' = ảnh trên (trang Hướng dẫn). */
  layout?: 'stacked' | 'row'
  /** Ẩn dòng mô tả — trang Hướng dẫn chỉ hiện tiêu đề đánh số (Hình 12). */
  hideDescription?: boolean
  /**
   * Ghi thời lượng ngay sau tiêu đề. Trang Hướng dẫn cần (Hình 12); khu trang
   * chủ thì không — ở đó thời lượng đã nằm trên ảnh nên nhắc lại là thừa.
   * Mặc định bám theo `hideDescription` để mọi nơi gọi cũ giữ nguyên.
   */
  durationInTitle?: boolean
  /** Trang chủ vẫn hiển thị nút Play trên video đang chờ nội dung thay vì badge biên tập. */
  showPlayWhenUnavailable?: boolean
  /** Số dòng mô tả tối đa của biến thể thẻ. */
  descriptionLines?: 1 | 2
  /** Biến thể trang chủ: khung đứng yên, chỉ ảnh zoom nhẹ và chậm. */
  imageOnlyHover?: boolean
  /** Bấm thẻ mở trình phát phóng to ngay trên trang (mục VI) — kèm rect của
   * chính thẻ để popup "bung" ra đúng từ đó (mục 7). */
  onOpenVideo?: (video: GuideVideo, origin: VideoCardOrigin | null) => void
  /** Nhấp sáng viền một nhịp — dùng khi đây là thẻ CHƯA XEM kế tiếp ngay sau
   * một video vừa xem xong xong (mục 3, "đóng popup sau khi xem xong"). */
  pulseKey?: number
  /** Từ khoá đang tìm — tô nền xanh nhạt đúng đoạn khớp trong tiêu đề (mục 2). */
  query?: string
}

/**
 * Thẻ video hướng dẫn (mục VI, Hình 12): ảnh bìa, nút play tròn trắng ở giữa,
 * nhãn thời lượng góc phải dưới ảnh, tiêu đề đánh số kèm thời lượng.
 *
 * ★ Rê: thẻ nổi lên + bóng lan, ảnh phóng chậm (đã có sẵn trong `RevealPhoto`),
 * phủ tối dần từ đáy ảnh, play to lên + vòng sáng lan một lần, tiêu đề đổi
 * xanh — RỜI đi thì các hiệu ứng đó tắt NHANH HƠN lúc bật (`hover:duration-*`
 * chỉ áp khi đang hover, ngoài hover dùng duration gốc ngắn hơn). Giữ chuột
 * đủ lâu → xem trước không tiếng (mục 3). Tab focus ăn theo y hệt rê
 * (`group-focus-visible:` song song `group-hover:`). Đang xem dở → thanh
 * tiến trình mảnh sát đáy ảnh; xem xong → huy hiệu ✓ nảy một lần, tiêu đề xám
 * nhạt. Video chưa có file → nhãn "Sắp có" thay play, ảnh giảm bão hoà,
 * không phóng khi rê, không xem trước.
 */
export function VideoCard({
  video,
  className,
  topicLabel,
  index,
  layout = 'stacked',
  hideDescription = false,
  durationInTitle,
  showPlayWhenUnavailable = false,
  descriptionLines = 2,
  imageOnlyHover = false,
  onOpenVideo,
  pulseKey,
  query,
  ...props
}: VideoCardProps) {
  const t = useTranslations('guide.card')
  const row = layout === 'row'
  const duration = formatDuration(video.durationSeconds)
  // BE trả `metadata = null` khi YouTube lỗi → thời lượng 0: ẩn nhãn, đừng in "0:00" giả.
  const hasDuration = video.durationSeconds > 0
  const interactive = Boolean(onOpenVideo)
  const showDuration = durationInTitle ?? hideDescription
  const editing = !video.videoUrl
  const showPlay = !editing || showPlayWhenUnavailable

  const articleRef = useRef<HTMLElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [imageError, setImageError] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const progress = useGuideProgressStore((s) => s.getProgress(video.id))
  const watchedRatio = progress && hasDuration ? Math.min(1, progress.position / video.durationSeconds) : 0
  const inProgress = Boolean(progress) && !progress?.completed && watchedRatio > 0.02
  const completed = Boolean(progress?.completed)

  // Vòng sáng lan ra CHỈ MỘT LẦN mỗi khi bắt đầu rê — đổi `key` để remount lại
  // phần tử animate mỗi lần chuột vào, thay vì lặp lại trong lúc đứng yên rê.
  const [hoverPulse, setHoverPulse] = useState(0)

  // Giữ chuột đủ lâu (không phải video đang biên tập) → phát thử KHÔNG TIẾNG
  // tối đa 5 giây rồi tự dừng; rời chuột thì dừng và trả về khung hình đầu.
  function startPreviewTimer() {
    if (editing) return
    previewTimer.current = setTimeout(() => setPreviewing(true), 550)
  }
  function stopPreview() {
    clearTimeout(previewTimer.current)
    setPreviewing(false)
    const el = previewRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
  }

  useEffect(() => {
    if (!previewing) return
    const el = previewRef.current
    if (!el) return
    el.currentTime = 0
    el.play().catch(() => {})
    const stopAt = setTimeout(() => setPreviewing(false), 5000)
    return () => clearTimeout(stopAt)
  }, [previewing])

  useEffect(() => () => clearTimeout(previewTimer.current), [])

  return (
    <div
      className='group/card-lift h-full'
      onMouseEnter={() => {
        setHoverPulse((n) => n + 1)
        startPreviewTimer()
      }}
      onMouseLeave={stopPreview}
    >
      <article
        {...props}
        ref={articleRef}
        {...(interactive
          ? {
              role: 'button',
              tabIndex: 0,
              onClick: () => {
                const rect = articleRef.current?.getBoundingClientRect()
                const origin = rect
                  ? {
                      dx: rect.x + rect.width / 2 - window.innerWidth / 2,
                      dy: rect.y + rect.height / 2 - window.innerHeight / 2,
                      width: rect.width,
                      height: rect.height,
                      viewportWidth: window.innerWidth,
                      element: articleRef.current ?? undefined
                    }
                  : null
                onOpenVideo?.(video, origin)
              },
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenVideo?.(video, null)
                }
              }
            }
          : {})}
        className={cn(
          'group bg-card relative isolate h-full overflow-hidden rounded-xl border',
          imageOnlyHover
            ? 'transition-none'
            : 'transform-gpu transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card-lift:z-10 group-hover/card-lift:-translate-y-1 group-hover/card-lift:scale-[1.008] group-hover/card-lift:border-primary/40 group-hover/card-lift:shadow-xl group-hover/card-lift:duration-500 focus-visible:z-10 focus-visible:-translate-y-1 focus-visible:scale-[1.008] focus-visible:border-primary/40 focus-visible:shadow-xl focus-visible:duration-500',
          row ? 'flex items-stretch' : 'flex flex-col',
          interactive &&
            'focus-visible:ring-ring active:translate-y-0 active:scale-[0.99] cursor-pointer focus-visible:ring-2 focus-visible:outline-none',
          className
        )}
      >
        {pulseKey ? (
          <motion.span
            key={pulseKey}
            aria-hidden
            className='border-primary pointer-events-none absolute inset-0 z-20 rounded-xl border-2'
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        ) : null}

        <div className={cn('relative shrink-0 overflow-hidden', row ? 'min-h-[8.5rem] w-[42%]' : 'aspect-video')}>
          {imageError ? (
            <div className='bg-accent text-primary flex size-full items-center justify-center'>
              <Video className='size-8' />
            </div>
          ) : (
            <RevealPhoto
              className={cn(
                'size-full',
                row ? '' : 'aspect-video w-full',
                editing && !showPlayWhenUnavailable && 'saturate-50'
              )}
              src={video.thumbnailUrl}
              alt={video.title}
              onError={() => setImageError(true)}
              imageClassName={cn(
                imageOnlyHover
                  ? 'duration-[1800ms] ease-in-out group-hover:scale-[1.025] group-focus-visible:scale-[1.025]'
                  : editing
                    ? 'scale-[1.012] transform-gpu duration-300 ease-in-out group-hover:scale-[1.012] group-hover/card-lift:-translate-y-0.5 group-hover/card-lift:scale-[1.012] group-hover/card-lift:duration-[2400ms] group-focus-visible:-translate-y-0.5 group-focus-visible:scale-[1.012] group-focus-visible:duration-[2400ms]'
                    : 'transform-gpu duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card-lift:scale-[1.045] group-hover/card-lift:duration-[900ms] group-focus-visible:scale-[1.045] group-focus-visible:duration-[900ms]'
              )}
            />
          )}

          {/* Xem trước không tiếng khi giữ chuột đủ lâu — chỉ khi đã có file
            video thật; chồng lên ảnh bìa, chỉ hiện khi đang phát. */}
          {!editing && video.videoUrl ? (
            <video
              ref={previewRef}
              src={video.videoUrl}
              muted
              playsInline
              preload='none'
              className={cn(
                'absolute inset-0 size-full object-cover transition-opacity duration-300',
                previewing ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
            />
          ) : null}

          {/* Rê: phủ tối dần từ đáy ảnh. */}
          <div
            className={cn(
              'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-0 transition-opacity duration-200',
              !imageOnlyHover &&
                'group-hover/card-lift:opacity-100 group-hover/card-lift:duration-500 group-focus-visible:opacity-100'
            )}
          />

          {!showPlay ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='bg-foreground/85 text-background absolute inset-0 m-auto flex h-8 w-fit items-center justify-center rounded-full px-3 text-xs font-semibold'>
                  {t('comingSoon')}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('editingHint')}</TooltipContent>
            </Tooltip>
          ) : (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ type: 'spring', bounce: 0.55, duration: 0.5 }}
              className={cn(
                'bg-primary text-primary-foreground absolute inset-0 m-auto flex size-12 transform-gpu items-center justify-center rounded-full shadow-lg transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                !imageOnlyHover && 'group-hover/card-lift:scale-110 group-focus-visible:scale-110',
                previewing && 'opacity-50'
              )}
            >
              <Play className='size-5 translate-x-0.5 fill-current' />
              {hoverPulse > 0 ? (
                <motion.span
                  key={hoverPulse}
                  aria-hidden
                  initial={{ scale: 1, opacity: imageOnlyHover ? 0.8 : 0.55 }}
                  animate={{ scale: imageOnlyHover ? 2.15 : 1.8, opacity: 0 }}
                  transition={{ duration: imageOnlyHover ? 2.1 : 0.6, ease: revealEase }}
                  className={cn(
                    'absolute inset-0 rounded-full border-2',
                    imageOnlyHover ? 'border-white/85' : 'border-primary'
                  )}
                />
              ) : null}
            </motion.span>
          )}

          {/* Hình 12: nhãn thời lượng nền TỐI chữ trắng, góc phải dưới ảnh — khi
            đang xem thử thì chính nhãn này biến thành thanh tiến trình. */}
          {previewing ? (
            <span className='bg-foreground/20 absolute right-2 bottom-2 left-2 h-1 overflow-hidden rounded-full'>
              <PreviewProgressFill videoRef={previewRef} />
            </span>
          ) : hasDuration ? (
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={
                imageOnlyHover ? { delay: 0.45, duration: 0.7, ease: revealEase } : { delay: 0.2, duration: 0.3 }
              }
              className='bg-foreground/85 text-background absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums'
            >
              {duration}
            </motion.span>
          ) : null}

          {/* Đang xem dở: thanh mảnh sát đáy ảnh, rê hiện nhãn "Xem tiếp từ…". */}
          {inProgress ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='bg-foreground/20 absolute inset-x-0 bottom-0 h-1'>
                  <span className='bg-primary block h-full' style={{ width: `${watchedRatio * 100}%` }} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {t('continueFrom', { time: formatDuration(Math.floor(progress?.position ?? 0)) })}
              </TooltipContent>
            </Tooltip>
          ) : null}

          {/* Đã xem xong: huy hiệu ✓ nảy một lần lúc thẻ vừa hiện. */}
          {completed ? (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', bounce: 0.6, duration: 0.4 }}
              className='bg-primary text-primary-foreground absolute top-2 left-2 flex size-6 items-center justify-center rounded-full shadow'
              aria-label={t('completed')}
            >
              <Check className='size-3.5' />
            </motion.span>
          ) : null}
        </div>

        <div className={cn('flex flex-1 flex-col gap-1 p-4', row && 'justify-center')}>
          {topicLabel ? (
            <p className='text-primary max-md:text-xs text-[0.7rem] font-semibold tracking-wide uppercase'>
              {topicLabel}
            </p>
          ) : null}
          <h3
            className={cn(
              'text-sm font-semibold',
              !imageOnlyHover &&
                'transition-colors duration-200 group-hover/card-lift:text-primary group-hover/card-lift:duration-500 group-focus-visible:text-primary',
              completed && 'text-muted-foreground'
            )}
          >
            {index != null ? <span>{index}. </span> : null}
            <HighlightedText text={video.title} query={query} />
            {showDuration && hasDuration ? (
              <span className='text-muted-foreground font-normal'> ({duration})</span>
            ) : null}
          </h3>
          {hideDescription ? null : (
            <p
              className={cn(
                'text-muted-foreground text-xs leading-relaxed',
                descriptionLines === 1 ? 'line-clamp-1' : 'line-clamp-2'
              )}
            >
              {video.description}
            </p>
          )}
        </div>
      </article>
    </div>
  )
}

/** Thanh tiến trình của bản xem thử — đọc `currentTime` mỗi khung hình trong lúc xem thử. */
function PreviewProgressFill({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [ratio, setRatio] = useState(0)

  useEffect(() => {
    let frame: number
    const tick = () => {
      const el = videoRef.current
      if (el && el.duration) setRatio(Math.min(1, el.currentTime / Math.min(el.duration, 5)))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [videoRef])

  return <span className='bg-primary block h-full transition-[width]' style={{ width: `${ratio * 100}%` }} />
}
