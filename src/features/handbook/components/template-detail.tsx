'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Maximize2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'

import { Link, useRouter } from '@/i18n/navigation'
import { useAuth, useAuthDialogStore } from '@/shared/auth'
import { ErrorState } from '@/shared/components/common'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/shared/components/ui/breadcrumb'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES } from '@/shared/constants/routes'
import { FavoriteButton } from '@/shared/favorite'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import {
  HANDBOOK_DETAIL_CONSULT_PULSE_SESSION_KEY,
  HANDBOOK_TEMPLATE_RETURN_SESSION_KEY
} from '../constants/handbook.constants'
import { LibraryAccessDeniedError } from '../api/handbook.bmt'
import {
  useHandbookDetailQuota,
  useHandbookLibraryFilters,
  useHandbookTemplate,
  useHandbookTemplates,
  useHandbookTemplateStyles
} from '../hooks/use-handbook'
import { useTemplateClassification } from '../hooks/use-template-classification'
import { selectSimilarTemplates } from '../services/handbook.service'
import { useHandbookReadStore } from '../store/handbook-read.store'
import type { HandbookTemplate } from '../types/handbook.types'
import { ConsultButton } from './consult-button'
import { FloorSwitcher, resolveFloor } from './floor-switcher'
import { QuotaBadge } from './quota-badge'
import { TemplateAttachments } from './template-attachments'
import { TemplateFigure } from './template-figure'
import { TemplateInfo } from './template-info'
import { TemplateDetailCtaPopup } from './template-detail-cta-popup'
import { TemplateCategoryBadges } from './template-category-badges'

const CONSULT_IDLE_MS = 4800
const SIMILAR_BLOCK_SHAKE_MS = 520

type DetailViewStatus = 'pending' | 'consumed' | 'seen' | 'blocked'

interface TemplateReturnMarker {
  templateId: string
  createdAt: number
}

/**
 * Trang chi tiết mẫu — dùng chung cho mẫu bản vẽ 2D (Phần 2.3, Hình 7) và mẫu
 * nội thất 3D (Phần 2.4, Hình 8).
 */
