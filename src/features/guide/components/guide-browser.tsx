'use client'

import { ChevronLeft, ChevronRight, FileText, Play, Search, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Photo, revealEase } from '@/shared/components/common'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useDebouncedValue } from '@/shared/hooks'
import { useAuthStore } from '@/shared/auth'
import { useCmsCollection } from '@/shared/cms'
import { JOURNEY_POPUP_TEST_MODE } from '@/shared/constants'
import { cn } from '@/shared/lib/utils'
import { GUIDE_PAGE_SIZE } from '../constants/guide.constants'
import { useGuideArticles, useGuideVideos } from '../hooks/use-guide'
import { useGuideDeepLink } from '../hooks/use-guide-deep-link'
import { useGuideProgressStore } from '../store/guide-progress.store'
import { matchesQuery } from '../services/guide.service'
import type { GuideVideo } from '../types/guide.types'
import { HighlightedText, VideoCard, type VideoCardOrigin } from './video-card'
import { GuideCompletionExperience } from './guide-completion-experience'
import { VideoLightbox } from './video-lightbox'

const EMPTY_TOPIC_SUGGESTIONS = ['land-photo', 'read-estimate', 'share'] as const

/**
 * Trang Hướng dẫn (mục VI, Hình 12).
 *
 * Ô tìm lớn giữa đầu trang, rồi CAROUSEL thẻ video đánh số: mũi tên trái/phải
 * hai bên lưới 3 cột × 2 hàng, chấm phân trang bên dưới. Bấm thẻ mở trình phát
 * phóng to ngay trên trang (★ lightbox), không điều hướng đi đâu. Bài viết
 * hướng dẫn chỉ hiện khi đang tìm kiếm.
 *
 * ★ mục VI còn "đề xuất" một video nổi bật cỡ lớn đầu trang, nhưng yêu cầu tối
 * thiểu của Giai đoạn 1 là GIỮ CAROUSEL như demo — nên bám Hình 12; video admin
 * đánh dấu nổi bật chỉ được đẩy lên vị trí đầu carousel.
 *
 * Mỗi topic có `id` neo để nút "?" trong luồng 3 bước deep-link tới đúng chỗ.
 */
interface GuideBrowserProps {
  onCreateProject?: () => void
}

