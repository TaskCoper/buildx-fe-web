'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Bell, Check, ChevronLeft, ChevronRight, Clapperboard, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Photo, revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { useMediaQuery } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { useGuideProgressStore } from '../store/guide-progress.store'
import type { GuideVideo } from '../types/guide.types'
import type { VideoCardOrigin } from './video-card'
import { VideoPlayer } from './video-player'

interface YouTubePlayerInstance {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

interface YouTubePlayerEvent {
  data: number
  target: YouTubePlayerInstance
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options?: {
      events?: {
        onReady?: (event: { target: YouTubePlayerInstance }) => void
        onStateChange?: (event: YouTubePlayerEvent) => void
      }
    }
  ) => YouTubePlayerInstance
  PlayerState: {
    PLAYING: number
    ENDED: number
  }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube IFrame API unavailable'))
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
    if (existingScript) return

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      youtubeApiPromise = null
      reject(new Error('Failed to load YouTube IFrame API'))
    }
    document.head.appendChild(script)
  })

  return youtubeApiPromise
}

interface VideoLightboxProps {
  /** Video đang mở; `null` là đóng. */
  video: GuideVideo | null
  onClose: () => void
  /** Hàng đợi để chuyển qua lại (mũi tên, gợi ý xem tiếp) — thiếu thì chỉ có mỗi video đang mở. */
  related?: readonly GuideVideo[]
  /** Chuyển sang xem một video khác trong `related` ngay trong hộp đang mở. */
  onSelect?: (video: GuideVideo) => void
  /** "Tạo dự án ngay" sau khi xem xong — lớp app nối tới `features/design`. */
  onCreateProject?: () => void
  /** Báo cho trang cha khi video đã đạt 80% hoặc kết thúc để mở end-card. */
  onQualified?: (video: GuideVideo, reason: 'threshold' | 'ended') => void
  /** Rect của thẻ vừa bấm — hộp "bung" ra đúng từ đó (mục 7). */
  origin?: VideoCardOrigin | null
  /** Bài hướng dẫn thay thế khi video còn đang biên tập, nếu có. */
  getArticleHref?: (video: GuideVideo) => string | undefined
}

/**
 * Popup xem video "bung" ra ngay trên trang (mục VI, mục 7 ảnh 2) — KHÔNG
 * điều hướng sang trang khác.
 *
 * ★ Dựng thẳng trên `@radix-ui/react-dialog` (như modal đặt lịch tư vấn) để tự
 * vẽ animation "bung từ đúng vị trí + kích thước thẻ vừa bấm" — hộp thoại
 * dùng chung không làm được việc đó. Nội dung (tiêu đề, mô tả, nút đóng) hiện
 * TRƯỚC khung video một nhịp. Đóng thì thu lại y hệt, hơi lệch về phía thẻ.
 */
