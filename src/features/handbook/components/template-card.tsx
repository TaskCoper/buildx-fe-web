'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Link, useRouter } from '@/i18n/navigation'
import { Badge } from '@/shared/components/ui/badge'
import { handbookTemplateRoute } from '@/shared/constants/routes'
import { FavoriteButton } from '@/shared/favorite'
import { cn } from '@/shared/lib/utils'
import { useHandbookReadStore } from '../store/handbook-read.store'
import type { HandbookFloor, HandbookTemplate, HandbookTemplateStyles } from '../types/handbook.types'
import { ReadBadge } from './read-badge'
import { TemplateFigure } from './template-figure'
import { TemplateCategoryBadges } from './template-category-badges'

const GALLERY_HOVER_DELAY_MS = 720
const GALLERY_CYCLE_MS = 1800

interface TemplateCardProps {
  template: HandbookTemplate
  className?: string
  /**
   * Bấm thẻ mở popup xem nhanh (Hình 2) — chỉ dùng ở màn chờ. Bỏ trống thì thẻ
   * là liên kết sang trang chi tiết, đúng luồng của lưới thư viện.
   */
  onOpen?: (template: HandbookTemplate) => void
  /**
   * `library` (mặc định) — thẻ trong lưới thư viện (Hình 5, Hình 6): tên, dòng
   * thông số và chip.
   * `panel` — thẻ trong panel màn chờ: Hình 1 chỉ có tên + 2 chip, Hình 4 chỉ
   * có tên + dòng "loại công trình · phong cách". Không có dòng thông số.
   */
  variant?: 'library' | 'panel'
  selected?: boolean
  /** Entrance stagger index used only by the library opening sequence. */
  entranceOrder?: number
  /** Search term shown in the list; only visible card copy is highlighted. */
  searchQuery?: string
  /** Library-only quota hook. Omitted in recommendation panels. */
  onConsumeQuota?: () => boolean
  onQuotaBlocked?: (templateId: string) => void
  /** Called immediately before leaving the library so Back state can be saved. */
  onNavigate?: (templateId: string) => void
  styles?: HandbookTemplateStyles
  stylesPending?: boolean
  stylesError?: boolean
}

/**
 * Thẻ mẫu trong lưới thư viện và trong panel màn chờ (Hình 1, Hình 5, Hình 6).
 *
 * Dòng thông số dưới tên là thứ giúp chọn mà không phải mở chi tiết: mẫu 2D ghi
 * kích thước lô · diện tích · số tầng, mẫu 3D ghi quy mô · số ảnh trong bộ.
 *
 * The "open detail" hit area is a stretched overlay button rather than a wrapper
 * — nesting the ♥ inside another button would be invalid markup and would
 * swallow its clicks.
 */
