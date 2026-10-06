'use client'

import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from 'react'

import { useSiteImage } from '@/shared/cms'
import { env } from '@/shared/config/env'
import { EmptyState, ErrorState, Photo } from '@/shared/components/common'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import {
  HANDBOOK_TEMPLATE_LIBRARY_HISTORY_KEY,
  HANDBOOK_TEMPLATE_RETURN_SESSION_KEY,
  LIBRARY_PAGE_SIZE
} from '../constants/handbook.constants'
import {
  useHandbookLibraryFilters,
  useHandbookLookupQuota,
  useHandbookTemplateIdsByFilters,
  useHandbookTemplateStyles,
  useHandbookTemplates
} from '../hooks/use-handbook'
import { filterTemplates, floorCountOf, pageCount, pageSlice } from '../services/handbook.service'
import type { HandbookTemplate, HandbookTemplateKind } from '../types/handbook.types'
import { QuotaBadge } from './quota-badge'
import { TemplateCard } from './template-card'
import { TemplateLookupExhaustedDialog } from './template-lookup-exhausted-dialog'
import { LibraryStyleFilter } from './library-style-filter'

const ALL = 'all'
const FILTER_EXIT_MS = 120
const GRID_MOTION_MS = 260
const PAGE_TRANSITION_MS = 320
const PAGE_SCROLL_LEAD_MS = 190
const SEARCH_DELAY_MS = 250

type ChangeReason = 'filter' | 'page-forward' | 'page-back' | 'restore' | 'initial'

interface LibraryRestoreState {
  kind: HandbookTemplateKind
  buildingType: string
  floorCount: string
  tum: string
  architectureStyleIds: string[]
  interiorStyleIds: string[]
  term: string
  appliedQuery: string
  page: number
  scrollY: number
}

interface TemplateReturnMarker {
  templateId: string
  createdAt: number
}

interface PillStyle {
  transform: string
  width: number
  height: number
  ready: boolean
}