export function VideoLightbox({
  video,
  onClose,
  related = [],
  onSelect,
  onCreateProject,
  onQualified,
  origin,
  getArticleHref
}: VideoLightboxProps) {
  const t = useTranslations('guide.lightbox')
  const isMobile = useMediaQuery('(max-width: 639px), (max-height: 520px) and (pointer: coarse)')
  const reduceMotion = useReducedMotion()

  const queue = related.length > 0 ? related : video ? [video] : []
  const currentIndex = video ? queue.findIndex((item) => item.id === video.id) : -1
  const prevVideo = currentIndex > 0 ? queue[currentIndex - 1] : null
  const nextVideo = currentIndex >= 0 && currentIndex < queue.length - 1 ? queue[currentIndex + 1] : null

  const [direction, setDirection] = useState(1)

  function goTo(target: GuideVideo | null | undefined, dir: number) {
    if (!target) return
    window.dispatchEvent(new Event('savico:guide-video-stop'))
    setDirection(dir)
    onSelect?.(target)
  }

  function closeNow() {
    window.dispatchEvent(new Event('savico:guide-video-stop'))
    onClose()
  }

  function startProject() {
    if (!onCreateProject) return
    closeNow()
    setTimeout(onCreateProject, reduceMotion ? 0 : 220)
  }

  const editing = video ? !video.videoUrl && !video.youtubeId : false
  const articleHref = video ? getArticleHref?.(video) : undefined

  const dx = origin?.dx ?? 0
  const dy = origin?.dy ?? 0
  const targetWidth = Math.min(768, (origin?.viewportWidth ?? 800) - 32)
  const targetHeight = targetWidth * (9 / 16) + 82
  const initialScaleX = origin ? Math.max(0.2, Math.min(0.94, origin.width / targetWidth)) : 0.94
  const initialScaleY = origin ? Math.max(0.2, Math.min(0.94, origin.height / targetHeight)) : 0.94

  return (
    <DialogPrimitive.Root open={Boolean(video)} onOpenChange={(next) => !next && closeNow()}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {video ? (
            <>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.25 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                />
              </DialogPrimitive.Overlay>

              <DialogPrimitive.Content
                asChild
                forceMount
                onOpenAutoFocus={(event) => {
                  event.preventDefault()
                  requestAnimationFrame(() =>
                    document.querySelector<HTMLElement>('[data-video-primary-focus]')?.focus()
                  )
                }}
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <div
                  className='fixed inset-0 z-50 flex items-center justify-center p-4'
                  onClick={(event) => {
                    if (event.target === event.currentTarget) closeNow()
                  }}
                >
                  <motion.div
                    className='bg-background relative w-full max-w-3xl overflow-visible rounded-2xl p-5 shadow-2xl'
                    initial={{ x: dx, y: dy, scaleX: initialScaleX, scaleY: initialScaleY, opacity: 0 }}
                    animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
                    exit={{
                      x: dx * 0.06,
                      y: dy * 0.06,
                      scaleX: 0.96,
                      scaleY: 0.96,
                      opacity: 0,
                      transition: { duration: 0.2, ease: 'easeIn' }
                    }}
                    transition={
                      reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 24, mass: 0.7 }
                    }
                  >
                    <DialogPrimitive.Close asChild>
                      <button
                        type='button'
                        aria-label={t('close')}
                        className='text-muted-foreground hover:bg-muted absolute top-4 right-4 z-30 flex size-8 items-center justify-center rounded-full transition-colors sm:top-5 sm:right-5'
                      >
                        <motion.span
                          whileHover={reduceMotion ? undefined : { rotate: 90 }}
                          transition={{ duration: 0.2 }}
                          className='flex'
                        >
                          <X className='size-4' />
                        </motion.span>
                      </button>
                    </DialogPrimitive.Close>

                    <div className='overflow-hidden rounded-xl'>
                      <AnimatePresence mode='wait' initial={false} custom={direction}>
                        <motion.div
                          key={video.id}
                          custom={direction}
                          initial={{ opacity: 0, x: reduceMotion ? 0 : direction * 44 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: reduceMotion ? 0 : direction * -44 }}
                          transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
                          className='relative'
                        >
                          <motion.div
                            initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.18 }}
                            className={cn(
                              'min-w-0',
                              isMobile ? 'mb-4 space-y-2 px-10 text-center' : 'mb-3 space-y-1 pr-10'
                            )}
                          >
                            <DialogPrimitive.Title className='truncate text-lg leading-tight font-semibold'>
                              {video.title}
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className='text-muted-foreground line-clamp-2 text-sm'>
                              {video.description}
                            </DialogPrimitive.Description>
                          </motion.div>

                          <motion.div
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : 0.14 }}
                          >
                            {editing ? (
                              <EditingCover video={video} articleHref={articleHref} />
                            ) : video.youtubeId ? (
                              <YouTubeFrame key={video.id} video={video} onQualified={onQualified} />
                            ) : (
                              <VideoPlayer
                                key={video.id}
                                video={video}
                                nextVideo={nextVideo}
                                onAdvance={(next) => goTo(next, 1)}
                                onReplay={() => onSelect?.(video)}
                                onCreateProject={onCreateProject ? startProject : undefined}
                                onQualified={onQualified}
                              />
                            )}
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {prevVideo ? (
                      <motion.button
                        type='button'
                        aria-label={t('prevVideo')}
                        onClick={() => goTo(prevVideo, -1)}
                        whileHover={reduceMotion ? undefined : { scale: 1.08, x: -3 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                        className='bg-background/90 absolute top-1/2 -left-3 z-30 hidden size-10 -translate-x-full -translate-y-1/2 items-center justify-center rounded-full border opacity-40 shadow-lg backdrop-blur-sm transition-opacity hover:opacity-100 md:flex'
                      >
                        <ChevronLeft className='size-5' />
                      </motion.button>
                    ) : null}
                    {nextVideo ? (
                      <motion.button
                        type='button'
                        aria-label={t('nextVideo')}
                        onClick={() => goTo(nextVideo, 1)}
                        whileHover={reduceMotion ? undefined : { scale: 1.08, x: 3 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                        className='bg-background/90 absolute top-1/2 -right-3 z-30 hidden size-10 translate-x-full -translate-y-1/2 items-center justify-center rounded-full border opacity-40 shadow-lg backdrop-blur-sm transition-opacity hover:opacity-100 md:flex'
                      >
                        <ChevronRight className='size-5' />
                      </motion.button>
                    ) : null}
                  </motion.div>
                </div>
              </DialogPrimitive.Content>
            </>
          ) : null}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Video còn đang biên tập (mục 7): ảnh bìa phủ tối + trôi rất nhẹ, biểu tượng
 * clapper mờ vào rồi "đóng nắp" một lần, không thanh điều khiển, không tự
 * phát. "Nhận thông báo" đổi thành ✓ nảy nhẹ một lần sau khi bấm.
 */
/** Bước hướng dẫn dùng video YouTube — theo dõi cùng ngưỡng 80% như video file. */
function YouTubeFrame({
  video,
  onQualified
}: {
  video: GuideVideo
  onQualified?: (video: GuideVideo, reason: 'threshold' | 'ended') => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<YouTubePlayerInstance | null>(null)
  const pollRef = useRef<number | null>(null)
  const thresholdQualifiedRef = useRef(false)
  const onQualifiedRef = useRef(onQualified)
  const saveProgress = useGuideProgressStore((state) => state.saveProgress)
  const markCompleted = useGuideProgressStore((state) => state.markCompleted)

  useEffect(() => {
    onQualifiedRef.current = onQualified
  }, [onQualified])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    let cancelled = false

    const stopPolling = () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current)
      pollRef.current = null
    }

    const sampleProgress = () => {
      const player = playerRef.current
      if (!player) return

      const duration = player.getDuration() || video.durationSeconds
      const currentTime = player.getCurrentTime()
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime) || currentTime < 0) return

      saveProgress(video.id, currentTime, duration)
      if (!thresholdQualifiedRef.current && currentTime / duration >= 0.8) {
        thresholdQualifiedRef.current = true
        onQualifiedRef.current?.(video, 'threshold')
      }
    }

    void loadYouTubeApi()
      .then((yt) => {
        if (cancelled) return
        playerRef.current = new yt.Player(iframe, {
          events: {
            onReady: () => {
              sampleProgress()
              if (pollRef.current === null) pollRef.current = window.setInterval(sampleProgress, 1000)
            },
            onStateChange: (event) => {
              if (event.data === yt.PlayerState.PLAYING && pollRef.current === null) {
                pollRef.current = window.setInterval(sampleProgress, 1000)
              }
              if (event.data === yt.PlayerState.ENDED) {
                sampleProgress()
                stopPolling()
                markCompleted(video.id)
                onQualifiedRef.current?.(video, 'ended')
              }
            }
          }
        })
      })
      .catch(() => {
        // The embedded player still works if the tracking API is blocked.
      })

    return () => {
      cancelled = true
      stopPolling()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [markCompleted, saveProgress, video])

  return (
    <div className='bg-muted relative aspect-video w-full overflow-hidden rounded-xl'>
      <iframe
        ref={iframeRef}
        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&enablejsapi=1&playsinline=1`}
        title={video.title}
        allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        className='absolute inset-0 size-full border-0'
      />
    </div>
  )
}

function EditingCover({ video, articleHref }: { video: GuideVideo; articleHref?: string }) {
  const t = useTranslations('guide.lightbox')
  const reduceMotion = useReducedMotion()
  const [notifyRequested, setNotifyRequested] = useState(false)

  return (
    <div className='bg-muted relative aspect-video w-full overflow-hidden rounded-xl'>
      <motion.div
        aria-hidden
        animate={reduceMotion ? undefined : { scale: [1, 1.04, 1], x: [0, 4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className='absolute inset-0'
      >
        <Photo className='size-full opacity-70' src={video.thumbnailUrl} alt={video.title} sizes='768px' />
      </motion.div>
      <div className='bg-foreground/55 absolute inset-0' />

      <div className='text-background absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center'>
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, scaleY: 1 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scaleY: [1, 1, 0.2, 1] }}
          transition={{ opacity: { duration: 0.3 }, scaleY: { duration: 0.5, delay: 0.4, times: [0, 0.6, 0.8, 1] } }}
          className='origin-bottom'
        >
          <Clapperboard className='size-9' />
        </motion.span>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className='text-sm font-semibold'
        >
          {t('editingMessage')}
        </motion.p>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 0.82, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.82, duration: reduceMotion ? 0 : 0.35 }}
          className='text-xs'
        >
          {video.title}
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.95, duration: reduceMotion ? 0 : 0.4 }}
          className='flex flex-col items-center gap-2'
        >
          <Button
            data-video-primary-focus
            size='sm'
            variant={notifyRequested ? 'secondary' : 'default'}
            disabled={notifyRequested}
            onClick={() => setNotifyRequested(true)}
            className='rounded-full'
          >
            {notifyRequested ? (
              <motion.span
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.6, duration: 0.4 }}
                className='flex items-center gap-1.5'
              >
                <Check className='size-4' />
                {t('notifyMeConfirmed')}
              </motion.span>
            ) : (
              <span className='flex items-center gap-1.5'>
                <Bell className='size-4' />
                {t('notifyMe')}
              </span>
            )}
          </Button>
          {articleHref ? (
            <a href={articleHref} className='text-background/90 text-xs font-medium underline underline-offset-2'>
              {t('readArticleInstead')} →
            </a>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}