export function TemplateCard({
  template,
  className,
  onOpen,
  variant = 'library',
  selected = false,
  entranceOrder,
  searchQuery = '',
  onConsumeQuota,
  onQuotaBlocked,
  onNavigate,
  styles,
  stylesPending = false,
  stylesError = false
}: TemplateCardProps) {
  const t = useTranslations('handbook.card')
  const router = useRouter()
  const markRead = useHandbookReadStore((s) => s.markRead)
  const { specs } = template
  const inPanel = variant === 'panel'
  const [pressing, setPressing] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [galleryPrimed, setGalleryPrimed] = useState(false)
  const [galleryPreviewActive, setGalleryPreviewActive] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const galleryDelayTimerRef = useRef<number | null>(null)
  const galleryCycleTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const galleryFrames = !inPanel && template.kind === '3d' ? resolveGalleryFrames(template) : []

  const specLine = (
    template.kind === '2d'
      ? [specs.lotSize, specs.floorArea, inPanel ? specs.floorLabel : undefined]
      : [
          inPanel ? specs.floorLabel : undefined,
          specs.imageCount ? t('imageCount', { count: specs.imageCount }) : undefined
        ]
  ).filter(Boolean)

  const clearGalleryTimers = () => {
    if (galleryDelayTimerRef.current) {
      clearTimeout(galleryDelayTimerRef.current)
      galleryDelayTimerRef.current = null
    }
    if (galleryCycleTimerRef.current) {
      clearInterval(galleryCycleTimerRef.current)
      galleryCycleTimerRef.current = null
    }
  }

  const stopGalleryPreview = () => {
    clearGalleryTimers()
    setGalleryPreviewActive(false)
    setGalleryIndex(0)
  }

  const startGalleryPreview = () => {
    if (galleryFrames.length < 2 || typeof window === 'undefined') return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    clearGalleryTimers()
    setGalleryPrimed(true)
    galleryDelayTimerRef.current = window.setTimeout(() => {
      galleryDelayTimerRef.current = null
      setGalleryPreviewActive(true)
      setGalleryIndex(1)
      galleryCycleTimerRef.current = window.setInterval(() => {
        setGalleryIndex((current) => (current + 1) % galleryFrames.length)
      }, GALLERY_CYCLE_MS)
    }, GALLERY_HOVER_DELAY_MS)
  }

  useEffect(
    () => () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      if (galleryDelayTimerRef.current) clearTimeout(galleryDelayTimerRef.current)
      if (galleryCycleTimerRef.current) clearInterval(galleryCycleTimerRef.current)
    },
    []
  )

  return (
    <article
      data-template-card
      data-panel-selected={inPanel && selected}
      data-template-card-id={template.id}
      data-template-kind={template.kind}
      data-template-pressing={pressing}
      data-template-blocked={blocked}
      data-template-preview={previewing}
      data-template-gallery-preview={galleryPreviewActive}
      data-entrance-step={entranceOrder === undefined ? undefined : '2'}
      data-entrance-order={entranceOrder}
      className={cn(
        // `h-full`: tên mẫu dài ngắn khác nhau nên không có nó thì các thẻ cùng
        // một hàng lưới cao thấp lệch nhau.
        'group bg-card relative h-full overflow-hidden rounded-xl border transition-[border-color,box-shadow,transform,opacity] duration-200',
        className
      )}
      onMouseEnter={startGalleryPreview}
      onMouseLeave={stopGalleryPreview}
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') return
        suppressClickRef.current = false
        touchStartRef.current = { x: event.clientX, y: event.clientY }
        longPressTimerRef.current = setTimeout(() => {
          suppressClickRef.current = true
          setPreviewing(true)
        }, 420)
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch' || !touchStartRef.current || !longPressTimerRef.current) return
        const dx = event.clientX - touchStartRef.current.x
        const dy = event.clientY - touchStartRef.current.y
        if (Math.hypot(dx, dy) <= 10) return
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }}
      onPointerUp={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
        touchStartRef.current = null
        if (previewing) window.setTimeout(() => setPreviewing(false), 120)
      }}
      onPointerCancel={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
        touchStartRef.current = null
        setPreviewing(false)
      }}
    >
      {inPanel ? (
        <svg aria-hidden className='pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible'>
          <rect
            data-panel-selection-outline
            x='1'
            y='1'
            width='calc(100% - 2px)'
            height='calc(100% - 2px)'
            rx='11'
            pathLength='1'
            fill='none'
            stroke='var(--primary)'
            strokeWidth='2'
          />
        </svg>
      ) : null}
      <div
        data-template-card-figure
        className='pointer-events-none relative z-20'
        style={{ viewTransitionName: `handbook-template-${template.id.replace(/[^a-zA-Z0-9_-]/g, '-')}` }}
      >
        {galleryFrames.length > 1 ? (
          <div
            data-template-gallery
            data-template-gallery-active-index={galleryIndex}
            className='relative aspect-3/2 w-full'
          >
            <div className='template-card-figure-motion absolute inset-0'>
              {galleryFrames.slice(0, galleryPrimed ? galleryFrames.length : 1).map((frame, index) => (
                <div
                  key={`${template.id}-${frame.id}-${frame.imageUrl ?? index}`}
                  data-template-gallery-frame
                  data-active={index === galleryIndex}
                  className='absolute inset-0'
                >
                  <TemplateFigure
                    template={template}
                    floor={frame}
                    className='size-full'
                    sizes='(max-width: 768px) 100vw, 320px'
                  />
                </div>
              ))}
            </div>

            <div
              aria-hidden
              data-template-gallery-indicators
              data-visible={galleryPreviewActive}
              className='bg-background/70 absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full px-1.5 py-1 backdrop-blur-sm'
            >
              {galleryFrames.map((frame, index) => (
                <span
                  key={`${frame.id}-dot`}
                  data-template-gallery-dot
                  data-active={index === galleryIndex}
                  className={cn(
                    'block rounded-full transition-[width,height,background-color,opacity] duration-300',
                    index === galleryIndex ? 'bg-primary size-2' : 'bg-foreground/45 size-1.5'
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <TemplateFigure
            template={template}
            className='template-card-figure-motion aspect-3/2 w-full'
            sizes='(max-width: 768px) 100vw, 320px'
          />
        )}
      </div>

      <FavoriteButton
        item={{
          templateId: template.id,
          kind: template.kind,
          name: template.name,
          imageUrl: template.imageUrl ?? template.floors[0]?.imageUrl ?? '',
          tagLabel: template.styleLabel
        }}
        className='bg-card/95 text-primary hover:bg-card absolute top-3 right-3 z-20 shadow-sm'
      />

      <div className='space-y-2 p-3'>
        <h3 data-template-card-title className='line-clamp-2 text-sm font-semibold transition-colors duration-200'>
          <HighlightedText text={template.name} query={searchQuery} />
        </h3>

        {/* Dòng thông số màu thương hiệu theo Hình 5 — nó là thông tin để chọn
            mẫu, không phải chú thích phụ. Panel màn chờ không có dòng này. */}
        {!inPanel && specLine.length > 0 ? (
          <p className='text-primary text-xs'>
            <HighlightedText text={specLine.join(' · ')} query={searchQuery} />
          </p>
        ) : null}

        {/* Hình 4: thẻ nội thất trong panel chỉ ghi "loại công trình · phong cách". */}
        {inPanel && template.kind === '3d' ? (
          <p className='text-muted-foreground text-xs'>
            {[specs.buildingTypeLabel, template.styleLabel].filter(Boolean).join(' · ')}
          </p>
        ) : !inPanel ? (
          <div className='flex flex-wrap items-center gap-2'>
            <TemplateCategoryBadges
              template={template}
              styles={styles}
              stylesPending={stylesPending}
              stylesError={stylesError}
            />
            <ReadBadge id={template.id} />
          </div>
        ) : (
          /* Cặp chip theo ảnh: mẫu 2D là "Nhà phố · 2 tầng" (Hình 5), mẫu 3D là
             "Nhà phố · Hiện đại" (Hình 6) — tức 3D lấy phong cách thay quy mô. */
          <div className='flex flex-wrap items-center gap-2'>
            {template.kind === '3d' ? (
              <>
                <Badge variant='secondary'>{specs.buildingTypeLabel}</Badge>
                <Badge variant='outline'>{template.styleLabel}</Badge>
              </>
            ) : (
              <>
                <Badge variant='secondary'>{template.styleLabel}</Badge>
                <Badge variant='outline'>{specs.floorLabel}</Badge>
              </>
            )}
            <ReadBadge id={template.id} />
          </div>
        )}
      </div>

      {onOpen ? (
        <button
          type='button'
          data-template-card-open
          onClick={() => {
            markRead(template.id)
            onOpen(template)
          }}
          className='focus-visible:ring-ring absolute inset-0 z-10 focus-visible:ring-2 focus-visible:outline-none'
        >
          <span className='sr-only'>{template.name}</span>
        </button>
      ) : (
        <Link
          href={handbookTemplateRoute(template.id)}
          data-template-card-open
          onClick={(event) => {
            if (suppressClickRef.current) {
              event.preventDefault()
              suppressClickRef.current = false
              return
            }

            if (onConsumeQuota && !onConsumeQuota()) {
              event.preventDefault()
              setBlocked(true)
              onQuotaBlocked?.(template.id)
              window.setTimeout(() => setBlocked(false), 520)
              return
            }

            markRead(template.id)
            onNavigate?.(template.id)
            window.dispatchEvent(new Event('savico:handbook-navigation-start'))
            setPressing(true)

            const viewTransition = document.startViewTransition
            if (!viewTransition) return

            event.preventDefault()
            const href = handbookTemplateRoute(template.id)
            window.setTimeout(() => {
              const transition = document.startViewTransition?.(() => {
                router.push(href)
              })
              // Chromium does not run `requestAnimationFrame` while the view-
              // transition update callback is pending. Waiting on RAF here
              // deadlocks the transition until its browser timeout. Keep the
              // update callback synchronous and absorb browser aborts (for
              // example a rapid second navigation) so they never surface as
              // unhandled promise rejections.
              void transition?.ready.catch(() => undefined)
              void transition?.updateCallbackDone.catch(() => undefined)
              void transition?.finished.catch(() => undefined)
            }, 80)
          }}
          className='focus-visible:ring-ring absolute inset-0 z-10 focus-visible:ring-2 focus-visible:outline-none'
        >
          <span className='sr-only'>{template.name}</span>
        </Link>
      )}
    </article>
  )
}

function resolveGalleryFrames(template: HandbookTemplate): HandbookFloor[] {
  const frames: HandbookFloor[] = []
  const seen = new Set<string>()

  if (template.imageUrl) {
    frames.push({ id: 'cover', label: template.floors[0]?.label ?? template.name, imageUrl: template.imageUrl })
    seen.add(template.imageUrl)
  }

  template.floors.forEach((floor) => {
    if (!floor.imageUrl || seen.has(floor.imageUrl)) return
    seen.add(floor.imageUrl)
    frames.push(floor)
  })

  return frames
}

function HighlightedText({ text, query }: { text: string; query: string }): ReactNode {
  const term = query.trim()
  if (!term) return text

  const range = findHighlightRange(text, term)
  if (!range) return text
  const [index, length] = range

  return (
    <>
      {text.slice(0, index)}
      <mark className='bg-warning/25 text-inherit rounded-sm px-0.5'>{text.slice(index, index + length)}</mark>
      {text.slice(index + length)}
    </>
  )
}

function findHighlightRange(text: string, term: string): [number, number] | null {
  const directIndex = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase())
  if (directIndex >= 0) return [directIndex, term.length]

  const dimension = term.match(/^(.+?)\s*[x×✕]\s*(.+)$/i)
  if (!dimension?.[1] || !dimension[2]) return null

  const pattern = new RegExp(
    `${escapeRegExp(dimension[1].trim())}\\s*[x×✕]\\s*${escapeRegExp(dimension[2].trim())}`,
    'i'
  )
  const match = pattern.exec(text)
  return match ? [match.index, match[0].length] : null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