export function GuideBrowser({ onCreateProject }: GuideBrowserProps) {
  const t = useTranslations('guide')
  const user = useAuthStore((state) => state.user)
  const transactions = useCmsCollection('transactions')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(0)
  const [pageDirection, setPageDirection] = useState(1)
  const [playing, setPlaying] = useState<GuideVideo | null>(null)
  const [playOrigin, setPlayOrigin] = useState<VideoCardOrigin | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [typingSuggestion, setTypingSuggestion] = useState(false)
  const [clearPulse, setClearPulse] = useState(0)
  const [justCompletedTopicId, setJustCompletedTopicId] = useState<string | null>(null)
  const [nextCardPulse, setNextCardPulse] = useState(0)
  const [qualifiedVideo, setQualifiedVideo] = useState<GuideVideo | null>(null)
  const [endCardOpen, setEndCardOpen] = useState(false)
  const pendingQualifiedRef = useRef<GuideVideo | null>(null)
  const debouncedTerm = useDebouncedValue(term, 300)
  const query = (term === '' ? '' : debouncedTerm).trim()

  const inputRef = useRef<HTMLInputElement>(null)
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const carouselViewportRef = useRef<HTMLDivElement>(null)
  const carouselTrackRef = useRef<HTMLDivElement>(null)
  const focusFirstCardRef = useRef(false)
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reduceMotion = useReducedMotion()
  const getProgress = useGuideProgressStore((s) => s.getProgress)

  const { data: videos, isPending: videosPending } = useGuideVideos()
  const { data: articles, isPending: articlesPending } = useGuideArticles()
  const [carouselWidth, setCarouselWidth] = useState(0)
  // S5 = đã thanh toán gói giám sát. Không dựa vào chủ dự án giám sát: bản mock gán
  // chủ cho bất kỳ ai mở bảng điều khiển giám sát, làm mất popup sau khi xem video.
  const isS5 = Boolean(
    user?.email &&
    transactions.some(
      (transaction) =>
        transaction.customerEmail.toLowerCase() === user.email.toLowerCase() &&
        transaction.status === 'paid' &&
        (transaction.tier === 'check' || transaction.tier === 'control')
    )
  )

  useEffect(() => {
    const viewport = carouselViewportRef.current
    if (!viewport) return
    const measure = () => setCarouselWidth(viewport.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [videosPending])

  const visibleArticles = (articles ?? []).filter((a) => matchesQuery(a.title, query) || matchesQuery(a.excerpt, query))

  // Giữ NGUYÊN thứ tự API trả về — thời gian tạo tăng dần, cũng là thứ tự đánh số
  // bước (epic GuideStepManagement §7). Tìm kiếm theo tiêu đề bước.
  const allVideos = useMemo(() => videos ?? [], [videos])
  const visibleVideos = allVideos.filter((v) => matchesQuery(v.title, query))

  const instantQuery = term.trim()
  const suggestedVideos = instantQuery
    ? allVideos.filter((video) => matchesQuery(video.title, instantQuery)).slice(0, 4)
    : []
  const suggestedArticles = instantQuery
    ? (articles ?? [])
        .filter((article) => matchesQuery(article.title, instantQuery) || matchesQuery(article.excerpt, instantQuery))
        .slice(0, Math.max(0, 5 - suggestedVideos.length))
    : []
  const suggestions = [
    ...suggestedVideos.map((video) => ({ id: video.id, label: video.title, kind: 'video' as const })),
    ...suggestedArticles.map((article) => ({ id: article.id, label: article.title, kind: 'article' as const }))
  ]
  const suggestionsOpen = searchFocused && !typingSuggestion && !suggestionsDismissed && suggestions.length > 0

  // Chữ gợi ý luân phiên theo NỘI DUNG THẬT — vài giây một lần, dừng khi ô có
  // tiêu điểm; đứng yên nếu chưa có dữ liệu.
  const placeholderPool = useMemo(() => allVideos.slice(0, 6).map((v) => v.title), [allVideos])
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  useEffect(() => {
    if (searchFocused || placeholderPool.length < 2) return
    const id = setInterval(() => setPlaceholderIndex((i) => (i + 1) % placeholderPool.length), 2800)
    return () => clearInterval(id)
  }, [searchFocused, placeholderPool.length])

  // Phím "/" lấy tiêu điểm ô tìm — trừ khi đang gõ vào một ô nhập khác.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    },
    []
  )

  // Neo cho nút "?" trong luồng: đặt ở video đầu tiên của mỗi bước.
  const topicAnchors = new Map<string, string>()
  for (const video of visibleVideos) if (!topicAnchors.has(video.topic)) topicAnchors.set(video.topic, video.id)

  const pageCount = Math.max(1, Math.ceil(visibleVideos.length / GUIDE_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageVideos = visibleVideos.slice(safePage * GUIDE_PAGE_SIZE, (safePage + 1) * GUIDE_PAGE_SIZE)
  const singlePage = pageCount <= 1

  function goTo(next: number, direction: number, focusFirstCard = false) {
    if (next < 0 || next >= pageCount || next === safePage) return
    setPageDirection(direction)
    focusFirstCardRef.current = focusFirstCard
    setPage(next)
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const projectedOffset = info.offset.x + info.velocity.x * 0.14
    const threshold = Math.min(120, Math.max(56, carouselWidth * 0.16))
    if (projectedOffset <= -threshold && safePage < pageCount - 1) goTo(safePage + 1, 1)
    else if (projectedOffset >= threshold && safePage > 0) goTo(safePage - 1, -1)
  }

  useEffect(() => {
    if (!focusFirstCardRef.current) return
    const timer = setTimeout(
      () => {
        carouselTrackRef.current?.querySelector<HTMLElement>('[data-guide-card]')?.focus()
        focusFirstCardRef.current = false
      },
      reduceMotion ? 0 : 180
    )
    return () => clearTimeout(timer)
  }, [reduceMotion, safePage])

  useEffect(() => {
    if (videosPending) return
    const timer = setTimeout(() => window.dispatchEvent(new CustomEvent('savico:guide-ready')), 1000)
    return () => clearTimeout(timer)
  }, [videosPending])

  function openVideo(video: GuideVideo, origin: VideoCardOrigin | null) {
    window.dispatchEvent(new CustomEvent('savico:guide-video-opened', { detail: { id: video.id, title: video.title } }))
    setPlaying(video)
    setPlayOrigin(origin)
  }

  function clearSearch() {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    typingTimerRef.current = null
    setTypingSuggestion(false)
    setSuggestionsDismissed(true)
    setActiveSuggestion(-1)
    setTerm('')
    setPage(0)
    setClearPulse((value) => value + 1)
    inputRef.current?.focus()
  }

  function typeSuggestion(value: string) {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    setSuggestionsDismissed(true)
    setActiveSuggestion(-1)
    setPage(0)
    inputRef.current?.focus()

    if (reduceMotion) {
      setTerm(value)
      setTypingSuggestion(false)
      return
    }

    const characters = Array.from(value)
    let index = 0
    setTerm('')
    setTypingSuggestion(true)
    typingTimerRef.current = setInterval(() => {
      index += 1
      setTerm(characters.slice(0, index).join(''))
      if (index >= characters.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
        setTypingSuggestion(false)
      }
    }, 48)
  }

  function pulseNextSuggestion(video: GuideVideo) {
    window.dispatchEvent(
      new CustomEvent('savico:guide-video-completed', { detail: { id: video.id, title: video.title } })
    )
    const next = visibleVideos.find(
      (candidate) =>
        candidate.id !== video.id && candidate.topic === video.topic && !getProgress(candidate.id)?.completed
    )
    if (next) {
      setJustCompletedTopicId(next.id)
      setNextCardPulse((n) => n + 1)
      window.setTimeout(() => setJustCompletedTopicId(null), 1000)
    }
  }

  function showEndCard(video: GuideVideo) {
    if (isS5) return
    const sessionKey = `savico.page-popup.guide.${video.id}`
    if (!JOURNEY_POPUP_TEST_MODE && window.sessionStorage.getItem(sessionKey) === '1') return
    if (!JOURNEY_POPUP_TEST_MODE) window.sessionStorage.setItem(sessionKey, '1')

    pendingQualifiedRef.current = null
    setQualifiedVideo(video)
    window.setTimeout(() => setEndCardOpen(true), reduceMotion ? 0 : 120)
  }

  // `?video=<id>`: mở thẳng video (tra trong danh sách, không có thì `GET /guides/{id}`).
  const deepLink = useGuideDeepLink({ videos, videosPending, onOpen: (video) => openVideo(video, null) })

  function closeVideo() {
    deepLink.release()
    // Vừa xem xong thì đóng popup → thẻ CHƯA XEM kế tiếp cùng chủ đề sáng viền
    // một nhịp (mục 3, "đóng popup sau khi xem xong").
    if (playing && getProgress(playing.id)?.completed) {
      pulseNextSuggestion(playing)
    }
    const qualifiedOnClose = pendingQualifiedRef.current?.id === playing?.id ? pendingQualifiedRef.current : null
    const unavailableVideoFallback = playing && !playing.videoUrl ? playing : null
    if (qualifiedOnClose && playing && !getProgress(playing.id)?.completed) pulseNextSuggestion(playing)
    const trigger = playOrigin?.element
    setPlaying(null)
    setPlayOrigin(null)
    if (qualifiedOnClose) showEndCard(qualifiedOnClose)
    else if (unavailableVideoFallback) showEndCard(unavailableVideoFallback)
    requestAnimationFrame(() => trigger?.focus())
  }

  function handleQualified(video: GuideVideo, reason: 'threshold' | 'ended') {
    if (isS5) return
    const sessionKey = `savico.page-popup.guide.${video.id}`
    if (!JOURNEY_POPUP_TEST_MODE && window.sessionStorage.getItem(sessionKey) === '1') return

    pendingQualifiedRef.current = video
    setQualifiedVideo(video)

    if (reason === 'ended') {
      pulseNextSuggestion(video)
      window.dispatchEvent(new Event('savico:guide-video-stop'))
      setPlaying(null)
      setPlayOrigin(null)
      showEndCard(video)
    }
  }

  function browseMoreGuides() {
    setEndCardOpen(false)
    gridRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const showEmpty = !videosPending && !articlesPending && visibleVideos.length === 0 && visibleArticles.length === 0
  const searching = query.length > 0

  return (
    <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
      {/* Góp ý BuildX: tiêu đề + một dòng mô tả hiện rõ phía trên ô tìm kiếm. */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: revealEase }}
        className='mb-6 text-center'
      >
        <h1 className='text-3xl font-bold tracking-tight text-balance'>{t('pageTitle')}</h1>
        <p className='text-muted-foreground mt-2 text-pretty'>{t('pageSubtitle')}</p>
      </motion.header>

      {deepLink.unavailable ? (
        <div
          role='status'
          className='bg-muted text-muted-foreground mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm'
        >
          <span>{t('deepLink.unavailable')}</span>
          <button type='button' onClick={deepLink.release} className='text-primary font-medium hover:underline'>
            {t('deepLink.backToList')}
          </button>
        </div>
      ) : null}

      <motion.div
        ref={searchWrapperRef}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: revealEase }}
        onBlur={(event) => {
          // Tab (hoặc Shift+Tab) di chuyển tiêu điểm QUA LẠI giữa ô nhập và
          // các mục gợi ý cũng phát blur — chỉ đóng danh sách khi tiêu điểm
          // rời khỏi hẳn cả khối tìm kiếm, không phải khi nó còn ở bên trong.
          const next = event.relatedTarget as Node | null
          if (next && searchWrapperRef.current?.contains(next)) return
          setSearchFocused(false)
        }}
        className='relative z-20 mx-auto mb-8 w-full max-w-3xl'
      >
        <Search
          className={cn(
            'pointer-events-none absolute top-1/2 left-5 z-10 size-5 -translate-y-1/2 transition-colors duration-200',
            searchFocused ? 'text-primary' : 'text-muted-foreground'
          )}
        />

        {term === '' && placeholderPool[placeholderIndex] ? (
          <div className='pointer-events-none absolute inset-y-0 right-13 left-13 overflow-hidden'>
            <AnimatePresence initial={false}>
              <motion.span
                key={placeholderIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className='text-muted-foreground absolute inset-0 flex items-center truncate text-base'
              >
                {placeholderPool[placeholderIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        ) : null}

        <Input
          ref={inputRef}
          type='search'
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            setPage(0)
            setSuggestionsDismissed(false)
            setActiveSuggestion(-1)
          }}
          onFocus={() => setSearchFocused(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              if (!suggestionsOpen) return
              event.preventDefault()
              setActiveSuggestion((i) => (i < 0 ? 0 : (i + 1) % suggestions.length))
            } else if (event.key === 'ArrowUp') {
              if (!suggestionsOpen) return
              event.preventDefault()
              setActiveSuggestion((i) =>
                i < 0 ? suggestions.length - 1 : (i - 1 + suggestions.length) % suggestions.length
              )
            } else if (event.key === 'Enter') {
              event.preventDefault()
              if (suggestionsOpen && activeSuggestion >= 0) {
                typeSuggestion(suggestions[activeSuggestion]!.label)
              } else {
                gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            } else if (event.key === 'Escape') {
              if (activeSuggestion >= 0) {
                event.stopPropagation()
                setActiveSuggestion(-1)
              } else if (term) {
                event.stopPropagation()
                clearSearch()
              } else {
                inputRef.current?.blur()
              }
            }
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          role='combobox'
          aria-autocomplete='list'
          aria-expanded={suggestionsOpen}
          aria-controls='guide-search-suggestions'
          aria-activedescendant={
            suggestionsOpen && activeSuggestion >= 0
              ? `guide-suggestion-${suggestions[activeSuggestion]!.id}`
              : undefined
          }
          className='bg-background [&::-webkit-search-cancel-button]:appearance-none h-16 rounded-full border-2 pl-13 pr-15 text-base shadow-[0_12px_30px_-20px_var(--primary)] placeholder:text-transparent transition-[border-color,box-shadow] duration-200 hover:border-primary/55 hover:shadow-[0_16px_36px_-20px_var(--primary)] focus-visible:border-primary focus-visible:ring-[5px] focus-visible:ring-primary/15 focus-visible:shadow-[0_18px_42px_-20px_var(--primary)] focus-visible:outline-none'
        />

        {term ? (
          <button
            type='button'
            onClick={clearSearch}
            aria-label={t('search.clear')}
            className='bg-muted/80 text-muted-foreground hover:bg-accent hover:text-primary group absolute top-1/2 right-4 flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors active:scale-95'
          >
            <span className='flex transition-transform duration-200 group-hover:rotate-90'>
              <X className='size-3.5' strokeWidth={2.25} />
            </span>
          </button>
        ) : null}

        <AnimatePresence>
          {suggestionsOpen ? (
            <motion.div
              id='guide-search-suggestions'
              role='listbox'
              aria-label={t('search.suggestions')}
              initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -5, scaleY: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: revealEase }}
              className='bg-popover absolute top-[calc(100%+0.4rem)] right-3 left-3 origin-top space-y-0.5 overflow-hidden rounded-xl border p-2 shadow-xl sm:right-4 sm:left-4'
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  id={`guide-suggestion-${suggestion.id}`}
                  type='button'
                  role='option'
                  aria-selected={index === activeSuggestion}
                  onMouseEnter={() => setActiveSuggestion(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => typeSuggestion(suggestion.label)}
                  className={cn(
                    'hover:bg-accent focus-visible:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none',
                    index === activeSuggestion && 'bg-accent'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md',
                      suggestion.kind === 'video' ? 'bg-primary text-primary-foreground' : 'bg-accent text-primary'
                    )}
                  >
                    {suggestion.kind === 'video' ? (
                      <Play className='size-3.5 fill-current' />
                    ) : (
                      <FileText className='size-3.5' />
                    )}
                  </span>
                  <span className='min-w-0 flex-1 truncate'>
                    <HighlightedText text={suggestion.label} query={instantQuery} />
                  </span>
                  {suggestion.kind === 'article' ? (
                    <span className='text-muted-foreground shrink-0 text-xs'>{t('search.article')}</span>
                  ) : null}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {qualifiedVideo && !isS5 ? (
        <GuideCompletionExperience
          video={qualifiedVideo}
          popupOpen={endCardOpen}
          onPopupOpenChange={setEndCardOpen}
          onCreateProject={onCreateProject}
          onBrowseGuides={browseMoreGuides}
        />
      ) : null}

      {videosPending ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className='h-64 w-full rounded-xl' />
          ))}
        </div>
      ) : showEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
          className='flex flex-col items-center px-4 py-10 text-center sm:py-12'
        >
          <Search className='text-muted-foreground/45 size-12' strokeWidth={1.7} />
          <p className='mt-5 text-sm font-medium'>{t('empty.title', { keyword: query })}</p>
          {searching ? (
            <div className='mt-5 flex flex-wrap items-center justify-center gap-2'>
              {EMPTY_TOPIC_SUGGESTIONS.map((topic) => (
                <button
                  key={topic}
                  type='button'
                  onClick={() => typeSuggestion(t(`topics.${topic}`))}
                  className='border-border bg-background text-muted-foreground hover:border-primary/25 hover:bg-accent hover:text-primary rounded-full border px-4 py-2 text-sm font-medium transition-[color,background-color,border-color,transform] active:scale-[0.98]'
                >
                  {t(`topics.${topic}`)}
                </button>
              ))}
              <button
                type='button'
                onClick={() => typeSuggestion(t('search.style'))}
                className='border-border bg-background text-muted-foreground hover:border-primary/25 hover:bg-accent hover:text-primary rounded-full border px-4 py-2 text-sm font-medium transition-[color,background-color,border-color,transform] active:scale-[0.98]'
              >
                {t('search.style')}
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : (
        <div ref={gridRef} className='scroll-mt-24 space-y-12'>
          {visibleVideos.length > 0 ? (
            <section
              aria-roledescription='carousel'
              aria-label={t('carouselLabel')}
              className='group/carousel'
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' && safePage < pageCount - 1) {
                  event.preventDefault()
                  goTo(safePage + 1, 1, true)
                } else if (event.key === 'ArrowLeft' && safePage > 0) {
                  event.preventDefault()
                  goTo(safePage - 1, -1, true)
                }
              }}
            >
              <div className={cn('relative mx-auto w-full', !singlePage && 'px-12 sm:px-14 lg:px-16')}>
                {/* Mũi tên nằm NGOÀI lưới, canh giữa theo chiều dọc — mờ nghỉ,
                    rõ khi rê vào cả khối carousel, tắt hẳn nếu chỉ có 1 trang. */}
                {!singlePage ? (
                  <motion.button
                    type='button'
                    aria-label={t('prev')}
                    onClick={() => goTo(safePage - 1, -1)}
                    disabled={safePage === 0}
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.92 }}
                    className='bg-card/75 hover:bg-card group/arrow absolute top-1/2 left-0 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border opacity-70 shadow-sm backdrop-blur-md transition-[background-color,box-shadow,opacity,transform] duration-300 group-hover/carousel:opacity-100 hover:shadow-lg active:scale-90 disabled:pointer-events-none disabled:opacity-35'
                  >
                    <ChevronLeft className='size-5 transition-transform duration-200 group-hover/arrow:-translate-x-0.5' />
                  </motion.button>
                ) : null}

                <div
                  ref={carouselViewportRef}
                  className={cn(singlePage ? 'overflow-visible' : '-m-6 overflow-hidden p-6')}
                >
                  <AnimatePresence mode='sync' initial={false} custom={pageDirection}>
                    <motion.div
                      ref={carouselTrackRef}
                      key={`${safePage}-${clearPulse}`}
                      custom={pageDirection}
                      drag={pageCount > 1 ? 'x' : false}
                      dragConstraints={{
                        left: safePage < pageCount - 1 ? -carouselWidth : 0,
                        right: safePage > 0 ? carouselWidth : 0
                      }}
                      dragElastic={0.16}
                      dragMomentum
                      dragTransition={{ bounceStiffness: 320, bounceDamping: 32, power: 0.2, timeConstant: 180 }}
                      onDragEnd={onDragEnd}
                      initial={{ opacity: 0, x: reduceMotion ? 0 : pageDirection * Math.min(80, carouselWidth * 0.12) }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{
                        opacity: 0,
                        x: reduceMotion ? 0 : pageDirection * -Math.min(80, carouselWidth * 0.12),
                        transition: { duration: reduceMotion ? 0 : 0.18 }
                      }}
                      transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                      className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                    >
                      {Array.from({ length: singlePage ? pageVideos.length : GUIDE_PAGE_SIZE }, (_, index) => {
                        const video = pageVideos[index]
                        if (!video) {
                          return (
                            <div key={`placeholder-${index}`} aria-hidden className='invisible'>
                              <div className='aspect-video' />
                              <div className='h-14' />
                            </div>
                          )
                        }
                        return (
                          <motion.div
                            key={video.id}
                            layout
                            className='relative hover:z-10 focus-within:z-10'
                            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: reduceMotion ? 0 : 0.36,
                              delay: reduceMotion ? 0 : index * 0.045,
                              ease: revealEase
                            }}
                            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.12 } }}
                          >
                            <VideoCard
                              video={video}
                              hideDescription
                              showPlayWhenUnavailable
                              data-guide-card
                              index={visibleVideos.indexOf(video) + 1}
                              onOpenVideo={openVideo}
                              query={query}
                              pulseKey={video.id === justCompletedTopicId ? nextCardPulse : undefined}
                              {...(topicAnchors.get(video.topic) === video.id ? { id: video.topic } : {})}
                              className='scroll-mt-32'
                            />
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {!singlePage ? (
                  <motion.button
                    type='button'
                    aria-label={t('next')}
                    onClick={() => goTo(safePage + 1, 1)}
                    disabled={safePage === pageCount - 1}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.92 }}
                    className='bg-card/75 hover:bg-card group/arrow absolute top-1/2 right-0 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border opacity-70 shadow-sm backdrop-blur-md transition-[background-color,box-shadow,opacity,transform] duration-300 group-hover/carousel:opacity-100 hover:shadow-lg active:scale-90 disabled:pointer-events-none disabled:opacity-35'
                  >
                    <ChevronRight className='size-5 transition-transform duration-200 group-hover/arrow:translate-x-0.5' />
                  </motion.button>
                ) : null}
              </div>

              {!singlePage ? (
                <div className='mt-6 flex items-center justify-center gap-2'>
                  {Array.from({ length: pageCount }, (_, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <button
                          type='button'
                          aria-label={t('goToPage', { page: index + 1 })}
                          aria-current={index === safePage ? 'true' : undefined}
                          onClick={() => goTo(index, index > safePage ? 1 : -1)}
                          className='relative isolate flex h-3 w-7 items-center justify-center transition-transform hover:scale-110 active:scale-95'
                        >
                          {index === safePage ? (
                            <motion.span
                              layoutId='guide-page-dot'
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                              className='bg-primary absolute inset-0 rounded-full'
                            />
                          ) : (
                            <span className='bg-muted-foreground/30 hover:bg-muted-foreground/50 size-2.5 rounded-full transition-colors' />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t('pageOf', { page: index + 1, total: pageCount })}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ) : null}
              <span id='guide-grid-end' aria-hidden className='block h-px' />
            </section>
          ) : null}

          {/* Hình 12 chỉ có carousel video. Danh sách bài viết chỉ hiện khi
              người dùng gõ tìm — vì ô tìm hứa tìm cả "bài hướng dẫn". */}
          {articlesPending || !query ? null : visibleArticles.length > 0 ? (
            <section>
              <h2 className='mb-4 text-lg font-semibold tracking-tight'>{t('articlesTitle')}</h2>
              <div className='grid gap-4 sm:grid-cols-2'>
                {visibleArticles.map((article) => (
                  <article key={article.id} className='bg-card flex gap-3 overflow-hidden rounded-xl border p-3'>
                    <Photo
                      className='size-20 shrink-0 rounded-lg'
                      src={article.imageUrl}
                      alt={article.title}
                      sizes='80px'
                    />
                    <div className='min-w-0 space-y-1'>
                      <h3 className='text-sm font-semibold'>
                        <HighlightedText text={article.title} query={query} />
                      </h3>
                      <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
                        <HighlightedText text={article.excerpt} query={query} />
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <VideoLightbox
        video={playing}
        onClose={closeVideo}
        related={visibleVideos}
        onSelect={(v) => setPlaying(v)}
        origin={playOrigin}
        onCreateProject={onCreateProject}
        onQualified={handleQualified}
        getArticleHref={(video) => {
          const article = (articles ?? []).find((a) => a.topic === video.topic)
          return article ? `#${video.topic}` : undefined
        }}
      />
    </div>
  )
}