export function TemplateDetail({ templateId }: { templateId: string }) {
  const t = useTranslations('handbook.detail')
  const tInfo = useTranslations('handbook.info')
  const tQuota = useTranslations('handbook.quota')
  const router = useRouter()
  const [activeTemplateId, setActiveTemplateId] = useState(templateId)
  const [selection, setSelection] = useState({ templateId: '', floorId: '' })
  const [detailViewStatus, setDetailViewStatus] = useState<DetailViewStatus>('pending')
  const [blockedSimilarId, setBlockedSimilarId] = useState<string | null>(null)
  const [similarVisible, setSimilarVisible] = useState(false)
  const [similarRevealDone, setSimilarRevealDone] = useState(false)
  const [similarSourceId, setSimilarSourceId] = useState(templateId)
  const [floorControlsSourceId, setFloorControlsSourceId] = useState(templateId)
  const [inPlaceTransitionActive, setInPlaceTransitionActive] = useState(false)
  const [consultPulse, setConsultPulse] = useState(false)
  const [showMobileConsult, setShowMobileConsult] = useState(false)

  const markRead = useHandbookReadStore((state) => state.markRead)
  const { data: pool, isPending: isPoolPending } = useHandbookTemplates()
  const { isAuthenticated, isInitialized } = useAuth()
  // Mẫu đến từ BMT API (`source: 'bmt'`) yêu cầu đăng nhập mới xem chi tiết. Chưa
  // đăng nhập thì dựng cổng đăng nhập và KHÔNG gọi `getTemplate` (không trừ lượt).
  // Mẫu mock (không có cờ) vẫn xem công khai như cũ.
  const poolTemplate = pool?.find((item) => item.id === activeTemplateId)
  const isApiTemplate = poolTemplate?.source === 'bmt'
  const needsLogin = isApiTemplate && isInitialized && !isAuthenticated
  const initialQuery = useHandbookTemplate(activeTemplateId, { enabled: !needsLogin })
  const detailQuota = useHandbookDetailQuota()

  const template = useMemo(() => {
    const fromPool = pool?.find((item) => item.id === activeTemplateId)
    // Summary không có phong cách/section. Luôn đọc chi tiết của mẫu đang xem,
    // kể cả khi chuyển qua Mẫu tương tự, và chờ bản đầy đủ trước khi hiển thị.
    if (fromPool?.source === 'bmt') return initialQuery.data
    return fromPool ?? initialQuery.data
  }, [activeTemplateId, initialQuery.data, pool])
  const classification = useTemplateClassification(template)
  const isPending = initialQuery.isPending && !template
  const isError = initialQuery.isError && !template
  const similarSourceTemplate = useMemo(
    () =>
      pool?.find((item) => item.id === similarSourceId) ?? (template?.id === similarSourceId ? template : undefined),
    [pool, similarSourceId, template]
  )
  const similar = useMemo(
    () => (pool && similarSourceTemplate ? selectSimilarTemplates(pool, similarSourceTemplate) : []),
    [pool, similarSourceTemplate]
  )
  const hasApiSimilarStyles = similar.some((item) => item.source === 'bmt' && item.kind === '3d')
  const similarStyleOptions = useHandbookLibraryFilters('3d', hasApiSimilarStyles)
  const similarStyles = useHandbookTemplateStyles(similarStyleOptions.data, hasApiSimilarStyles)
  const similarStylesError = hasApiSimilarStyles && (similarStyleOptions.isError || similarStyles.isError)
  const similarStylesPending = hasApiSimilarStyles && (similarStyleOptions.isPending || similarStyles.isPending)
  // Ưu tiên `template` khi trùng id: mẫu API trong `pool` chỉ là bản tóm tắt (`floors: []`), nếu lấy từ `pool` trước
  // thì dải ảnh xem trước (thumbnail) và nút chuyển tầng của mẫu thật biến mất.
  const floorControlsTemplate = useMemo(
    () =>
      (template?.id === floorControlsSourceId ? template : undefined) ??
      pool?.find((item) => item.id === floorControlsSourceId) ??
      template,
    [floorControlsSourceId, pool, template]
  )

  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`handbook.detail.${templateId}`, {
    enabled: !isPending && Boolean(template),
    offsetMs: 120
  })

  const headerDataRef = useRef<HTMLDivElement>(null)
  const mediaSwapRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const similarRef = useRef<HTMLElement>(null)
  const realConsultRef = useRef<HTMLDivElement>(null)
  const quotaAppliedRef = useRef('')
  const swapRunRef = useRef(0)
  const swapAnimationsRef = useRef<Animation[]>([])
  const detailViewTransitionRef = useRef<{ skipTransition: () => void; finished: Promise<void> } | null>(null)
  const pendingIncomingRef = useRef(false)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mobileScrollFrameRef = useRef(0)
  const swapScrollFrameRef = useRef(0)

  const prefersReducedMotion = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const cancelSwapAnimations = useCallback((preserveFrame = false) => {
    if (swapScrollFrameRef.current) {
      cancelAnimationFrame(swapScrollFrameRef.current)
      swapScrollFrameRef.current = 0
    }
    for (const animation of swapAnimationsRef.current) {
      if (preserveFrame && animation.playState !== 'idle') {
        try {
          animation.commitStyles()
        } catch {
          // Detached targets are safe to cancel without committing.
        }
      }
      animation.cancel()
    }
    swapAnimationsRef.current = []
    if (!preserveFrame) {
      const media = mediaSwapRef.current
      media?.style.removeProperty('height')
      media?.style.removeProperty('overflow')
      media?.style.removeProperty('will-change')
    }
  }, [])

  const updateLocalizedDetailUrl = useCallback((id: string) => {
    const nextPath = window.location.pathname.replace(/\/mau\/[^/]+\/?$/, `/mau/${id}`)
    window.history.replaceState(window.history.state, '', `${nextPath}${window.location.search}${window.location.hash}`)
  }, [])

  const updateReturnMarker = useCallback((id: string) => {
    const raw = window.sessionStorage.getItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY)
    if (!raw) return
    try {
      const current = JSON.parse(raw) as TemplateReturnMarker
      const marker: TemplateReturnMarker = { templateId: id, createdAt: current.createdAt || Date.now() }
      window.sessionStorage.setItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY, JSON.stringify(marker))
    } catch {
      window.sessionStorage.removeItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY)
    }
  }, [])

  useEffect(() => {
    if (!template) return
    markRead(template.id)
    if (quotaAppliedRef.current === template.id) return
    quotaAppliedRef.current = template.id
    setDetailViewStatus('pending')
    const result = detailQuota.consume(template.id)
    setDetailViewStatus(result)
  }, [detailQuota, markRead, template])

  useLayoutEffect(() => {
    if (!pendingIncomingRef.current) return
    pendingIncomingRef.current = false

    const header = headerDataRef.current
    const media = mediaSwapRef.current
    const aside = asideRef.current
    if (!header || !media || !aside) return

    if (prefersReducedMotion()) {
      for (const node of [header, media, aside]) {
        node.style.removeProperty('opacity')
        node.style.removeProperty('transform')
      }
      media.style.removeProperty('height')
      media.style.removeProperty('overflow')
      media.style.removeProperty('will-change')
      return
    }

    const mediaFromHeight = media.getBoundingClientRect().height

    // Non-View-Transition fallback: measure the incoming viewer before paint
    // and keep its shell stable while the content fades/slides into place.
    media.style.height = 'auto'
    const mediaToHeight = media.getBoundingClientRect().height
    media.style.height = `${mediaFromHeight}px`

    const definitions: Array<[HTMLElement, Keyframe[]]> = [
      [
        header,
        [
          { opacity: 0, transform: 'translate3d(0,6px,0)' },
          { opacity: 1, transform: 'translate3d(0,0,0)' }
        ]
      ],
      [
        media,
        [
          { opacity: 0, transform: 'translate3d(22px,0,0)' },
          { opacity: 1, transform: 'translate3d(0,0,0)' }
        ]
      ],
      [
        aside,
        [
          { opacity: 0, transform: 'translate3d(18px,0,0)' },
          { opacity: 1, transform: 'translate3d(0,0,0)' }
        ]
      ]
    ]

    const animations = definitions.map(([node, frames], index) => {
      const animation = node.animate(frames, {
        duration: index === 1 ? 320 : 260,
        easing: 'cubic-bezier(0.22,1,0.36,1)'
      })
      return animation
    })

    const animateHeight = (node: HTMLElement, from: number, to: number) => {
      if (Math.abs(from - to) < 0.5) return null
      node.style.willChange = 'height'
      return node.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: 320,
        easing: 'cubic-bezier(0.22,1,0.36,1)'
      })
    }
    const mediaHeightAnimation = animateHeight(media, mediaFromHeight, mediaToHeight)
    if (mediaHeightAnimation) animations.push(mediaHeightAnimation)
    swapAnimationsRef.current = animations

    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (swapAnimationsRef.current !== animations) return
      for (const animation of animations) animation.cancel()
      swapAnimationsRef.current = []
      for (const node of [header, media, aside]) {
        node.style.removeProperty('opacity')
        node.style.removeProperty('transform')
      }
      media.style.removeProperty('height')
      media.style.removeProperty('overflow')
      media.style.removeProperty('will-change')
      window.setTimeout(() => setSimilarSourceId(activeTemplateId), 0)
      window.setTimeout(() => setFloorControlsSourceId(activeTemplateId), 0)
    })
  }, [activeTemplateId, prefersReducedMotion])

  useEffect(
    () => () => {
      cancelSwapAnimations()
      detailViewTransitionRef.current?.skipTransition()
      detailViewTransitionRef.current = null
      document.documentElement.classList.remove('handbook-detail-inplace-transition')
    },
    [cancelSwapAnimations]
  )

  const triggerConsultPulse = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(HANDBOOK_DETAIL_CONSULT_PULSE_SESSION_KEY)) return
    window.sessionStorage.setItem(HANDBOOK_DETAIL_CONSULT_PULSE_SESSION_KEY, '1')
    setConsultPulse(true)
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    pulseTimerRef.current = setTimeout(() => {
      pulseTimerRef.current = null
      setConsultPulse(false)
    }, 1250)
  }, [])

  useEffect(() => {
    const idle = setTimeout(triggerConsultPulse, CONSULT_IDLE_MS)
    const similarNode = similarRef.current
    const observer = similarNode
      ? new IntersectionObserver(
          ([entry]) => {
            if (!entry?.isIntersecting) return
            triggerConsultPulse()
            observer?.disconnect()
          },
          { threshold: 0.12 }
        )
      : null
    if (similarNode) observer?.observe(similarNode)

    return () => {
      clearTimeout(idle)
      observer?.disconnect()
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    }
  }, [similar.length, triggerConsultPulse])

  useEffect(() => {
    const similarNode = similarRef.current
    if (!similarNode || similarVisible) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setSimilarVisible(true)
        observer.disconnect()
      },
      { threshold: 0 }
    )
    observer.observe(similarNode)
    return () => observer.disconnect()
  }, [similar.length, similarVisible, template?.id])

  useEffect(() => {
    const updateMobileCta = () => {
      mobileScrollFrameRef.current = 0
      if (window.innerWidth >= 1024) {
        setShowMobileConsult(false)
        return
      }
      const media = mediaSwapRef.current?.getBoundingClientRect()
      const real = realConsultRef.current?.getBoundingClientRect()
      if (!media || !real) return
      const pastMedia = media.bottom < 112
      const realButtonVisible = real.top < window.innerHeight - 24 && real.bottom > 72
      setShowMobileConsult(pastMedia && !realButtonVisible)
    }
    const schedule = () => {
      if (mobileScrollFrameRef.current) return
      mobileScrollFrameRef.current = requestAnimationFrame(updateMobileCta)
    }
    updateMobileCta()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (mobileScrollFrameRef.current) cancelAnimationFrame(mobileScrollFrameRef.current)
    }
  }, [activeTemplateId])

  const handleBack = useCallback(() => {
    const hasLibraryReturn = Boolean(window.sessionStorage.getItem(HANDBOOK_TEMPLATE_RETURN_SESSION_KEY))
    if (hasLibraryReturn && window.history.length > 1) {
      window.dispatchEvent(new Event('savico:handbook-back-request'))
      return
    }
    router.push(`${ROUTES.HANDBOOK}?tab=library`)
  }, [router])

  const handleSimilar = useCallback(
    (item: HandbookTemplate) => {
      if (!template || item.id === template.id) return
      const alreadyViewed = detailQuota.hasViewed(item.id)
      if (!alreadyViewed && detailQuota.remaining <= 0) {
        setBlockedSimilarId(item.id)
        toast.error(tQuota('exhausted'))
        window.setTimeout(
          () => setBlockedSimilarId((current) => (current === item.id ? null : current)),
          SIMILAR_BLOCK_SHAKE_MS
        )
        return
      }

      updateReturnMarker(item.id)
      setSimilarRevealDone(true)
      const runId = ++swapRunRef.current
      cancelSwapAnimations(true)
      const reduce = prefersReducedMotion()
      const root = rootRef.current
      const headerOffset = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--public-header-offset')
      )
      const targetTop = root
        ? Math.max(0, window.scrollY + root.getBoundingClientRect().top - (headerOffset || 64) - 12)
        : window.scrollY

      if (reduce) {
        window.scrollTo({ top: targetTop, behavior: 'auto' })
        setActiveTemplateId(item.id)
        setSimilarSourceId(item.id)
        setFloorControlsSourceId(item.id)
        updateLocalizedDetailUrl(item.id)
        return
      }

      const beginSwap = () => {
        if (swapRunRef.current !== runId) return
        swapScrollFrameRef.current = 0

        if (document.startViewTransition) {
          detailViewTransitionRef.current?.skipTransition()
          cancelSwapAnimations()
          flushSync(() => setInPlaceTransitionActive(true))
          document.documentElement.classList.add('handbook-detail-inplace-transition')

          const transition = document.startViewTransition(() => {
            flushSync(() => setActiveTemplateId(item.id))
            updateLocalizedDetailUrl(item.id)
          })
          detailViewTransitionRef.current = transition
          void transition.updateCallbackDone.catch(() => undefined)
          void transition.finished
            .catch(() => undefined)
            .finally(() => {
              if (detailViewTransitionRef.current !== transition) return
              detailViewTransitionRef.current = null
              document.documentElement.classList.remove('handbook-detail-inplace-transition')
              setFloorControlsSourceId(item.id)
              setSimilarSourceId(item.id)
              setInPlaceTransitionActive(false)
            })
          return
        }

        const header = headerDataRef.current
        const media = mediaSwapRef.current
        const aside = asideRef.current
        if (!header || !media || !aside) {
          setActiveTemplateId(item.id)
          updateLocalizedDetailUrl(item.id)
          return
        }

        const animateOut = (node: HTMLElement, transform: string, duration: number) => {
          const style = getComputedStyle(node)
          return node.animate(
            [
              { opacity: style.opacity, transform: style.transform },
              { opacity: 0, transform }
            ],
            { duration, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'both' }
          )
        }

        const animations = [
          animateOut(header, 'translate3d(0,-4px,0)', 110),
          animateOut(media, 'translate3d(-18px,0,0)', 135),
          animateOut(aside, 'translate3d(-10px,0,0)', 120)
        ]
        swapAnimationsRef.current = animations

        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
          if (swapRunRef.current !== runId) return
          header.style.opacity = '0'
          aside.style.opacity = '0'
          media.style.opacity = '0'
          media.style.transform = 'translate3d(22px,0,0)'
          media.style.height = `${media.getBoundingClientRect().height}px`
          media.style.overflow = 'hidden'
          for (const animation of animations) animation.cancel()
          swapAnimationsRef.current = []
          pendingIncomingRef.current = true
          setActiveTemplateId(item.id)
          updateLocalizedDetailUrl(item.id)
        })
      }

      if (Math.abs(window.scrollY - targetTop) <= 8) {
        beginSwap()
        return
      }

      window.scrollTo({ top: targetTop, behavior: 'smooth' })
      const startedAt = performance.now()
      let stableFrames = 0
      const waitForScroll = () => {
        if (swapRunRef.current !== runId) return
        const remaining = Math.abs(window.scrollY - targetTop)
        stableFrames = remaining < 2 ? stableFrames + 1 : 0
        if (stableFrames >= 2 || performance.now() - startedAt > 720) {
          beginSwap()
          return
        }
        swapScrollFrameRef.current = requestAnimationFrame(waitForScroll)
      }
      swapScrollFrameRef.current = requestAnimationFrame(waitForScroll)
    },
    [
      cancelSwapAnimations,
      detailQuota,
      prefersReducedMotion,
      rootRef,
      tQuota,
      template,
      updateLocalizedDetailUrl,
      updateReturnMarker
    ]
  )

  if (needsLogin) return <TemplateDetailLoginGate />
  if (initialQuery.error instanceof LibraryAccessDeniedError) {
    return <TemplateDetailLocked deniedCode={initialQuery.error.deniedCode} />
  }
  if (isPending) return <TemplateDetailSkeleton />
  if (isError) {
    return (
      <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
        <ErrorState
          title={t('loadError')}
          description={t('loadErrorHint')}
          retryLabel={t('retry')}
          onRetry={() => void initialQuery.refetch()}
        />
      </div>
    )
  }
  if (!template) return <ErrorState title={t('notFound')} description={t('notFoundHint')} />

  const activeFloor = resolveFloor(template, selection.templateId === template.id ? selection.floorId : '')
  const activeFloorId = activeFloor?.id ?? ''
  const floorControlsActiveFloor = floorControlsTemplate
    ? resolveFloor(floorControlsTemplate, selection.templateId === floorControlsTemplate.id ? selection.floorId : '')
    : undefined
  const floorControlsActiveId = floorControlsActiveFloor?.id ?? ''
  const libraryHref = `${ROUTES.HANDBOOK}?tab=library`

  const favoriteItem = {
    templateId: template.id,
    kind: template.kind,
    name: template.name,
    imageUrl: template.imageUrl ?? template.floors[0]?.imageUrl ?? '',
    tagLabel: template.styleLabel
  }

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      data-template-detail
      data-template-detail-id={template.id}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-8 px-4 py-5 lg:px-8'
    >
      <div className='space-y-3'>
        <Link
          href={ROUTES.HANDBOOK}
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors lg:hidden'
        >
          <ArrowLeft className='size-4' />
          {t('breadcrumbRoot')}
        </Link>
        <Breadcrumb data-entrance-step='0' data-detail-breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link data-detail-breadcrumb-link href={ROUTES.HANDBOOK}>
                  {t('breadcrumbRoot')}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>{'>'}</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link data-detail-breadcrumb-link href={libraryHref}>
                  {t('breadcrumbLibrary')}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>{'>'}</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage
                style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-breadcrumb-name' } : undefined}
              >
                {template.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <button
          type='button'
          data-entrance-step='1'
          data-entrance-from='left'
          data-detail-back
          onClick={handleBack}
          className='text-primary inline-flex items-center gap-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
        >
          <ArrowLeft data-detail-back-arrow className='size-4 transition-transform duration-200' />
          <span>{t('back')}</span>
        </button>

        <div ref={headerDataRef} data-detail-header-data className='space-y-3'>
          <h1
            data-entrance-step='2'
            className='text-2xl font-semibold tracking-tight sm:text-3xl'
            style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-title' } : undefined}
          >
            {template.name}
          </h1>

          <div className='flex flex-wrap items-center gap-2 lg:w-2/3'>
            <span
              data-entrance-step='3'
              data-entrance-order='1'
              data-detail-tag
              style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-tag-building' } : undefined}
            >
              <Badge variant='secondary'>{template.specs.buildingTypeLabel}</Badge>
            </span>
            {template.kind === '3d' && !classification.groupedStyles ? (
              <span
                data-entrance-step='3'
                data-entrance-order='2'
                data-detail-tag
                style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-tag-style' } : undefined}
              >
                <Badge variant='secondary'>{template.styleLabel}</Badge>
              </span>
            ) : null}
            <span
              data-entrance-step='3'
              data-entrance-order={template.kind === '3d' ? '3' : '2'}
              data-detail-tag
              style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-tag-floors' } : undefined}
            >
              <Badge variant='secondary'>
                {template.floorCount == null && !template.tags.floorCount
                  ? `${tInfo('floorsPlan')}: ${classification.floorLabel}`
                  : classification.floorLabel}
              </Badge>
            </span>
            <span
              data-entrance-step='3'
              data-entrance-order='4'
              data-detail-tag
              style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-tag-tum' } : undefined}
            >
              <Badge variant='secondary'>
                {template.tags.hasAttic == null
                  ? `${tInfo('tum')}: ${classification.tumLabel}`
                  : classification.tumLabel}
              </Badge>
            </span>
            {template.kind === '3d' && classification.groupedStyles
              ? (['architecture', 'interior'] as const).map((group, index) => (
                  <span
                    key={group}
                    data-entrance-step='3'
                    data-entrance-order={5 + index}
                    data-detail-tag
                    className='min-w-0 max-w-full'
                    style={inPlaceTransitionActive ? { viewTransitionName: `handbook-detail-tag-${group}` } : undefined}
                  >
                    <Badge variant='secondary' className='h-auto max-w-full whitespace-normal wrap-anywhere'>
                      {tInfo(group === 'architecture' ? 'architectureStyle' : 'interiorStyle')}:{' '}
                      {group === 'architecture' ? classification.architectureLabel : classification.interiorLabel}
                    </Badge>
                  </span>
                ))
              : null}
            {template.specs.lotSize ? (
              <span
                data-entrance-step='3'
                data-entrance-order='7'
                data-detail-tag
                style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-tag-size' } : undefined}
              >
                <Badge variant='outline'>
                  {template.specs.lotSize}
                  {template.specs.floorArea ? ` · ${template.specs.floorArea}` : ''}
                </Badge>
              </span>
            ) : null}
            <span
              data-entrance-step='3'
              data-entrance-order='8'
              className='ml-auto'
              style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-favorite' } : undefined}
            >
              <FavoriteButton variant='full' item={favoriteItem} />
            </span>
          </div>
        </div>
      </div>

      <div className='grid items-start gap-6 lg:grid-cols-[2.1fr_1fr]'>
        <section
          data-entrance-step='4'
          data-entrance-from='soft-scale'
          data-detail-media-section
          className='bg-card rounded-2xl border p-4'
        >
          <div className='space-y-4'>
            <div
              ref={mediaSwapRef}
              data-detail-media-swap
              style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-media' } : undefined}
            >
              <TemplateFloorViewer
                template={template}
                activeId={activeFloorId}
                onChange={(floorId) => setSelection({ templateId: template.id, floorId })}
                suppressSharedElementTransition={inPlaceTransitionActive}
                labels={{
                  zoom: t('zoom'),
                  viewerTitle: t('viewerTitle'),
                  previousFloor: t('previousFloor'),
                  nextFloor: t('nextFloor'),
                  floorViewer: t('floorViewer')
                }}
              />
            </div>
            {floorControlsTemplate ? (
              <FloorSwitcher
                template={floorControlsTemplate}
                activeId={floorControlsActiveId}
                onChange={(floorId) => setSelection({ templateId: floorControlsTemplate.id, floorId })}
                showThumbnails
              />
            ) : null}
          </div>
        </section>

        <aside
          ref={asideRef}
          data-entrance-step='5'
          data-entrance-from='right'
          data-detail-info-aside
          className='bg-card h-fit space-y-5 rounded-2xl border p-5'
        >
          <div data-detail-info-swap className='space-y-5'>
            <TemplateInfo key={template.id} template={template} transitionActive={inPlaceTransitionActive} />
            <TemplateAttachments key={`attachments-${template.id}`} template={template} />
            <div
              data-detail-quota-swap
              style={inPlaceTransitionActive ? { viewTransitionName: 'handbook-detail-quota' } : undefined}
            >
              <QuotaBadge scope='detail' templateId={template.id} detailViewStatus={detailViewStatus} />
            </div>
            <div ref={realConsultRef} data-detail-real-consult>
              <ConsultButton templateId={template.id} pulse={consultPulse} />
            </div>
          </div>
        </aside>
      </div>

      <section
        ref={similarRef}
        data-similar-section
        data-visible={similar.length === 0 || similarVisible}
        data-reveal-done={similarRevealDone}
        aria-busy={isPoolPending}
        className='bg-card space-y-4 rounded-2xl border p-5'
      >
        <h2 className='text-lg font-semibold'>{t('similar')}</h2>
        {similarStylesError ? (
          <Button
            variant='outline'
            onClick={() => {
              if (similarStyleOptions.isError) void similarStyleOptions.refetch()
              if (similarStyles.isError) void similarStyles.refetch()
            }}
          >
            {t('retry')}
          </Button>
        ) : null}
        {isPoolPending ? (
          <Skeleton className='h-16 rounded-lg' aria-hidden />
        ) : similar.length === 0 ? (
          <p data-similar-empty className='text-muted-foreground py-8 text-center text-sm' role='status'>
            {t('similarEmpty')}
          </p>
        ) : (
          <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {similar.map((item, index) => (
              <li
                key={item.id}
                data-similar-card
                data-blocked={blockedSimilarId === item.id}
                style={{ '--similar-delay': `${index * 82}ms` } as CSSProperties}
                className='relative'
                onAnimationEnd={(event) => {
                  if (
                    index === similar.length - 1 &&
                    event.animationName === 'detail-similar-card-in' &&
                    !similarRevealDone
                  ) {
                    setSimilarRevealDone(true)
                  }
                }}
              >
                <div data-similar-shake-shell className='relative h-full'>
                  <button
                    type='button'
                    onClick={() => handleSimilar(item)}
                    data-similar-open
                    className={cn(
                      'group/similar hover:border-primary/50 block h-full w-full overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                      item.kind === '2d' && 'flex gap-3 p-2'
                    )}
                  >
                    <span
                      className={cn(
                        'block overflow-hidden',
                        item.kind === '2d' ? 'w-24 shrink-0 rounded-lg' : 'w-full'
                      )}
                    >
                      <TemplateFigure
                        template={item}
                        className={cn(
                          'transition-transform duration-400 ease-out group-hover/similar:scale-[1.025]',
                          item.kind === '2d' ? 'w-24 shrink-0 rounded-lg' : 'aspect-4/3 w-full'
                        )}
                        sizes={item.kind === '2d' ? '96px' : '260px'}
                      />
                    </span>
                    <span className={cn('block min-w-0 space-y-1.5 pr-7', item.kind === '2d' ? 'flex-1' : 'p-3')}>
                      <span className='group-hover/similar:text-primary line-clamp-2 block text-sm font-medium transition-colors'>
                        {item.name}
                      </span>
                      {item.specs.lotSize || item.specs.floorArea ? (
                        <span className='text-primary block text-xs'>
                          {[item.specs.lotSize, item.specs.floorArea].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                      <TemplateCategoryBadges
                        template={item}
                        styles={similarStyles.data?.[item.id]}
                        stylesPending={item.source === 'bmt' && similarStylesPending}
                        stylesError={item.source === 'bmt' && similarStylesError}
                      />
                    </span>
                  </button>
                  <FavoriteButton
                    item={{
                      templateId: item.id,
                      kind: item.kind,
                      name: item.name,
                      imageUrl: item.imageUrl ?? item.floors[0]?.imageUrl ?? '',
                      tagLabel: item.styleLabel
                    }}
                    className={cn('absolute right-1.5', item.kind === '2d' ? 'top-1.5' : 'bottom-2')}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div
        data-mobile-consult-shell
        data-visible={showMobileConsult}
        className='pointer-events-none fixed right-4 bottom-4 left-4 z-40 lg:hidden'
      >
        <ConsultButton
          templateId={template.id}
          pulse={consultPulse}
          mobileSticky
          className={cn(
            'pointer-events-auto transition-[opacity,transform] duration-300',
            !showMobileConsult && 'invisible'
          )}
        />
      </div>

      <TemplateDetailCtaPopup key={template.id} template={template} />
    </div>
  )
}

interface ViewerLabels {
  zoom: string
  viewerTitle: string
  previousFloor: string
  nextFloor: string
  floorViewer: string
}

function TemplateFloorViewer({
  template,
  activeId,
  onChange,
  suppressSharedElementTransition,
  labels
}: {
  template: HandbookTemplate
  activeId: string
  onChange: (floorId: string) => void
  suppressSharedElementTransition?: boolean
  labels: ViewerLabels
}) {
  const floors = template.floors
  const activeIndex = Math.max(
    0,
    floors.findIndex((floor) => floor.id === activeId)
  )
  const activeFloor = floors[activeIndex] ?? floors[0]
  const renderedFloors = floors
  const renderedActiveIndex = activeIndex
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const trackAnimationRef = useRef<Animation | null>(null)
  const mountedRef = useRef(false)
  const templateIdRef = useRef(template.id)
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    baseX: 0,
    deltaX: 0,
    axis: 'pending' as 'pending' | 'horizontal' | 'vertical'
  })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const pinchPointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null)

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const readX = useCallback((fallback: number) => {
    const track = trackRef.current
    if (!track) return fallback
    const transform = getComputedStyle(track).transform
    if (!transform || transform === 'none') return fallback
    try {
      return new DOMMatrixReadOnly(transform).m41
    } catch {
      return fallback
    }
  }, [])

  const cancelTrackAnimation = useCallback((preserve = false) => {
    const animation = trackAnimationRef.current
    const track = trackRef.current
    if (!animation || !track) return
    if (preserve && animation.playState !== 'idle') {
      const transform = getComputedStyle(track).transform
      animation.cancel()
      track.style.transform = transform === 'none' ? '' : transform
    } else {
      animation.cancel()
    }
    trackAnimationRef.current = null
  }, [])

  const animateToIndex = useCallback(
    (index: number, immediate = false) => {
      const viewport = viewportRef.current
      const track = trackRef.current
      if (!viewport || !track) return
      const width = viewport.getBoundingClientRect().width
      const targetX = -index * width
      const currentX = readX(targetX)
      cancelTrackAnimation()

      if (immediate || reduceMotion() || Math.abs(currentX - targetX) < 0.5) {
        track.style.transform = `translate3d(${targetX}px,0,0)`
        track.style.willChange = ''
        return
      }

      track.style.willChange = 'transform'
      const duration = Math.min(340, Math.max(210, 220 + Math.abs(targetX - currentX) * 0.08))
      const animation = track.animate(
        [{ transform: `translate3d(${currentX}px,0,0)` }, { transform: `translate3d(${targetX}px,0,0)` }],
        { duration, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      )
      trackAnimationRef.current = animation
      animation.onfinish = () => {
        if (trackAnimationRef.current !== animation) return
        animation.cancel()
        trackAnimationRef.current = null
        track.style.transform = `translate3d(${targetX}px,0,0)`
        track.style.willChange = ''
      }
    },
    [cancelTrackAnimation, readX]
  )

  useLayoutEffect(() => {
    const templateChanged = templateIdRef.current !== template.id
    templateIdRef.current = template.id
    animateToIndex(renderedActiveIndex, !mountedRef.current || templateChanged)
    mountedRef.current = true
  }, [animateToIndex, renderedActiveIndex, template.id])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(() => {
      if (dragRef.current.active || trackAnimationRef.current) return
      animateToIndex(renderedActiveIndex, true)
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [animateToIndex, renderedActiveIndex])

  useEffect(() => () => cancelTrackAnimation(), [cancelTrackAnimation])

  const selectIndex = useCallback(
    (index: number) => {
      const floor = floors[index]
      if (!floor || index === activeIndex) {
        animateToIndex(activeIndex)
        return
      }
      onChange(floor.id)
    },
    [activeIndex, animateToIndex, floors, onChange]
  )

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    const viewport = viewportRef.current
    if (!viewport) return
    cancelTrackAnimation(true)
    const width = viewport.getBoundingClientRect().width
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: readX(-activeIndex * width),
      deltaX: 0,
      axis: 'pending'
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag.active || drag.pointerId !== event.pointerId || !track) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (drag.axis === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return
      drag.axis = Math.abs(dx) > Math.abs(dy) * 1.08 ? 'horizontal' : 'vertical'
    }
    if (drag.axis !== 'horizontal') return
    event.preventDefault()
    let delta = dx
    if ((activeIndex === 0 && delta > 0) || (activeIndex === floors.length - 1 && delta < 0)) delta *= 0.24
    drag.deltaX = delta
    track.style.transform = `translate3d(${drag.baseX + delta}px,0,0)`
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      const target = event.target as HTMLElement
      if (template.kind === '3d' && !target.closest('[data-detail-zoom],[data-detail-nav]')) setLightboxOpen(true)
      return
    }

    const drag = dragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return
    drag.active = false
    const delta = drag.deltaX
    const axis = drag.axis
    drag.deltaX = 0
    drag.axis = 'pending'
    if (axis !== 'horizontal') {
      animateToIndex(activeIndex)
      return
    }
    const width = viewportRef.current?.getBoundingClientRect().width ?? 0
    const threshold = Math.min(78, Math.max(48, width * 0.14))
    if (Math.abs(delta) < threshold) {
      animateToIndex(activeIndex)
      return
    }
    if (delta < 0 && activeIndex < floors.length - 1) selectIndex(activeIndex + 1)
    else if (delta > 0 && activeIndex > 0) selectIndex(activeIndex - 1)
    else animateToIndex(activeIndex)
  }

  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && activeIndex > 0) {
        event.preventDefault()
        selectIndex(activeIndex - 1)
      }
      if (event.key === 'ArrowRight' && activeIndex < floors.length - 1) {
        event.preventDefault()
        selectIndex(activeIndex + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, floors.length, lightboxOpen, selectIndex])

  const onPinchPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pinchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinchPointersRef.current.size === 2) {
      const [a, b] = [...pinchPointersRef.current.values()]
      if (!a || !b) return
      pinchStartRef.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: zoomScale }
    }
  }

  const onPinchPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pinchPointersRef.current.has(event.pointerId)) return
    pinchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinchPointersRef.current.size !== 2 || !pinchStartRef.current) return
    const [a, b] = [...pinchPointersRef.current.values()]
    if (!a || !b) return
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    const next = pinchStartRef.current.scale * (distance / Math.max(pinchStartRef.current.distance, 1))
    setZoomScale(Math.min(3, Math.max(1, next)))
  }

  const onPinchPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pinchPointersRef.current.delete(event.pointerId)
    if (pinchPointersRef.current.size < 2) pinchStartRef.current = null
  }

  return (
    <>
      <div
        ref={viewportRef}
        data-detail-floor-viewport
        data-detail-floor-kind={template.kind}
        role='group'
        aria-label={labels.floorViewer}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' && activeIndex > 0) {
            event.preventDefault()
            selectIndex(activeIndex - 1)
          }
          if (event.key === 'ArrowRight' && activeIndex < floors.length - 1) {
            event.preventDefault()
            selectIndex(activeIndex + 1)
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        className={cn(
          'group/viewer relative touch-pan-y overflow-hidden rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          template.kind === '3d' && 'cursor-zoom-in'
        )}
        style={{
          viewTransitionName: suppressSharedElementTransition
            ? 'none'
            : `handbook-template-${template.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
        }}
      >
        <div ref={trackRef} data-detail-floor-track className='flex w-full items-start'>
          {renderedFloors.map((floor, index) => (
            <div
              key={floor.id}
              data-detail-floor-panel={floor.id}
              aria-hidden={index !== renderedActiveIndex}
              className='w-full shrink-0'
            >
              <TemplateFigure
                template={template}
                floor={floor}
                className='aspect-16/9 w-full'
                autoHeight={false}
                sizes='(max-width: 1024px) 100vw, 720px'
                priority={index === 0}
                revealOnLoad
              />
            </div>
          ))}
        </div>
        <span
          data-detail-watermark
          aria-hidden
          className='text-primary/45 pointer-events-none absolute right-3 bottom-2 text-lg font-bold tracking-widest drop-shadow-sm'
        >
          BUILDX
        </span>
        {/* Mũi tên trái/phải chuyển tầng / góc nhìn: ẩn mặc định, chỉ hiện khi rê chuột (hoặc
            focus bàn phím) vào vùng ảnh để không che bản vẽ. Cảm ứng vuốt ngang như cũ. */}
        {floors.length > 1 ? (
          <>
            {(
              [
                { dir: -1, label: labels.previousFloor, side: 'left-3', Icon: ChevronLeft },
                { dir: 1, label: labels.nextFloor, side: 'right-3', Icon: ChevronRight }
              ] as const
            ).map(({ dir, label, side, Icon }) => {
              const target = activeIndex + dir
              if (target < 0 || target >= floors.length) return null
              return (
                <button
                  key={dir}
                  type='button'
                  data-detail-nav
                  aria-label={label}
                  onClick={() => selectIndex(target)}
                  className={cn(
                    'bg-background/85 text-foreground hover:bg-background absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border opacity-0 shadow-sm backdrop-blur transition-[opacity,background-color,transform] duration-200 group-focus-within/viewer:opacity-100 group-hover/viewer:opacity-100 hover:scale-105 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none',
                    side
                  )}
                >
                  <Icon className='size-5' />
                </button>
              )
            })}
          </>
        ) : null}
        <button
          type='button'
          data-detail-zoom
          aria-label={labels.zoom}
          onClick={() => setLightboxOpen(true)}
          className='bg-background/85 text-foreground hover:bg-background absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-[background-color,transform] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
        >
          <Maximize2 className='size-4' />
        </button>
      </div>

      <Dialog
        open={lightboxOpen}
        onOpenChange={(open) => {
          setLightboxOpen(open)
          if (!open) {
            setZoomScale(1)
            pinchPointersRef.current.clear()
            pinchStartRef.current = null
          }
        }}
      >
        <DialogContent
          data-detail-lightbox
          showCloseButton
          className='bg-foreground max-h-[94vh] max-w-[min(96vw,78rem)] overflow-hidden border-0 p-3 sm:max-w-[min(96vw,78rem)]'
        >
          <DialogTitle className='sr-only'>{labels.viewerTitle}</DialogTitle>
          <div
            data-detail-lightbox-media
            className='relative flex min-h-[50vh] touch-none items-center justify-center overflow-hidden rounded-xl'
            onPointerDown={onPinchPointerDown}
            onPointerMove={onPinchPointerMove}
            onPointerUp={onPinchPointerEnd}
            onPointerCancel={onPinchPointerEnd}
          >
            {activeFloor ? (
              <div
                data-detail-lightbox-scale
                className='w-full max-w-[72rem] origin-center transition-transform duration-150 motion-reduce:transition-none'
                style={{ transform: `scale(${zoomScale})` }}
              >
                <TemplateFigure
                  template={template}
                  floor={activeFloor}
                  className={cn('w-full rounded-lg', template.kind === '3d' && 'aspect-16/9')}
                  autoHeight={template.kind === '2d'}
                  sizes='96vw'
                />
              </div>
            ) : null}
            {activeIndex > 0 ? (
              <button
                type='button'
                aria-label={labels.previousFloor}
                onClick={() => selectIndex(activeIndex - 1)}
                className='bg-background/85 text-foreground absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
              >
                <ChevronLeft className='size-5' />
              </button>
            ) : null}
            {activeIndex < floors.length - 1 ? (
              <button
                type='button'
                aria-label={labels.nextFloor}
                onClick={() => selectIndex(activeIndex + 1)}
                className='bg-background/85 text-foreground absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
              >
                <ChevronRight className='size-5' />
              </button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Cổng đăng nhập cho chi tiết mẫu đến từ API (Phần 2.3): không lộ nội dung, mời
 * khách đăng nhập. Đăng nhập xong store auth đổi → component tự bỏ cổng và tải
 * chi tiết. Mẫu mock (demo) không đi qua đây, vẫn xem công khai.
 */
function TemplateDetailLoginGate() {
  const t = useTranslations('handbook.detail')
  const openAuthDialog = useAuthDialogStore((state) => state.open)

  return (
    <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
      <div className='bg-card mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border p-8 text-center'>
        <span className='bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full'>
          <Lock className='size-6' />
        </span>
        <h1 className='text-xl font-semibold'>{t('loginRequiredTitle')}</h1>
        <p className='text-muted-foreground text-sm'>{t('loginRequiredHint')}</p>
        <Button type='button' onClick={() => openAuthDialog('login')}>
          {t('loginCta')}
        </Button>
      </div>
    </div>
  )
}

/**
 * BE từ chối mở chi tiết mẫu (chưa có gói / gói hết hạn…): nói rõ lý do và chỉ đường, thay vì để khách vào một
 * trang chi tiết trống. Không dựng nội dung nào của mẫu và không bật popup gợi ý của trang chi tiết.
 */
function TemplateDetailLocked({ deniedCode }: { deniedCode: string | null }) {
  const t = useTranslations('handbook.detail')
  const needsPlan = deniedCode === 'SubscriptionInactive'

  return (
    <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
      <div className='bg-card mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border p-8 text-center'>
        <span className='bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full'>
          <Lock className='size-6' />
        </span>
        <h1 className='text-xl font-semibold'>{needsPlan ? t('planRequiredTitle') : t('accessDeniedTitle')}</h1>
        <p className='text-muted-foreground text-sm'>{needsPlan ? t('planRequiredHint') : t('accessDeniedHint')}</p>
        <div className='flex w-full flex-col gap-2 sm:flex-row sm:justify-center'>
          {needsPlan ? (
            <Button asChild>
              <Link href={ROUTES.PLANS}>{t('planRequiredCta')}</Link>
            </Button>
          ) : null}
          <Button asChild variant='outline'>
            <Link href={`${ROUTES.HANDBOOK}?tab=library`}>{t('backToLibrary')}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function TemplateDetailSkeleton() {
  return (
    <div
      data-handbook-loading='true'
      className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-8 px-4 py-5 lg:px-8'
      aria-hidden='true'
    >
      <div className='space-y-3'>
        <Skeleton className='handbook-skeleton animate-none h-4 w-64 max-w-[72%]' />
        <Skeleton className='handbook-skeleton animate-none h-4 w-24' />
        <div className='space-y-3 pt-1'>
          <Skeleton className='handbook-skeleton animate-none h-9 w-[34rem] max-w-[86%]' />
          <div className='flex flex-wrap items-center gap-2 lg:w-[calc(67.74%-1.02rem)]'>
            <Skeleton className='handbook-skeleton animate-none h-6 w-20 rounded-full' />
            <Skeleton className='handbook-skeleton animate-none h-6 w-16 rounded-full' />
            <Skeleton className='handbook-skeleton animate-none h-6 w-24 rounded-full' />
            <Skeleton className='handbook-skeleton animate-none ml-auto h-8 w-24 rounded-lg' />
          </div>
        </div>
      </div>

      <div className='grid items-start gap-6 lg:grid-cols-[2.1fr_1fr]'>
        <section className='bg-card rounded-2xl border p-4'>
          <div className='space-y-4'>
            <Skeleton className='handbook-skeleton animate-none aspect-16/9 w-full rounded-xl' />
            <div className='space-y-3'>
              <div className='bg-muted/60 flex w-fit items-center gap-1 rounded-lg border p-1'>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className='handbook-skeleton animate-none h-8 rounded-md'
                    style={{ width: index === 0 ? 92 : 74 }}
                  />
                ))}
              </div>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className='space-y-2'>
                    <Skeleton className='handbook-skeleton animate-none h-24 w-full rounded-lg' />
                    <Skeleton className='handbook-skeleton animate-none mx-auto h-3 w-16' />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className='bg-card h-fit space-y-5 rounded-2xl border p-5'>
          <Skeleton className='handbook-skeleton animate-none h-5 w-32' />
          <div className='space-y-3'>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className='space-y-2 border-b pb-3 last:border-b-0 last:pb-0'>
                <Skeleton className='handbook-skeleton animate-none h-3 w-24' />
                <Skeleton className='handbook-skeleton animate-none h-4 w-[70%]' />
              </div>
            ))}
          </div>
          <div className='space-y-2'>
            <Skeleton className='handbook-skeleton animate-none h-4 w-20' />
            <Skeleton className='handbook-skeleton animate-none h-3 w-full' />
            <Skeleton className='handbook-skeleton animate-none h-3 w-[88%]' />
            <Skeleton className='handbook-skeleton animate-none h-3 w-[72%]' />
          </div>
          <Skeleton className='handbook-skeleton animate-none h-8 w-full rounded-lg' />
          <Skeleton className='handbook-skeleton animate-none h-10 w-full rounded-lg' />
        </aside>
      </div>
    </div>
  )
}
