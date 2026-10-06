'use client'

import { Loader2, Maximize, Minimize, Pause, Play, Volume2, VolumeX, WifiOff } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Photo, revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { useGuideProgressStore } from '../store/guide-progress.store'
import type { GuideVideo } from '../types/guide.types'
import { formatDuration } from './video-card'

const IDLE_HIDE_MS = 3000
const SLOW_LOADING_MS = 4000
const SLOW_CONNECTION_MS = 10000
const AUTO_ADVANCE_SECONDS = 5

interface VideoPlayerProps {
  video: GuideVideo
  /** Video kế tiếp trong hàng đợi — `null`/`undefined` nghĩa là video cuối cùng. */
  nextVideo?: GuideVideo | null
  onAdvance: (video: GuideVideo) => void
  onReplay: () => void
  onCreateProject?: () => void
  onQualified?: (video: GuideVideo, reason: 'threshold' | 'ended') => void
  className?: string
}

/**
 * Trình phát tự dựng cho popup xem video (mục 7, ảnh 2) — thay hẳn
 * `<video controls>` gốc vì trình duyệt không cho tự ẩn/hiện thanh điều
 * khiển, không có phím tắt riêng, không báo "kết nối chậm", không nhớ vị trí
 * xem dở, không tự đếm ngược sang video kế.
 */