export function TemplateLibrary() {
  const t = useTranslations('handbook.library')
  const bannerImage = useSiteImage('handbook.libraryBanner')
  const bannerRef = useRef<HTMLElement>(null)

  // Mở banner giống tab Tin tức (foundation-block): viền hiện dần, ảnh phóng nhẹ rồi
  // rõ lên, chữ trượt lên lần lượt. Phát một lần khi banner vào khung nhìn.
  useLayoutEffect(() => {
    const section = bannerRef.current
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
    const animations: Animation[] = []
    const run = (node: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = node.animate(keyframes, { easing: ease, fill: 'both', ...options })
      animations.push(animation)
      void animation.finished.then(() => animation.cancel()).catch(() => undefined)
    }

    const play = () => {
      const borderColor = getComputedStyle(section).borderColor
      run(section, [{ borderColor: 'transparent' }, { borderColor }], { duration: 220 })
      const hero = section.querySelector('.foundation-hero-motion')
      if (hero) {
        run(
          hero,
          [
            { opacity: 0, transform: 'scale(1.035)' },
            { opacity: 1, transform: 'scale(1)' }
          ],
          { duration: 680, delay: 160 }
        )
      }
      section.querySelectorAll('[data-library-banner-sequence]').forEach((node, index) => {
        run(
          node,
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 280, delay: 520 + index * 85 }
        )
      })
    }

    const rect = section.getBoundingClientRect()
    let observer: IntersectionObserver | null = null
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      play()
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return
          observer?.disconnect()
          play()
        },
        { threshold: 0.08 }
      )
      observer.observe(section)
    }

    return () => {
      observer?.disconnect()
      animations.forEach((animation) => animation.cancel())
    }
  }, [])
  const tDetail = useTranslations('handbook.detail')

  const [kind, setKind] = useState<HandbookTemplateKind>('2d')
  const [buildingType, setBuildingType] = useState(ALL)
  const [floorCount, setFloorCount] = useState(ALL)
  const [tum, setTum] = useState(ALL)
  const [architectureStyleIds, setArchitectureStyleIds] = useState<string[]>([])
  const [interiorStyleIds, setInteriorStyleIds] = useState<string[]>([])
  const [term, setTerm] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [quotaShakeNonce, setQuotaShakeNonce] = useState(0)
  const [blockedTemplateId, setBlockedTemplateId] = useState<string | null>(null)
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)
  const [pillStyle, setPillStyle] = useState<PillStyle>({
    transform: 'translate3d(0,0,0)',
    width: 0,
    height: 0,
    ready: false
  })

  const { data: templates, isPending, isError, refetch } = useHandbookTemplates()
  const lookupQuota = useHandbookLookupQuota()
  const pool = useMemo(() => templates ?? [], [templates])

  const apiMode = !env.NEXT_PUBLIC_USE_MOCK_API
  const filterOptions = useHandbookLibraryFilters(kind, apiMode, buildingType === ALL ? undefined : buildingType)
  const apiFilters = filterOptions.data
  const filterActive =
    buildingType !== ALL ||
    floorCount !== ALL ||
    tum !== ALL ||
    (kind === '3d' && (architectureStyleIds.length > 0 || interiorStyleIds.length > 0))
  const filteredIds = useHandbookTemplateIdsByFilters(
    {
      drawingKind: kind === '3d' ? '3D' : '2D',
      buildingTypeId: buildingType === ALL ? undefined : buildingType,
      floorCount: floorCount === ALL ? undefined : Number(floorCount),
      hasTum: tum === ALL ? undefined : tum === 'true',
      architectureStyleIds: kind === '3d' ? architectureStyleIds : undefined,
      interiorStyleIds: kind === '3d' ? interiorStyleIds : undefined
    },
    apiMode && filterActive
  )
  const allowedIds = useMemo(() => {
    if (!apiMode || !filterActive) return undefined
    return new Set(filteredIds.data ?? [])
  }, [apiMode, filterActive, filteredIds.data])
  const styleOptions = useHandbookLibraryFilters('3d', apiMode && kind === '3d')
  const templateStyles = useHandbookTemplateStyles(
    styleOptions.data,
    apiMode && kind === '3d' && pool.some((item) => item.kind === '3d')
  )
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('handbook.library', { offsetMs: 220 })

  const gridViewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const kindTrackRef = useRef<HTMLDivElement>(null)
  const kindButtonRefs = useRef<Record<HandbookTemplateKind, HTMLButtonElement | null>>({ '2d': null, '3d': null })
  const previousRectsRef = useRef<Map<string, DOMRect>>(new Map())
  const previousContentHeightRef = useRef(0)
  const changeReasonRef = useRef<ChangeReason>('initial')
  const runningAnimationsRef = useRef<Animation[]>([])
  const viewportHeightAnimationRef = useRef<Animation | null>(null)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingKindRef = useRef<HandbookTemplateKind | null>(null)
  const pendingPageRef = useRef<number | null>(null)
  const dragRef = useRef<{
    active: boolean
    pointerId: number
    startX: number
    startY: number
    baseX: number
    page: number
    deltaX: number
    axis: 'pending' | 'horizontal' | 'vertical'
  }>({ active: false, pointerId: -1, startX: 0, startY: 0, baseX: 0, page: 1, deltaX: 0, axis: 'pending' })

  const buildingOptions = useMemo(
    () =>
      apiMode
        ? (apiFilters?.buildingTypes ?? []).map((type) => ({ value: type.id, label: type.name }))
        : uniqueOptions(
            pool.filter((template) => template.kind === kind),
            (template) => template.tags.buildingType,
            (template) => template.specs.buildingTypeLabel
          ),
    [apiMode, apiFilters, pool, kind]
  )

  const scopedPool = useMemo(
    () =>
      pool.filter(
        (template) => template.kind === kind && (buildingType === ALL || template.tags.buildingType === buildingType)
      ),
    [pool, kind, buildingType]
  )
  const floorOptions = useMemo(() => {
    if (apiMode)
      return (apiFilters?.floorCounts ?? []).map((count) => ({
        value: String(count),
        label: t('floorOption', { count })
      }))
    return uniqueOptions(
      scopedPool,
      (template) => template.tags.floorCount,
      (template) => floorCountLabel(template.tags.floorCount, (count) => t('floorOption', { count }))
    )
  }, [apiMode, apiFilters, scopedPool, t])
  const architectureOptions = apiMode
    ? (apiFilters?.architectureStyles ?? []).map((style) => ({ value: style.styleId, label: style.name }))
    : uniqueOptions(
        scopedPool,
        (template) => template.tags.architectureStyle,
        (template) => template.styleLabel
      )
  const interiorOptions = apiMode
    ? (apiFilters?.interiorStyles ?? []).map((style) => ({ value: style.styleId, label: style.name }))
    : uniqueOptions(
        scopedPool,
        (template) => template.tags.interiorStyle,
        (template) => template.styleLabel
      )

  const floorSelectedLabel =
    floorCount === ALL ? t('optionAll') : t('floorOption', { count: floorCountOf(floorCount) ?? 1 })
  const buildingSelectedLabel =
    buildingType === ALL
      ? t('optionAll')
      : (buildingOptions.find((option) => option.value === buildingType)?.label ?? t('optionAll'))

  const results = useMemo(
    () =>
      filterTemplates(pool, {
        kind,
        buildingType: apiMode || buildingType === ALL ? undefined : buildingType,
        floorCount: apiMode || floorCount === ALL ? undefined : floorCount,
        hasAttic: apiMode || tum === ALL ? undefined : tum === 'true',
        architectureStyleIds: apiMode ? undefined : architectureStyleIds,
        interiorStyleIds: apiMode ? undefined : interiorStyleIds,
        query: appliedQuery,
        allowedIds
      }),
    [
      pool,
      kind,
      buildingType,
      floorCount,
      tum,
      architectureStyleIds,
      interiorStyleIds,
      appliedQuery,
      apiMode,
      allowedIds
    ]
  )

  const totalPages = pageCount(results.length, LIBRARY_PAGE_SIZE)
  const safePage = Math.min(page, totalPages)
  const visible = useMemo(() => pageSlice(results, safePage, LIBRARY_PAGE_SIZE), [results, safePage])
  const pagedResults = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => pageSlice(results, index + 1, LIBRARY_PAGE_SIZE)),
    [results, totalPages]
  )
  const shownCount = Math.min(safePage * LIBRARY_PAGE_SIZE, results.length)

  const prefersReducedMotion = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const cancelRunningAnimations = useCallback((preserveTrackPosition = false) => {
    const track = trackRef.current
    const frozenTransform = preserveTrackPosition && track ? getComputedStyle(track).transform : null

    runningAnimationsRef.current.forEach((animation) => animation.cancel())
    runningAnimationsRef.current = []
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    if (pageCommitTimerRef.current) {
      clearTimeout(pageCommitTimerRef.current)
      pageCommitTimerRef.current = null
    }
    pendingKindRef.current = null
    pendingPageRef.current = null

    if (track) {
      if (frozenTransform && frozenTransform !== 'none') track.style.transform = frozenTransform
      track.style.willChange = ''
      track.style.pointerEvents = ''
    }

    const grid = gridRef.current
    if (grid) {
      grid.style.willChange = ''
      grid.style.transform = ''
      grid.style.opacity = ''
    }
  }, [])

  const captureGrid = useCallback(() => {
    const next = new Map<string, DOMRect>()
    gridRef.current?.querySelectorAll<HTMLElement>('[data-template-card-id]').forEach((card) => {
      const id = card.dataset.templateCardId
      if (id) next.set(id, card.getBoundingClientRect())
    })
    previousRectsRef.current = next
    previousContentHeightRef.current = contentRef.current?.getBoundingClientRect().height ?? 0
  }, [])

  const commitFilterChange = useCallback(
    (update: () => void, immediate = false) => {
      cancelRunningAnimations()
      captureGrid()
      changeReasonRef.current = 'filter'

      if (prefersReducedMotion() || immediate) {
        if (trackRef.current) trackRef.current.style.transform = 'translate3d(0,0,0)'
        update()
        setPage(1)
        return
      }

      const cards = [...(gridRef.current?.querySelectorAll<HTMLElement>('[data-template-card-id]') ?? [])]
      if (cards.length === 0) {
        if (trackRef.current) trackRef.current.style.transform = 'translate3d(0,0,0)'
        update()
        setPage(1)
        return
      }

      const exits = cards.map((card) =>
        card.animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0.38, transform: 'scale(0.978)' }
          ],
          { duration: FILTER_EXIT_MS, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }
        )
      )
      runningAnimationsRef.current = exits
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null
        exits.forEach((animation) => animation.cancel())
        runningAnimationsRef.current = []
        if (trackRef.current) trackRef.current.style.transform = 'translate3d(0,0,0)'
        update()
        setPage(1)
      }, FILTER_EXIT_MS - 10)
    },
    [cancelRunningAnimations, captureGrid, prefersReducedMotion]
  )

  const scrollGridIntoComfortView = useCallback(() => {
    const viewport = gridViewportRef.current
    if (!viewport) return false
    const rect = viewport.getBoundingClientRect()
    if (rect.top >= 90) return false
    const top = window.scrollY + rect.top - 96
    window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    return true
  }, [prefersReducedMotion])

  const changePage = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(target, 1), totalPages)
      const currentViewportWidth = gridViewportRef.current?.getBoundingClientRect().width ?? 0
      const targetX = pageOffsetX(next, currentViewportWidth)
      const currentX = trackRef.current
        ? readTranslateX(trackRef.current, pageOffsetX(safePage, currentViewportWidth))
        : targetX
      const alreadyAtTarget = Math.abs(currentX - targetX) < 0.75
      if (next === safePage && pendingPageRef.current === null && alreadyAtTarget) {
        return
      }

      cancelRunningAnimations(true)
      changeReasonRef.current = next > safePage ? 'page-forward' : 'page-back'
      pendingPageRef.current = next

      const reduce = prefersReducedMotion()
      const scrolledToGrid = scrollGridIntoComfortView()

      const runTransition = () => {
        transitionTimerRef.current = null
        if (pendingPageRef.current !== next) return

        const track = trackRef.current
        const viewport = gridViewportRef.current
        if (!track || !viewport) {
          pendingPageRef.current = null
          setPage(next)
          return
        }

        const viewportWidth = viewport.getBoundingClientRect().width
        const baseX = pageOffsetX(safePage, viewportWidth)
        const targetX = pageOffsetX(next, viewportWidth)
        const currentX = readTranslateX(track, baseX)

        if (reduce) {
          cancelRunningAnimations()
          track.style.transform = `translate3d(${targetX}px,0,0)`
          pendingPageRef.current = null
          setPage(next)
          return
        }

        track.style.transform = `translate3d(${currentX}px,0,0)`
        track.style.willChange = 'transform'
        track.style.pointerEvents = 'none'

        const remainingRatio = Math.min(1, Math.abs(targetX - currentX) / Math.max(viewportWidth, 1))
        const duration = Math.max(180, Math.round(PAGE_TRANSITION_MS * Math.max(0.58, remainingRatio)))
        const transition = track.animate(
          [{ transform: `translate3d(${currentX}px,0,0)` }, { transform: `translate3d(${targetX}px,0,0)` }],
          {
            duration,
            easing: 'cubic-bezier(0.22,1,0.36,1)',
            fill: 'both'
          }
        )
        runningAnimationsRef.current = [transition]
        pageCommitTimerRef.current = setTimeout(
          () => {
            pageCommitTimerRef.current = null
            if (pendingPageRef.current === next) setPage(next)
          },
          Math.min(90, Math.round(duration * 0.28))
        )

        transition.onfinish = () => {
          transition.cancel()
          runningAnimationsRef.current = []
          pendingPageRef.current = null
          if (pageCommitTimerRef.current) {
            clearTimeout(pageCommitTimerRef.current)
            pageCommitTimerRef.current = null
          }
          setPage(next)
          const settledWidth = gridViewportRef.current?.getBoundingClientRect().width ?? viewportWidth
          track.style.transform = `translate3d(${pageOffsetX(next, settledWidth)}px,0,0)`
          track.style.willChange = ''
          track.style.pointerEvents = ''
        }
      }

      if (scrolledToGrid && !reduce) {
        transitionTimerRef.current = setTimeout(runTransition, PAGE_SCROLL_LEAD_MS)
      } else {
        runTransition()
      }
    },
    [cancelRunningAnimations, prefersReducedMotion, safePage, scrollGridIntoComfortView, totalPages]
  )

  useLayoutEffect(() => {
    const viewport = gridViewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return

    const syncTrack = () => {
      if (dragRef.current.active || runningAnimationsRef.current.length > 0) return
      const width = viewport.getBoundingClientRect().width
      track.style.transform = `translate3d(${pageOffsetX(safePage, width)}px,0,0)`
    }

    syncTrack()
    const observer = new ResizeObserver(syncTrack)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [safePage, totalPages])

  useLayoutEffect(() => {
    const viewport = gridViewportRef.current
    const activePanel = viewport?.querySelector<HTMLElement>(`[data-template-page-panel="${safePage}"]`)
    if (!viewport || !activePanel) return

    viewportHeightAnimationRef.current?.cancel()
    viewportHeightAnimationRef.current = null

    const currentHeight = viewport.getBoundingClientRect().height
    // `pt-2` on the viewport provides hover headroom above the first card row.
    const targetHeight = activePanel.getBoundingClientRect().height + 8
    if (Math.abs(currentHeight - targetHeight) <= 1) {
      viewport.style.height = `${targetHeight}px`
      return
    }

    if (prefersReducedMotion()) {
      viewport.style.height = `${targetHeight}px`
      return
    }

    const heightAnimation = viewport.animate([{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }], {
      duration: 240,
      easing: 'cubic-bezier(0.22,1,0.36,1)'
    })
    viewport.style.height = `${targetHeight}px`
    viewportHeightAnimationRef.current = heightAnimation
    const clearHeightAnimation = () => {
      if (viewportHeightAnimationRef.current === heightAnimation) viewportHeightAnimationRef.current = null
    }
    void heightAnimation.finished.then(clearHeightAnimation, clearHeightAnimation)

    return () => {
      heightAnimation.cancel()
      clearHeightAnimation()
    }
  }, [pagedResults, prefersReducedMotion, safePage])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (term === appliedQuery) return

    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null
      commitFilterChange(() => setAppliedQuery(term))
    }, SEARCH_DELAY_MS)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [appliedQuery, commitFilterChange, term])

  useLayoutEffect(() => {
    const track = kindTrackRef.current
    const active = kindButtonRefs.current[kind]
    if (!track || !active) return

    const updatePill = () => {
      const trackRect = track.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      setPillStyle({
        transform: `translate3d(${activeRect.left - trackRect.left}px, ${activeRect.top - trackRect.top}px, 0)`,
        width: activeRect.width,
        height: activeRect.height,
        ready: true
      })
    }

    updatePill()
    const observer = new ResizeObserver(updatePill)
    observer.observe(track)
    observer.observe(active)
    return () => observer.disconnect()
  }, [kind])

  useLayoutEffect(() => {
    if (isPending) return

    const content = contentRef.current
    const grid = gridRef.current
    const reason = changeReasonRef.current
    const reduce = prefersReducedMotion()
    const animations: Animation[] = []

    if (content && previousContentHeightRef.current > 0 && !reduce) {
      const nextHeight = content.getBoundingClientRect().height
      if (Math.abs(nextHeight - previousContentHeightRef.current) > 2) {
        const heightAnimation = content.animate(
          [
            { height: `${previousContentHeightRef.current}px`, overflow: 'hidden' },
            { height: `${nextHeight}px`, overflow: 'hidden' }
          ],
          { duration: GRID_MOTION_MS, easing: 'cubic-bezier(0.22,1,0.36,1)' }
        )
        const clearContentMotion = () => {
          content.style.height = ''
          content.style.overflow = ''
        }
        void heightAnimation.finished.then(clearContentMotion, clearContentMotion)
        animations.push(heightAnimation)
      }
    }

    if (grid && !reason.startsWith('page')) {
      const cards = [...grid.querySelectorAll<HTMLElement>('[data-template-card-id]')]
      cards.forEach((card, index) => {
        const id = card.dataset.templateCardId ?? ''
        const previous = previousRectsRef.current.get(id)
        const current = card.getBoundingClientRect()

        if (reduce) {
          card.style.opacity = ''
          card.style.transform = ''
          return
        }

        if (previous && reason === 'filter') {
          const dx = previous.left - current.left
          const dy = previous.top - current.top
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            animations.push(
              card.animate(
                [
                  { opacity: 0.82, transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.99)` },
                  { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }
                ],
                { duration: GRID_MOTION_MS, easing: 'cubic-bezier(0.22,1,0.36,1)' }
              )
            )
          } else {
            animations.push(
              card.animate([{ opacity: 0.72 }, { opacity: 1 }], {
                duration: 180,
                easing: 'ease-out'
              })
            )
          }
        } else {
          const delay = Math.min(index, 7) * 34
          animations.push(
            card.animate(
              [
                { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(0.985)' },
                { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }
              ],
              { duration: 270, delay, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'backwards' }
            )
          )
        }

        const figure = card.querySelector<HTMLElement>('[data-template-card-figure]')
        if (figure && !previous) {
          animations.push(
            figure.animate([{ opacity: 0.35 }, { opacity: 1 }], {
              duration: 240,
              delay: 70 + Math.min(index, 7) * 24,
              easing: 'ease-out',
              fill: 'backwards'
            })
          )
        }
      })
    }

    runningAnimationsRef.current = animations
    previousRectsRef.current = new Map()
    previousContentHeightRef.current = 0
    changeReasonRef.current = 'initial'
  }, [
    appliedQuery,
    buildingType,
    isPending,
    kind,
    page,
    prefersReducedMotion,
    floorCount,
    tum,
    architectureStyleIds,
    interiorStyleIds,
    visible
  ])

  useEffect(() => {
    if (isPending) return

    let restoreFrame = 0
    let scrollFrame = 0
    let settleFrame = 0

    const restoreFromHistory = () => {
      const stored = window.history.state?.[HANDBOOK_TEMPLATE_LIBRARY_HISTORY_KEY] as LibraryRestoreState | undefined
      if (!stored) return

      cancelAnimationFrame(restoreFrame)
      cancelAnimationFrame(scrollFrame)
      cancelAnimationFrame(settleFrame)

      restoreFrame = requestAnimationFrame(() => {
        changeReasonRef.current = 'restore'
        setKind(stored.kind)
        setBuildingType(stored.buildingType)
        setFloorCount(stored.floorCount ?? ALL)
        setTum(stored.tum ?? ALL)
        setArchitectureStyleIds(stored.architectureStyleIds ?? [])
        setInteriorStyleIds(stored.interiorStyleIds ?? [])
        setTerm(stored.term)
        setAppliedQuery(stored.appliedQuery)
        setPage(stored.page)

        // Keep the history payload alive until the restored state has actually
        // committed. Next.js can preserve this client component while moving to
        // a detail route, so Back must react to `popstate` as well as a fresh
        // mount. Nested RAFs give the restored grid its final height before the
        // saved scroll position is reapplied.
        scrollFrame = requestAnimationFrame(() => {
          settleFrame = requestAnimationFrame(() => {
            window.scrollTo({ top: stored.scrollY, behavior: 'auto' })

            const rawMarker = window.sessionStorage.getItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY)
            if (rawMarker) {
              try {
                const marker = JSON.parse(rawMarker) as TemplateReturnMarker
                const card = document.querySelector<HTMLElement>(
                  `[data-template-card-id="${CSS.escape(marker.templateId)}"]`
                )
                if (card && Date.now() - marker.createdAt < 30 * 60 * 1000) {
                  if (!prefersReducedMotion()) {
                    card.animate(
                      [
                        { boxShadow: '0 0 0 0 color-mix(in oklch, var(--primary) 0%, transparent)' },
                        { boxShadow: '0 0 0 3px color-mix(in oklch, var(--primary) 36%, transparent)', offset: 0.28 },
                        { boxShadow: '0 0 0 0 color-mix(in oklch, var(--primary) 0%, transparent)' }
                      ],
                      { duration: 720, easing: 'cubic-bezier(0.22,1,0.36,1)' }
                    )
                  }
                  window.sessionStorage.removeItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY)
                }
              } catch {
                window.sessionStorage.removeItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY)
              }
            }

            const nextState = { ...window.history.state }
            delete nextState[HANDBOOK_TEMPLATE_LIBRARY_HISTORY_KEY]
            window.history.replaceState(nextState, '')
          })
        })
      })
    }

    restoreFromHistory()
    window.addEventListener('popstate', restoreFromHistory)

    return () => {
      window.removeEventListener('popstate', restoreFromHistory)
      cancelAnimationFrame(restoreFrame)
      cancelAnimationFrame(scrollFrame)
      cancelAnimationFrame(settleFrame)
    }
  }, [isPending, prefersReducedMotion])

  useEffect(
    () => () => {
      cancelRunningAnimations()
      viewportHeightAnimationRef.current?.cancel()
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    },
    [cancelRunningAnimations]
  )

  const saveHistoryState = useCallback(
    (templateId?: string) => {
      const value: LibraryRestoreState = {
        kind,
        buildingType,
        floorCount,
        tum,
        architectureStyleIds,
        interiorStyleIds,
        term,
        appliedQuery,
        page: safePage,
        scrollY: window.scrollY
      }
      window.history.replaceState({ ...window.history.state, [HANDBOOK_TEMPLATE_LIBRARY_HISTORY_KEY]: value }, '')
      if (templateId) {
        const marker: TemplateReturnMarker = { templateId, createdAt: Date.now() }
        window.sessionStorage.setItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY, JSON.stringify(marker))
      }
    },
    [appliedQuery, buildingType, kind, safePage, floorCount, tum, architectureStyleIds, interiorStyleIds, term]
  )

  const handleBlocked = useCallback((templateId: string) => {
    setQuotaShakeNonce((value) => value + 1)
    setBlockedTemplateId(templateId)
    setQuotaDialogOpen(true)
  }, [])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('input,textarea,[role="combobox"],[role="listbox"],[contenteditable="true"]')) return
    if (target.closest('button') && !target.closest('[data-template-page-dot]')) return
    const navigationPage = pendingPageRef.current ?? safePage
    if (event.key === 'ArrowRight' && navigationPage < totalPages) {
      event.preventDefault()
      changePage(navigationPage + 1)
    }
    if (event.key === 'ArrowLeft' && navigationPage > 1) {
      event.preventDefault()
      changePage(navigationPage - 1)
    }
  }

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const root = rootRef.current
      if (!root) return
      const tabPanel = root.closest<HTMLElement>('[role="tabpanel"]')
      if (tabPanel?.dataset.state !== 'active') return

      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.closest('input,textarea,[role="combobox"],[role="listbox"],[contenteditable="true"]')) return
      if (target?.closest('button') && !target.closest('[data-template-page-dot]')) return

      const navigationPage = pendingPageRef.current ?? safePage
      if (event.key === 'ArrowRight' && navigationPage < totalPages) {
        event.preventDefault()
        changePage(navigationPage + 1)
      } else if (event.key === 'ArrowLeft' && navigationPage > 1) {
        event.preventDefault()
        changePage(navigationPage - 1)
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => window.removeEventListener('keydown', onWindowKeyDown)
  }, [changePage, rootRef, safePage, totalPages])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    const gesturePage = pendingPageRef.current ?? safePage
    cancelRunningAnimations(true)
    if (gesturePage !== safePage) setPage(gesturePage)
    const viewportWidth = gridViewportRef.current?.getBoundingClientRect().width ?? 0
    const baseX = trackRef.current
      ? readTranslateX(trackRef.current, pageOffsetX(gesturePage, viewportWidth))
      : pageOffsetX(gesturePage, viewportWidth)
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX,
      page: gesturePage,
      deltaX: 0,
      axis: 'pending'
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    const viewport = gridViewportRef.current
    if (!drag.active || drag.pointerId !== event.pointerId || !track || !viewport) return
    const rawX = event.clientX - drag.startX
    const rawY = event.clientY - drag.startY

    if (drag.axis === 'pending') {
      if (Math.max(Math.abs(rawX), Math.abs(rawY)) < 7) return
      drag.axis = Math.abs(rawX) > Math.abs(rawY) * 1.08 ? 'horizontal' : 'vertical'
    }
    if (drag.axis !== 'horizontal') return

    let delta = rawX
    const atStart = drag.page <= 1 && delta > 0
    const atEnd = drag.page >= totalPages && delta < 0
    if (atStart || atEnd) delta *= 0.24
    drag.deltaX = delta
    track.style.transform = `translate3d(${drag.baseX + delta}px,0,0)`
  }

  const snapTrackBack = useCallback(
    (delta: number) => {
      const track = trackRef.current
      const viewport = gridViewportRef.current
      if (!track || !viewport) return
      cancelRunningAnimations(true)

      const width = viewport.getBoundingClientRect().width
      const baseX = pageOffsetX(dragRef.current.page, width)
      const startX = baseX + delta

      if (prefersReducedMotion()) {
        track.style.transform = `translate3d(${baseX}px,0,0)`
        return
      }

      const overshoot = delta === 0 ? 0 : Math.sign(delta) * -3
      const duration = Math.min(260, 170 + Math.abs(delta) * 0.22)
      track.style.transform = `translate3d(${startX}px,0,0)`
      const snap = track.animate(
        [
          { transform: `translate3d(${startX}px,0,0)` },
          { transform: `translate3d(${baseX + overshoot}px,0,0)`, offset: 0.78 },
          { transform: `translate3d(${baseX}px,0,0)` }
        ],
        { duration, easing: 'cubic-bezier(0.2,0.8,0.2,1)' }
      )
      runningAnimationsRef.current = [snap]
      snap.onfinish = () => {
        snap.cancel()
        runningAnimationsRef.current = runningAnimationsRef.current.filter((animation) => animation !== snap)
        track.style.transform = `translate3d(${baseX}px,0,0)`
      }
    },
    [cancelRunningAnimations, prefersReducedMotion]
  )

  const finishSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return
    drag.active = false
    const delta = drag.deltaX
    drag.deltaX = 0
    const axis = drag.axis
    drag.axis = 'pending'

    if (axis !== 'horizontal') {
      snapTrackBack(delta)
      return
    }

    const viewportWidth = gridViewportRef.current?.getBoundingClientRect().width ?? 0
    const threshold = Math.min(72, Math.max(48, viewportWidth * 0.16))
    const canGoForward = delta < 0 && drag.page < totalPages
    const canGoBack = delta > 0 && drag.page > 1

    if (Math.abs(delta) < threshold || (!canGoForward && !canGoBack)) {
      snapTrackBack(delta)
      return
    }

    if (canGoForward) changePage(drag.page + 1)
    if (canGoBack) changePage(drag.page - 1)
  }

  const cancelSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return
    drag.active = false
    const delta = drag.deltaX
    drag.deltaX = 0
    drag.axis = 'pending'
    snapTrackBack(delta)
  }

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='space-y-5'
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {/* Banner đồng bộ với tab Tin tức (foundation-block): cùng khung viền, bo góc, khoảng đệm,
          ảnh phủ nền, phía trái mờ dần để chữ nằm trên nền ảnh. */}
      <section ref={bannerRef} data-library-banner className='border-primary/40 bg-card rounded-2xl border p-5'>
        <div className='relative isolate overflow-hidden rounded-xl'>
          <Photo
            className='foundation-hero-motion absolute inset-0 -z-10 size-full transition-[filter] duration-300 motion-reduce:!filter-none'
            imageClassName='object-[70%_center]'
            src={bannerImage}
            alt=''
            priority
            sizes='(max-width: 1440px) 100vw, 1400px'
          />
          <div
            aria-hidden
            className='bg-background/80 md:from-background md:via-background/70 absolute inset-0 -z-10 md:bg-transparent md:bg-gradient-to-r md:to-transparent'
          />
          {/* Cao tối thiểu bằng banner tab Tin tức (378px) — tab đó có thêm kicker và nút nên cao hơn. */}
          <div className='flex flex-col justify-center px-6 py-10 sm:px-10 md:min-h-[23.625rem] md:py-14 lg:px-12'>
            <div className='max-w-2xl space-y-3'>
              <h2
                data-library-banner-sequence
                className='text-primary-strong text-2xl leading-[1.2] font-bold tracking-tight whitespace-pre-line sm:text-3xl lg:text-4xl'
              >
                {t('bannerTitle')}
              </h2>
              <p
                data-library-banner-sequence
                className='text-foreground/75 max-w-md text-sm leading-relaxed sm:text-base'
              >
                {t('bannerDescription')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        data-template-toolbar
        data-entrance-step='0'
        data-entrance-from='soft-scale'
        className='bg-card space-y-4 rounded-xl border p-3 sm:p-4'
      >
        <div
          data-template-toolbar-main
          className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto]'
        >
          <div
            ref={kindTrackRef}
            data-template-kind-toggle
            data-entrance-step='1'
            data-entrance-order='0'
            className='bg-muted relative inline-flex w-fit max-w-full flex-nowrap rounded-full p-1'
          >
            <span
              data-template-kind-pill
              data-ready={pillStyle.ready}
              className='brand-green-button pointer-events-none absolute top-0 left-0 rounded-full'
              style={{
                transform: pillStyle.transform,
                width: pillStyle.width,
                height: pillStyle.height
              }}
            />
            {(['2d', '3d'] as const).map((option) => (
              <button
                key={option}
                ref={(node) => {
                  kindButtonRefs.current[option] = node
                }}
                type='button'
                data-template-kind-button={option}
                onClick={() => {
                  if (option === kind) {
                    if (pendingKindRef.current !== null) cancelRunningAnimations()
                    return
                  }
                  commitFilterChange(() => {
                    pendingKindRef.current = null
                    setKind(option)
                    setBuildingType(ALL)
                    setFloorCount(ALL)
                    setTum(ALL)
                    setArchitectureStyleIds([])
                    setInteriorStyleIds([])
                  })
                  if (transitionTimerRef.current) pendingKindRef.current = option
                }}
                aria-pressed={kind === option}
                aria-label={t(`kind.${option}`)}
                className={cn(
                  // `whitespace-nowrap shrink-0`: tuyệt đối không rớt dòng ("Mẫu bản vẽ / 2D") ở màn nhỏ như iPhone;
                  // đệm ngang thu nhỏ ở mobile để cặp nút vẫn vừa một hàng.
                  'relative z-10 min-h-10 shrink-0 rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 sm:px-5',
                  kind === option ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className='sm:hidden'>{t(`kindShort.${option}`)}</span>
                <span className='hidden sm:inline'>{t(`kind.${option}`)}</span>
              </button>
            ))}
          </div>

          <div
            data-template-search
            data-entrance-step='1'
            data-entrance-order='3'
            className='group/search relative col-span-2 row-start-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1'
          >
            <Search className='text-muted-foreground group-focus-within/search:text-primary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors' />
            <Input
              value={term}
              onChange={(event) => {
                setTerm(event.target.value)
              }}
              placeholder={kind === '2d' ? t('searchPlaceholder2d') : t('searchPlaceholder3d')}
              className='bg-background focus:border-primary focus:ring-primary/15 h-11 rounded-lg pl-9 shadow-none transition-[border-color,box-shadow] duration-200 focus:ring-2 focus-visible:border-primary'
            />
          </div>

          <div
            data-entrance-step='1'
            data-entrance-order='4'
            className='col-start-2 row-start-1 justify-self-end md:col-start-3'
          >
            <QuotaBadge
              className='whitespace-nowrap px-2.5 py-2 shadow-none'
              scope='lookup'
              shakeNonce={quotaShakeNonce}
            />
          </div>
        </div>
        <div
          data-template-filter-fields
          className={cn('grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-3', kind === '3d' && 'lg:grid-cols-5')}
        >
          <div className='col-span-2 min-w-0 space-y-1.5 sm:col-span-1'>
            <label htmlFor='library-buildingType-filter' className='text-muted-foreground block text-xs font-medium'>
              {t('filterLabels.buildingType')}
            </label>
            <Select
              value={buildingType}
              onValueChange={(value) =>
                commitFilterChange(() => {
                  setBuildingType(value)
                  setFloorCount(ALL)
                  setArchitectureStyleIds([])
                  setInteriorStyleIds([])
                })
              }
              disabled={apiMode && filterOptions.isPending}
            >
              <SelectTrigger
                id='library-buildingType-filter'
                data-template-select
                data-entrance-step='1'
                data-entrance-order='1'
                className='bg-background w-full min-w-0 rounded-lg shadow-none transition-colors data-[size=default]:h-11'
              >
                <span className='truncate'>{buildingSelectedLabel}</span>
              </SelectTrigger>
              <SelectContent
                data-template-select-content
                className='data-[state=closed]:duration-150 data-[state=open]:duration-220'
              >
                <SelectItem value={ALL}>{t('optionAll')}</SelectItem>
                {buildingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='min-w-0 space-y-1.5'>
            <label htmlFor='library-floorCount-filter' className='text-muted-foreground block text-xs font-medium'>
              {t('filterLabels.floors')}
            </label>
            <Select
              value={floorCount}
              onValueChange={(value) => commitFilterChange(() => setFloorCount(value))}
              disabled={apiMode && filterOptions.isPending}
            >
              <SelectTrigger
                id='library-floorCount-filter'
                data-template-select
                data-entrance-step='1'
                data-entrance-order='2'
                className='bg-background w-full min-w-0 rounded-lg shadow-none transition-colors data-[size=default]:h-11'
              >
                <span key={kind} data-template-secondary-label className='truncate'>
                  {floorSelectedLabel}
                </span>
              </SelectTrigger>
              <SelectContent
                data-template-select-content
                className='data-[state=closed]:duration-150 data-[state=open]:duration-220'
              >
                <SelectItem value={ALL}>{t('optionAll')}</SelectItem>
                {floorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='min-w-0 space-y-1.5'>
            <label htmlFor='library-tum-filter' className='text-muted-foreground block text-xs font-medium'>
              {t('filterLabels.tum')}
            </label>
            <Select value={tum} onValueChange={(value) => commitFilterChange(() => setTum(value))}>
              <SelectTrigger
                id='library-tum-filter'
                data-template-tum-filter
                className='bg-background w-full min-w-0 rounded-lg shadow-none data-[size=default]:h-11'
              >
                <span className='truncate'>
                  {tum === ALL ? t('optionAll') : t(tum === 'true' ? 'withTum' : 'withoutTum')}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('optionAll')}</SelectItem>
                <SelectItem value='true'>{t('withTum')}</SelectItem>
                <SelectItem value='false'>{t('withoutTum')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === '3d' ? (
            <>
              <LibraryStyleFilter
                group='architecture'
                options={architectureOptions}
                value={architectureStyleIds}
                onChange={(value) => commitFilterChange(() => setArchitectureStyleIds(value), true)}
                disabled={apiMode && filterOptions.isPending}
              />
              <LibraryStyleFilter
                group='interior'
                options={interiorOptions}
                value={interiorStyleIds}
                onChange={(value) => commitFilterChange(() => setInteriorStyleIds(value), true)}
                disabled={apiMode && filterOptions.isPending}
              />
            </>
          ) : null}
        </div>
      </div>

      <div ref={contentRef} data-template-library-content>
        {apiMode && kind === '3d' && (styleOptions.isError || templateStyles.isError) ? (
          <div className='mb-4 flex flex-wrap items-center gap-3' role='status'>
            <p className='text-destructive text-sm'>{tDetail('loadError')}</p>
            <Button
              variant='outline'
              onClick={() => {
                if (styleOptions.isError) void styleOptions.refetch()
                if (templateStyles.isError) void templateStyles.refetch()
              }}
            >
              {tDetail('retry')}
            </Button>
          </div>
        ) : null}
        {isPending || (apiMode && filterActive && filteredIds.isPending) ? (
          <div data-handbook-loading='true' className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4' aria-hidden='true'>
            {Array.from({ length: LIBRARY_PAGE_SIZE }).map((_, index) => (
              <div key={index} className='bg-card h-full overflow-hidden rounded-xl border'>
                <Skeleton className='handbook-skeleton animate-none aspect-3/2 w-full rounded-none' />
                <div className='space-y-2 p-3'>
                  <Skeleton className='handbook-skeleton animate-none h-4 w-4/5' />
                  <Skeleton className='handbook-skeleton animate-none h-3 w-2/3' />
                  <div className='flex items-center gap-2 pt-0.5'>
                    <Skeleton className='handbook-skeleton animate-none h-5 w-16 rounded-full' />
                    <Skeleton className='handbook-skeleton animate-none h-5 w-14 rounded-full' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError || (apiMode && (filterOptions.isError || (filterActive && filteredIds.isError))) ? (
          <ErrorState
            title={tDetail('loadError')}
            description={tDetail('loadErrorHint')}
            retryLabel={tDetail('retry')}
            onRetry={() => {
              if (isError) void refetch()
              if (filterOptions.isError) void filterOptions.refetch()
              if (filterActive && filteredIds.isError) void filteredIds.refetch()
            }}
          />
        ) : visible.length === 0 ? (
          <EmptyState title={t('empty.title')} description={t('empty.description')} />
        ) : (
          <>
            <div
              ref={gridViewportRef}
              data-template-grid-viewport
              className='relative -mt-2 touch-pan-y overflow-hidden pt-2'
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishSwipe}
              onPointerCancel={cancelSwipe}
            >
              <div ref={trackRef} data-template-page-track className='flex w-full items-start'>
                {pagedResults.map((pageTemplates, pageIndex) => {
                  const pageNumber = pageIndex + 1
                  const activePage = pageNumber === safePage
                  return (
                    <div
                      key={pageNumber}
                      data-template-page-panel={pageNumber}
                      aria-hidden={!activePage}
                      inert={!activePage}
                      className='w-full shrink-0'
                    >
                      <div
                        ref={activePage ? gridRef : undefined}
                        data-template-grid={activePage ? '' : undefined}
                        className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
                      >
                        {pageTemplates.map((template, index) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            styles={templateStyles.data?.[template.id]}
                            stylesPending={
                              apiMode && kind === '3d' && (styleOptions.isPending || templateStyles.isPending)
                            }
                            stylesError={apiMode && kind === '3d' && (styleOptions.isError || templateStyles.isError)}
                            entranceOrder={pageIndex === 0 ? index : undefined}
                            searchQuery={appliedQuery}
                            onConsumeQuota={lookupQuota.isPending ? undefined : lookupQuota.consume}
                            onQuotaBlocked={handleBlocked}
                            onNavigate={saveHistoryState}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div data-entrance-step='3' className='relative mt-5 flex flex-wrap items-center justify-between gap-4'>
              <p
                key={`${safePage}-${shownCount}-${results.length}`}
                data-template-result-count
                className='text-muted-foreground text-sm'
              >
                {t('resultCount', { shown: shownCount, total: results.length })}
              </p>

              {totalPages > 1 ? (
                <nav
                  data-template-pagination
                  className='inset-x-0 flex items-center justify-center gap-2 sm:absolute'
                  aria-label={t('pagination')}
                >
                  {/* Góp ý BuildX: số trang + mũi tên trước/sau thay cho chấm tròn không có số. */}
                  <button
                    type='button'
                    onClick={() => changePage(safePage - 1)}
                    disabled={safePage <= 1}
                    aria-label={t('prevPage')}
                    className='hover:bg-accent flex size-8 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40'
                  >
                    <ChevronLeft className='size-4' />
                  </button>
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const target = index + 1
                    const active = target === safePage
                    return (
                      <button
                        key={target}
                        type='button'
                        data-template-page-dot
                        data-active={active}
                        onClick={() => changePage(target)}
                        aria-current={active ? 'page' : undefined}
                        aria-label={t('goToPage', { page: target })}
                        className={cn(
                          'flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none',
                          active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-foreground'
                        )}
                      >
                        {target}
                      </button>
                    )
                  })}
                  <button
                    type='button'
                    onClick={() => changePage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    aria-label={t('nextPage')}
                    className='hover:bg-accent flex size-8 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40'
                  >
                    <ChevronRight className='size-4' />
                  </button>
                </nav>
              ) : null}
            </div>
          </>
        )}
      </div>

      <TemplateLookupExhaustedDialog
        open={quotaDialogOpen}
        onOpenChange={setQuotaDialogOpen}
        template={blockedTemplateId ? (pool.find((template) => template.id === blockedTemplateId) ?? null) : null}
        total={lookupQuota.total}
        period={lookupQuota.period}
        planTier={lookupQuota.planTier}
      />
    </div>
  )
}

function pageOffsetX(page: number, viewportWidth: number): number {
  return -(Math.max(page, 1) - 1) * viewportWidth
}

function readTranslateX(element: HTMLElement, fallback = 0): number {
  const transform = getComputedStyle(element).transform
  if (!transform || transform === 'none') return fallback

  try {
    return new DOMMatrixReadOnly(transform).m41
  } catch {
    return fallback
  }
}

interface Option {
  value: string
  label: string
}

function uniqueOptions(
  templates: readonly HandbookTemplate[],
  getValue: (template: HandbookTemplate) => string | undefined,
  getLabel: (template: HandbookTemplate) => string
): Option[] {
  const seen = new Map<string, string>()
  for (const template of templates) {
    const value = getValue(template)
    if (!value || seen.has(value)) continue
    seen.set(value, getLabel(template))
  }
  return [...seen].map(([value, label]) => ({ value, label }))
}

function floorCountLabel(tag: string | undefined, format: (count: number) => string): string {
  if (!tag) return format(1)
  return format(floorCountOf(tag) ?? 1)
}