export function VideoPlayer({
  video,
  nextVideo,
  onAdvance,
  onReplay,
  onCreateProject,
  onQualified,
  className
}: VideoPlayerProps) {
  const t = useTranslations('guide.lightbox')
  const reduceMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const countdownPausedRef = useRef(false)
  const thresholdQualifiedRef = useRef(false)
  const onQualifiedRef = useRef(onQualified)

  const getProgress = useGuideProgressStore((s) => s.getProgress)
  const saveProgress = useGuideProgressStore((s) => s.saveProgress)
  const markCompleted = useGuideProgressStore((s) => s.markCompleted)

  const savedProgress = useRef(getProgress(video.id)).current
  const hasResumePoint = savedProgress != null && !savedProgress.completed && savedProgress.position > 4

  const [playing, setPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(video.durationSeconds)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)
  const [bufferingSince, setBufferingSince] = useState<number | null>(null)
  const [mediaError, setMediaError] = useState(false)
  const [nowTick, setNowTick] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(hasResumePoint)
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const [flashIcon, setFlashIcon] = useState<{ key: number; icon: 'play' | 'pause' } | null>(null)
  const [ended, setEnded] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_SECONDS)

  useEffect(() => {
    onQualifiedRef.current = onQualified
  }, [onQualified])

  // Đồng hồ nhịp 1 lần/giây khi đang chờ tải — chỉ để tính đã chờ bao lâu (qua
  // state, không đọc `Date.now()` lúc render) để đổi từ "chỉ vòng xoay" →
  // "Đang tải video…" → "Kết nối chậm".
  useEffect(() => {
    if (bufferingSince == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the wait counter when buffering ends, not a data sync
      setNowTick(0)
      return
    }
    const id = setInterval(() => setNowTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [bufferingSince])

  function flash(icon: 'play' | 'pause') {
    setFlashIcon({ key: Date.now(), icon })
  }

  function resetIdleTimer() {
    setControlsVisible(true)
    clearTimeout(idleTimer.current)
    if (!videoRef.current?.paused) {
      idleTimer.current = setTimeout(() => setControlsVisible(false), IDLE_HIDE_MS)
    }
  }

  function togglePlay() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    if (hasResumePoint && savedProgress) el.currentTime = savedProgress.position
    const autoplayTimer = setTimeout(() => el.play().catch(() => {}), reduceMotion ? 0 : 520)

    const onPlay = () => {
      setPlaying(true)
      setHasStarted(true)
      flash('play')
      resetIdleTimer()
    }
    const onPause = () => {
      setPlaying(false)
      flash('pause')
      setControlsVisible(true)
      clearTimeout(idleTimer.current)
    }
    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime)
      const actualDuration = el.duration || video.durationSeconds
      if (!thresholdQualifiedRef.current && actualDuration > 0 && el.currentTime / actualDuration >= 0.8) {
        thresholdQualifiedRef.current = true
        saveProgress(video.id, el.currentTime, actualDuration)
        onQualifiedRef.current?.(video, 'threshold')
      }
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(
        () => saveProgress(video.id, el.currentTime, el.duration || video.durationSeconds),
        1000
      )
    }
    const onLoadedMetadata = () => setDuration(el.duration || video.durationSeconds)
    const onWaiting = () => setBufferingSince(Date.now())
    const onCanPlay = () => {
      setBufferingSince(null)
      setMediaError(false)
    }
    const onError = () => setMediaError(true)
    const onEnded = () => {
      markCompleted(video.id)
      setEnded(true)
      setCountdown(AUTO_ADVANCE_SECONDS)
      onQualifiedRef.current?.(video, 'ended')
    }

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('loadedmetadata', onLoadedMetadata)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onCanPlay)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('error', onError)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onCanPlay)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('error', onError)
      el.removeEventListener('ended', onEnded)
      clearTimeout(saveTimer.current)
      clearTimeout(idleTimer.current)
      clearTimeout(autoplayTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đăng ký lại khi đổi VIDEO, các callback đọc state mới nhất qua closure của chính effect này
  }, [video.id])

  useEffect(() => {
    const stop = () => videoRef.current?.pause()
    window.addEventListener('savico:guide-video-stop', stop)
    return () => window.removeEventListener('savico:guide-video-stop', stop)
  }, [])

  // Mất mạng: phủ lớp báo, có mạng lại thì tự phát tiếp.
  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => {
      setOffline(false)
      setMediaError(false)
      videoRef.current?.load()
      videoRef.current?.play().catch(() => {})
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Đếm ngược "Xem tiếp" — dừng khi rê chuột vào lớp phủ, tiếp tục khi rời.
  useEffect(() => {
    if (!ended || !nextVideo) return
    const id = setInterval(() => {
      if (countdownPausedRef.current) return
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id)
          onAdvance(nextVideo)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chạy đúng một bộ đếm cho mỗi lần `ended` bật lên
  }, [ended, nextVideo])

  // Tự tắt banner "tiếp tục từ..." sau vài giây.
  useEffect(() => {
    if (!showResumeBanner) return
    const id = setTimeout(() => setShowResumeBanner(false), 5000)
    return () => clearTimeout(id)
  }, [showResumeBanner])

  // Phím tắt: Space, ←/→ tua, M tắt/bật tiếng, F toàn màn hình. Esc để
  // Dialog cha tự lo đóng popup — không chặn ở đây.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const el = videoRef.current
      if (!el) return
      if (document.activeElement instanceof HTMLInputElement && event.key !== ' ') return

      if (event.key === ' ') {
        event.preventDefault()
        togglePlay()
      } else if (event.key === 'ArrowRight') {
        el.currentTime = Math.min(duration, el.currentTime + 5)
        resetIdleTimer()
      } else if (event.key === 'ArrowLeft') {
        el.currentTime = Math.max(0, el.currentTime - 5)
        resetIdleTimer()
      } else if (event.key.toLowerCase() === 'm') {
        el.muted = !el.muted
        setMuted(el.muted)
      } else if (event.key.toLowerCase() === 'f') {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [duration])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      frameRef.current?.requestFullscreen().catch(() => {})
    }
  }

  function retry() {
    const el = videoRef.current
    if (!el) return
    setMediaError(false)
    setBufferingSince(Date.now())
    el.load()
    el.play().catch(() => {})
  }

  function replay() {
    const el = videoRef.current
    if (!el) return
    countdownPausedRef.current = false
    setEnded(false)
    setCountdown(AUTO_ADVANCE_SECONDS)
    setCurrentTime(0)
    el.currentTime = 0
    el.play().catch(() => {})
    onReplay()
  }

  const progressRatio = duration > 0 ? currentTime / duration : 0
  const showLoadingSpinner = mediaError || (bufferingSince != null && nowTick >= 1)
  const showLoadingText = showLoadingSpinner && nowTick * 1000 >= SLOW_LOADING_MS
  const showSlowConnection = mediaError || (showLoadingSpinner && nowTick * 1000 >= SLOW_CONNECTION_MS)

  return (
    <div
      ref={frameRef}
      className={cn('group/player bg-muted relative aspect-video w-full overflow-hidden rounded-xl', className)}
      onMouseMove={resetIdleTimer}
      onTouchStart={resetIdleTimer}
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        playsInline
        muted={muted}
        className='size-full object-contain'
        onClick={togglePlay}
      />

      <AnimatePresence>
        {!hasStarted && !ended && !offline ? (
          <motion.button
            data-video-primary-focus
            type='button'
            aria-label={t('play')}
            onClick={togglePlay}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.45 }}
            transition={{ duration: reduceMotion ? 0 : 0.38, ease: revealEase }}
            className='bg-primary text-primary-foreground absolute inset-0 z-10 m-auto flex size-16 items-center justify-center rounded-full shadow-xl focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none'
          >
            <Play className='size-7 translate-x-0.5 fill-current' />
          </motion.button>
        ) : null}
      </AnimatePresence>

      {/* Vệt sáng nhấp nháy giữa khung hình khi bấm phát/tạm dừng — dù bấm ở
          đâu trên khung cũng hiện đúng một nhịp rồi tan. */}
      <AnimatePresence>
        {flashIcon ? (
          <motion.span
            key={flashIcon.key}
            aria-hidden
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: revealEase }}
            className='bg-foreground/60 text-background pointer-events-none absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full'
          >
            {flashIcon.icon === 'play' ? (
              <Play className='size-7 translate-x-0.5 fill-current' />
            ) : (
              <Pause className='size-7 fill-current' />
            )}
          </motion.span>
        ) : null}
      </AnimatePresence>

      {/* Banner "tiếp tục từ..." sau khi vừa mở, tự tắt sau vài giây. */}
      <AnimatePresence>
        {showResumeBanner ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='bg-foreground/85 text-background absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap'
          >
            <span>{t('continueFrom', { time: formatDuration(Math.floor(savedProgress?.position ?? 0)) })}</span>
            <span aria-hidden>-</span>
            <button
              type='button'
              className='underline underline-offset-2'
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0
                setShowResumeBanner(false)
              }}
            >
              {t('watchFromStart')}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Tải chậm / kết nối chậm. */}
      <AnimatePresence>
        {showLoadingSpinner ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role='status'
            aria-live='polite'
            className='bg-background/70 pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3'
          >
            <Loader2 className='text-primary size-8 animate-spin' />
            {showSlowConnection ? (
              <div className='pointer-events-auto flex flex-col items-center gap-2'>
                <p className='text-sm font-medium'>{t('connectionSlow')}</p>
                <Button size='sm' variant='outline' onClick={retry}>
                  {t('retry')}
                </Button>
              </div>
            ) : showLoadingText ? (
              <p className='text-muted-foreground text-sm'>{t('loadingSlow')}</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mất mạng. */}
      <AnimatePresence>
        {offline ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='bg-background/85 absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 p-6 text-center'
          >
            <WifiOff className='text-muted-foreground size-7' />
            <p className='text-muted-foreground text-sm'>{t('offline')}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Xem xong: gợi ý video kế + đếm ngược, hoặc lời chúc mừng hoàn tất. */}
      <AnimatePresence>
        {ended ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseEnter={() => {
              countdownPausedRef.current = true
            }}
            onMouseLeave={() => {
              countdownPausedRef.current = false
            }}
            className='absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/78 p-6 text-center text-white backdrop-blur-sm'
          >
            {nextVideo ? (
              <>
                <button
                  type='button'
                  onClick={() => onAdvance(nextVideo)}
                  className='group/next relative flex flex-col items-center gap-2'
                >
                  <span className='relative block'>
                    <Photo
                      className='group-hover/next:ring-primary aspect-video w-40 rounded-lg transition-shadow group-hover/next:ring-2'
                      src={nextVideo.thumbnailUrl}
                      alt={nextVideo.title}
                      sizes='160px'
                    />
                    <span
                      aria-label={t('autoAdvanceIn', { seconds: countdown })}
                      className='absolute -top-3 -right-3 grid size-9 place-items-center rounded-full p-0.5 shadow-lg'
                      style={{
                        background: `conic-gradient(var(--color-primary) ${(countdown / AUTO_ADVANCE_SECONDS) * 360}deg, color-mix(in srgb, white 24%, transparent) 0deg)`
                      }}
                    >
                      <span className='bg-background text-foreground grid size-full place-items-center rounded-full text-xs font-bold tabular-nums'>
                        {countdown}
                      </span>
                    </span>
                  </span>
                  <span className='text-white/70 text-xs font-medium tracking-wide uppercase'>{t('upNext')}</span>
                  <span className='text-sm font-semibold'>{nextVideo.title}</span>
                </button>
                <div className='flex gap-2'>
                  <Button size='sm' variant='outline' onClick={replay}>
                    {t('replay')}
                  </Button>
                  <Button size='sm' onClick={() => onAdvance(nextVideo)}>
                    {t('watchNow')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className='text-lg font-semibold'>{t('completedAllTitle')}</p>
                <div className='flex flex-wrap justify-center gap-2'>
                  {onCreateProject ? (
                    <motion.div
                      animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
                      transition={{ duration: 0.9, repeat: 1, ease: 'easeInOut' }}
                    >
                      <Button className='brand-green-button rounded-full' onClick={onCreateProject}>
                        {t('createProject')}
                      </Button>
                    </motion.div>
                  ) : null}
                  <Button size='sm' variant='outline' onClick={replay}>
                    {t('watchAgain')}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Thanh điều khiển tự dựng — hiện khi rê/chạm, tự ẩn sau vài giây lúc
          đang phát, luôn hiện khi tạm dừng. */}
      <AnimatePresence>
        {!ended && (controlsVisible || !playing || scrubbing) ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className='absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2'
          >
            <input
              type='range'
              min={0}
              max={duration || video.durationSeconds}
              step={0.1}
              value={currentTime}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (videoRef.current) videoRef.current.currentTime = value
                setCurrentTime(value)
              }}
              onMouseDown={() => setScrubbing(true)}
              onMouseUp={() => setScrubbing(false)}
              aria-label={t('play')}
              className='accent-primary h-1 w-full cursor-pointer'
              style={{
                background: `linear-gradient(to right, var(--color-primary) ${progressRatio * 100}%, transparent 0)`
              }}
            />
            <div className='flex items-center gap-3 text-white'>
              <button
                data-video-primary-focus
                type='button'
                onClick={togglePlay}
                aria-label={playing ? t('pause') : t('play')}
              >
                {playing ? <Pause className='size-5 fill-current' /> : <Play className='size-5 fill-current' />}
              </button>
              <span className='text-xs tabular-nums opacity-90'>
                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
              </span>
              <span className='flex-1' />
              <button
                type='button'
                onClick={() => {
                  const el = videoRef.current
                  if (!el) return
                  el.muted = !el.muted
                  setMuted(el.muted)
                }}
                aria-label={muted ? t('unmute') : t('mute')}
              >
                {muted ? <VolumeX className='size-5' /> : <Volume2 className='size-5' />}
              </button>
              <button
                type='button'
                onClick={toggleFullscreen}
                aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
              >
                {fullscreen ? <Minimize className='size-5' /> : <Maximize className='size-5' />}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
