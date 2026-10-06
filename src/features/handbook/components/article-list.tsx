'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, CalendarDays, Clock, LoaderCircle, RotateCcw, Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { EmptyState, Photo } from '@/shared/components/common'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { handbookArticleRoute } from '@/shared/constants/routes'
import { useDebouncedValue } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import {
  ARTICLE_PAGE_SIZE,
  HANDBOOK_ARTICLE_LIST_HISTORY_KEY,
  HANDBOOK_CATEGORY_SELECT_EVENT
} from '../constants/handbook.constants'
import { ARTICLE_META_ICON, ARTICLE_META_TEXT } from '../constants/article-meta'
import { articleInChip, chipNodes, descendantsByChip } from '../api/handbook.news.logic'
import { useArticleLabels } from '../hooks/use-article-labels'
import { useHandbookArticles, useHandbookNewsCategoryTree } from '../hooks/use-handbook'
import { articleCategoryIds, sortByNewest } from '../services/handbook.service'
import type { HandbookArticle, HandbookCategory } from '../types/handbook.types'

const ALL = 'all'
type ArticleFilter = HandbookCategory | typeof ALL

interface CategorySelectDetail {
  category: HandbookCategory
}

interface ArticleListRestoreState {
  category: ArticleFilter
  term: string
  visibleCount: number
  openId: string | null
  scrollY: number
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function normalizeSearchPhrase(value: string): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function matchesSearchPhrase(value: string, query: string): boolean {
  const normalizedQuery = normalizeSearchPhrase(query)
  if (!normalizedQuery) return true

  const normalizedValue = normalizeSearchPhrase(value)
  return ` ${normalizedValue} `.includes(` ${normalizedQuery} `)
}

function filterArticles(
  articles: readonly HandbookArticle[],
  category: ArticleFilter,
  query: string,
  /** Có = chip là danh mục BMT: khớp theo id, gồm bài thuộc danh mục CON (như `categoryId` ở BE). */
  descendants?: ReadonlyMap<string, ReadonlySet<string>>
): HandbookArticle[] {
  const seenIds = new Set<string>()
  return sortByNewest(articles).filter((article) => {
    if (seenIds.has(article.id)) return false
    seenIds.add(article.id)
    if (category !== ALL) {
      const inCategory = descendants
        ? articleInChip(articleCategoryIds(article), category, descendants)
        : article.category === category
      if (!inCategory) return false
    }
    return matchesSearchPhrase(article.title, query)
  })
}

function readArticleListRestoreState(): ArticleListRestoreState | null {
  if (typeof window === 'undefined') return null
  const state = window.history.state as Record<string, unknown> | null
  const value = state?.[HANDBOOK_ARTICLE_LIST_HISTORY_KEY]
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<ArticleListRestoreState>
  const category = candidate.category
  // Nhãn có thể đã bị admin chuyển Inactive — kiểm tra lại khi dựng danh sách.
  const categoryValid = category !== undefined
  if (!categoryValid || typeof candidate.term !== 'string') return null

  return {
    category,
    term: candidate.term,
    visibleCount:
      typeof candidate.visibleCount === 'number' && candidate.visibleCount >= ARTICLE_PAGE_SIZE
        ? candidate.visibleCount
        : ARTICLE_PAGE_SIZE,
    openId: typeof candidate.openId === 'string' ? candidate.openId : null,
    scrollY: typeof candidate.scrollY === 'number' && candidate.scrollY >= 0 ? candidate.scrollY : 0
  }
}

/**
 * Khối "Tất cả bài viết" — góp ý BuildX CN04: tiêu đề "Khám phá kiến thức xây dựng",
 * bài viết là thẻ ảnh (ảnh trên, chữ dưới) xếp lưới 3 cột, lọc theo nhãn và tìm kiếm.
 *
 * Filter/search dùng WAAPI + FLIP native: thẻ còn lại trượt tới vị trí mới, thẻ mới
 * hiện lên từ dưới; mọi animation được hủy sạch khi filter bị đổi liên tục.
 */
export function ArticleList() {
  const t = useTranslations('handbook.articles')
  const cmsLabels = useArticleLabels()
  const locale = useLocale() as Locale
  const [restoreState] = useState(readArticleListRestoreState)
  const initialCategory = restoreState?.category ?? ALL
  const initialTerm = restoreState?.term ?? ''
  const sectionRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const chipRowRef = useRef<HTMLDivElement>(null)
  const filterPillRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<HTMLUListElement>(null)
  const filterAnimationsRef = useRef<Animation[]>([])
  const previousRectsRef = useRef(new Map<string, DOMRect>())
  const previousContentHeightRef = useRef<number | null>(null)
  const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [visualCategory, setVisualCategory] = useState<ArticleFilter>(initialCategory)
  const [appliedCategory, setAppliedCategory] = useState<ArticleFilter>(initialCategory)
  const [term, setTerm] = useState(initialTerm)
  const [appliedQuery, setAppliedQuery] = useState(initialTerm.trim())
  const [visibleCount, setVisibleCount] = useState(restoreState?.visibleCount ?? ARTICLE_PAGE_SIZE)
  const [openId, setOpenId] = useState<string | null>(restoreState?.openId ?? null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isToolbarStuck, setIsToolbarStuck] = useState(false)

  const appliedCategoryRef = useRef<ArticleFilter>(initialCategory)
  const appliedQueryRef = useRef(initialTerm.trim())
  const visualCategoryRef = useRef<ArticleFilter>(initialCategory)

  const debouncedTerm = useDebouncedValue(term, 250).trim()
  const { data: articles, isPending } = useHandbookArticles()
  const pool = useMemo(() => articles ?? [], [articles])

  // Chip lọc: bài từ BMT API → danh mục tin của BMT (cây công khai); bài mock → nhãn mock như cũ.
  // Bài API có `categoryIds`; khớp theo id nên bài thuộc danh mục con vẫn vào chip cha, đúng như
  // `GET /news/articles?categoryId=` ở BE. BE chưa có danh mục thì dùng nhãn mock (không gãy).
  const { data: categoryTree, isPending: categoryTreePending } = useHandbookNewsCategoryTree()
  const newsFilter = useMemo(() => {
    const nodes = categoryTree ?? []
    const chips = chipNodes(nodes)
    return { chips, descendants: descendantsByChip(nodes, chips) }
  }, [categoryTree])
  const poolIsApi = useMemo(() => pool.some((article) => articleCategoryIds(article).length > 0), [pool])
  const apiMode = poolIsApi && (newsFilter.chips.length > 0 || categoryTreePending)
  const labelOptions = useMemo(
    () => (apiMode ? newsFilter.chips.map((chip) => chip.id) : cmsLabels.options),
    [apiMode, cmsLabels.options, newsFilter.chips]
  )
  const labelName = useCallback(
    (id: string) =>
      (apiMode ? newsFilter.chips.find((chip) => chip.id === id)?.name : undefined) ?? cmsLabels.nameOf(id),
    [apiMode, cmsLabels, newsFilter.chips]
  )
  // Chip đã khôi phục từ lịch sử có thể không còn (đổi nguồn nhãn, hoặc danh mục bị xoá) → coi là Tất cả.
  const activeCategory: ArticleFilter =
    appliedCategory === ALL || labelOptions.includes(appliedCategory) ? appliedCategory : ALL
  const results = useMemo(
    () => filterArticles(pool, activeCategory, appliedQuery, apiMode ? newsFilter.descendants : undefined),
    [pool, activeCategory, appliedQuery, apiMode, newsFilter.descendants]
  )
  const visible = results.slice(0, visibleCount)
  const hasMore = visible.length < results.length

  useEffect(() => {
    appliedCategoryRef.current = appliedCategory
  }, [appliedCategory])

  useEffect(() => {
    appliedQueryRef.current = appliedQuery
  }, [appliedQuery])

  useEffect(() => {
    visualCategoryRef.current = visualCategory
  }, [visualCategory])

  const cancelLoadMore = useCallback(() => {
    if (loadMoreTimerRef.current) {
      clearTimeout(loadMoreTimerRef.current)
      loadMoreTimerRef.current = null
    }
    setIsLoadingMore(false)
  }, [])

  const cancelFilterAnimations = useCallback(() => {
    filterAnimationsRef.current.forEach((animation) => animation.cancel())
    filterAnimationsRef.current = []
  }, [])

  const captureRowRects = useCallback(() => {
    const map = new Map<string, DOMRect>()
    previousContentHeightRef.current = contentRef.current?.getBoundingClientRect().height ?? null
    rowsRef.current?.querySelectorAll<HTMLElement>('[data-article-row-item]').forEach((row) => {
      const id = row.dataset.articleRowItem
      if (id) map.set(id, row.getBoundingClientRect())
    })
    previousRectsRef.current = map
  }, [])

  const commitFilter = useCallback(
    (nextCategory: ArticleFilter, nextQuery: string) => {
      captureRowRects()
      appliedCategoryRef.current = nextCategory
      appliedQueryRef.current = nextQuery
      setAppliedCategory(nextCategory)
      setAppliedQuery(nextQuery)
      setVisibleCount(ARTICLE_PAGE_SIZE)
      setOpenId(null)
    },
    [captureRowRects]
  )

  const runFilterTransition = useCallback(
    (nextCategory: ArticleFilter, nextQuery: string) => {
      const normalizedQuery = nextQuery.trim()
      if (
        nextCategory === appliedCategoryRef.current &&
        normalizedQuery.toLocaleLowerCase() === appliedQueryRef.current.toLocaleLowerCase()
      ) {
        return
      }

      // Keep filtering to a single layout transition. The previous implementation
      // collapsed every leaving row to height:0 and then started FLIP/enter motion,
      // which produced a visible two-step "snap" in the list height.
      cancelLoadMore()
      cancelFilterAnimations()
      setOpenId(null)
      commitFilter(nextCategory, normalizedQuery)
    },
    [cancelFilterAnimations, cancelLoadMore, commitFilter]
  )

  useEffect(() => {
    void runFilterTransition(visualCategoryRef.current, debouncedTerm)
  }, [debouncedTerm, runFilterTransition])

  useEffect(() => {
    const handleCategorySelect = (event: Event) => {
      const detail = (event as CustomEvent<CategorySelectDetail>).detail
      if (!detail || !labelOptions.includes(detail.category)) return

      setVisualCategory(detail.category)
      visualCategoryRef.current = detail.category
      setTerm('')
      void runFilterTransition(detail.category, '')
    }

    window.addEventListener(HANDBOOK_CATEGORY_SELECT_EVENT, handleCategorySelect)
    return () => window.removeEventListener(HANDBOOK_CATEGORY_SELECT_EVENT, handleCategorySelect)
  }, [labelOptions, runFilterTransition])

  useLayoutEffect(() => {
    const previous = previousRectsRef.current
    const previousContentHeight = previousContentHeightRef.current
    if (prefersReducedMotion() || (previous.size === 0 && previousContentHeight === null)) {
      previousRectsRef.current = new Map()
      previousContentHeightRef.current = null
      return
    }

    const animations: Animation[] = []
    const content = contentRef.current
    if (content && previousContentHeight !== null) {
      const currentContentHeight = content.getBoundingClientRect().height
      if (Math.abs(previousContentHeight - currentContentHeight) > 0.5) {
        content.style.overflow = 'hidden'
        const contentHeightAnimation = content.animate(
          [{ height: `${previousContentHeight}px` }, { height: `${currentContentHeight}px` }],
          {
            duration: 240,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both'
          }
        )
        animations.push(contentHeightAnimation)
        void contentHeightAnimation.finished
          .then(() => {
            contentHeightAnimation.cancel()
            content.style.removeProperty('overflow')
          })
          .catch(() => undefined)
      }
    }

    let enteringIndex = 0
    rowsRef.current?.querySelectorAll<HTMLElement>('[data-article-row-item]').forEach((row) => {
      const id = row.dataset.articleRowItem
      if (!id) return
      const current = row.getBoundingClientRect()
      const before = previous.get(id)

      if (before) {
        const dx = before.left - current.left
        const dy = before.top - current.top
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          animations.push(
            row.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
              duration: 240,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            })
          )
        }
      } else {
        const delay = Math.min(enteringIndex * 18, 72)
        enteringIndex += 1
        animations.push(
          row.animate(
            [
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 220,
              delay,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            }
          )
        )
      }
    })

    previousRectsRef.current = new Map()
    previousContentHeightRef.current = null
    filterAnimationsRef.current = animations
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (filterAnimationsRef.current === animations) filterAnimationsRef.current = []
    })

    return () => {
      animations.forEach((animation) => animation.cancel())
      content?.style.removeProperty('overflow')
      if (filterAnimationsRef.current === animations) filterAnimationsRef.current = []
    }
  }, [appliedCategory, appliedQuery, visibleCount])

  useLayoutEffect(() => {
    const row = chipRowRef.current
    const pill = filterPillRef.current
    if (!row || !pill) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const active = row.querySelector<HTMLElement>(`[data-filter-chip='${visualCategoryRef.current}']`)
        if (!active) return
        pill.style.width = `${active.offsetWidth}px`
        pill.style.height = `${active.offsetHeight}px`
        pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
        pill.dataset.ready = 'true'
      })
    }

    update()
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
    }
  }, [visualCategory])

  useEffect(() => {
    let frame = 0
    let last = false

    const updateStickyState = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const section = sectionRef.current
        const toolbar = toolbarRef.current
        if (!section || !toolbar) return

        const rootStyle = getComputedStyle(document.documentElement)
        const headerOffset = Number.parseFloat(rootStyle.getPropertyValue('--public-header-offset')) || 64
        const sectionRect = section.getBoundingClientRect()
        const toolbarRect = toolbar.getBoundingClientRect()
        const releaseBoundary = Math.max(headerOffset + toolbar.offsetHeight + 8, window.innerHeight * 0.72)
        const next =
          sectionRect.top < headerOffset && sectionRect.bottom > releaseBoundary && toolbarRect.top <= headerOffset + 1

        if (next !== last) {
          last = next
          setIsToolbarStuck(next)
        }
      })
    }

    updateStickyState()
    window.addEventListener('scroll', updateStickyState, { passive: true })
    window.addEventListener('resize', updateStickyState)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateStickyState)
      window.removeEventListener('resize', updateStickyState)
    }
  }, [])

  useEffect(() => {
    return () => {
      cancelLoadMore()
      cancelFilterAnimations()
    }
  }, [cancelFilterAnimations, cancelLoadMore])

  useEffect(() => {
    if (!restoreState || isPending) return
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        window.scrollTo({ top: restoreState.scrollY, behavior: 'auto' })

        const current = (window.history.state ?? {}) as Record<string, unknown>
        const { [HANDBOOK_ARTICLE_LIST_HISTORY_KEY]: _restored, ...nextState } = current
        window.history.replaceState(nextState, '')
      })
    })

    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [isPending, restoreState])

  const saveReturnState = () => {
    const current = (window.history.state ?? {}) as Record<string, unknown>
    const value: ArticleListRestoreState = {
      category: visualCategoryRef.current,
      term,
      visibleCount,
      openId,
      scrollY: window.scrollY
    }
    window.history.replaceState({ ...current, [HANDBOOK_ARTICLE_LIST_HISTORY_KEY]: value }, '')
  }

  const selectCategory = (next: ArticleFilter) => {
    if (next === visualCategoryRef.current) return
    setVisualCategory(next)
    visualCategoryRef.current = next
    void runFilterTransition(next, debouncedTerm)
  }

  const clearFilters = () => {
    setVisualCategory(ALL)
    visualCategoryRef.current = ALL
    setTerm('')
    void runFilterTransition(ALL, '')
  }

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    loadMoreTimerRef.current = setTimeout(
      () => {
        captureRowRects()
        setVisibleCount((count) => count + ARTICLE_PAGE_SIZE)
        setIsLoadingMore(false)
        loadMoreTimerRef.current = null
      },
      prefersReducedMotion() ? 0 : 420
    )
  }

  return (
    <section
      ref={sectionRef}
      id='all-articles'
      data-article-list
      className='bg-card scroll-mt-[calc(var(--public-header-offset,64px)+0.75rem)] space-y-5 rounded-2xl border p-5 sm:p-6'
    >
      <header className='space-y-1.5'>
        <h2 className='text-foreground text-3xl font-bold tracking-tight text-balance'>{t('title')}</h2>
        <p className='text-muted-foreground text-sm'>{t('subtitle')}</p>
      </header>

      <div
        ref={toolbarRef}
        data-article-toolbar
        data-stuck={isToolbarStuck ? 'true' : 'false'}
        className={cn(
          'z-30 -mx-5 flex flex-wrap items-center gap-3 border-y border-transparent px-5 py-3 transition-[top,background-color,border-color,box-shadow] motion-reduce:transition-none',
          isToolbarStuck ? 'sticky border-border/70 bg-card/90 shadow-md backdrop-blur-xl' : 'relative'
        )}
        style={{
          top: isToolbarStuck ? 'var(--public-header-offset, 64px)' : 'auto',
          transitionDuration: 'var(--public-header-duration, 180ms)'
        }}
      >
        <div ref={chipRowRef} data-filter-chip-row className='relative flex flex-wrap gap-2'>
          <span
            ref={filterPillRef}
            data-filter-pill
            data-ready='false'
            aria-hidden
            className='pointer-events-none absolute top-0 left-0 z-0 rounded-full'
          />
          {([ALL, ...labelOptions] as ArticleFilter[]).map((option) => {
            const active = visualCategory === option
            return (
              <button
                key={option}
                data-filter-chip={option}
                data-active={active ? 'true' : 'false'}
                type='button'
                onClick={() => selectCategory(option)}
                aria-pressed={active}
                className={cn(
                  'relative z-10 overflow-hidden rounded-full border px-4 py-1.5 text-sm font-medium transition-[color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                  active
                    ? 'border-primary text-success-foreground'
                    : 'text-muted-foreground hover:border-primary/50 hover:text-primary focus-visible:border-primary/50 focus-visible:text-primary'
                )}
              >
                <span className='relative z-10'>{option === ALL ? t('all') : labelName(option)}</span>
              </button>
            )
          })}
        </div>

        <div
          data-article-search-shell
          className='group/search relative ml-auto w-full transition-[width] duration-200 motion-reduce:transition-none sm:w-60 sm:focus-within:w-64'
        >
          <Search
            data-article-search-icon
            className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors duration-200 group-focus-within/search:text-primary'
          />
          <Input
            data-article-search
            value={term}
            onChange={(event) => {
              cancelLoadMore()
              setTerm(event.target.value)
              setOpenId(null)
            }}
            placeholder={t('searchPlaceholder')}
            className='pl-9 transition-[border-color,box-shadow] duration-200'
          />
        </div>
      </div>

      <div ref={contentRef} data-article-list-content className='space-y-5'>
        {isPending ? (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className='h-72 rounded-xl' />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div
            data-article-empty
            className='animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none'
          >
            <EmptyState
              title={t('empty.title')}
              description={t('empty.description')}
              action={
                <Button type='button' variant='outline' size='sm' onClick={clearFilters}>
                  <RotateCcw className='size-4' />
                  {t('clearFilters')}
                </Button>
              }
            />
          </div>
        ) : (
          <ul ref={rowsRef} data-article-rows className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {visible.map((article) => (
              <li key={article.id} data-article-row-item={article.id}>
                {/* Góp ý BuildX: bấm cả thẻ là vào bài (TT08); thẻ ảnh, tiêu đề dưới ảnh (CN04). */}
                <Link
                  data-article-card
                  href={handbookArticleRoute(article.slug)}
                  onClick={saveReturnState}
                  className='group/card bg-card flex h-full flex-col overflow-hidden rounded-xl border transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none'
                >
                  <Photo
                    className='aspect-[16/10] w-full'
                    imageClassName='transition-transform duration-300 ease-out group-hover/card:scale-[1.04] motion-reduce:transition-none'
                    src={article.imageUrl}
                    alt={article.title}
                    sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px'
                  />
                  <div className='flex flex-1 flex-col gap-2 p-4'>
                    <Badge variant='secondary' className='w-fit'>
                      {labelName(article.category)}
                    </Badge>
                    <h3 className='group-hover/card:text-primary line-clamp-2 text-base leading-snug font-semibold transition-colors duration-200'>
                      <HighlightText text={article.title} query={appliedQuery} />
                    </h3>
                    <div
                      className={cn(
                        ARTICLE_META_TEXT,
                        'mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs'
                      )}
                    >
                      <span className='inline-flex items-center gap-1.5 whitespace-nowrap'>
                        <CalendarDays className={cn(ARTICLE_META_ICON, 'size-3.5')} aria-hidden />
                        {formatDisplayDate(article.publishedAt, locale)}
                      </span>
                      <span className='inline-flex items-center gap-1.5 whitespace-nowrap'>
                        <Clock className={cn(ARTICLE_META_ICON, 'size-3.5')} aria-hidden />
                        {t('readingTime', { minutes: article.readingMinutes })}
                      </span>
                      {/* Chữ "Đọc bài" hiện hẳn trên thẻ (góp ý TT08), không chỉ mũi tên. */}
                      <span className='bg-accent text-primary-strong group-hover/card:bg-primary-strong ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-semibold whitespace-nowrap transition-colors duration-200 group-hover/card:text-white'>
                        {t('readArticle')}
                        <ArrowRight className='size-4' aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {hasMore ? (
          <div className='flex justify-center pt-1'>
            <Button
              data-article-load-more
              type='button'
              variant='outline'
              disabled={isLoadingMore}
              onClick={handleLoadMore}
              className='min-w-44 rounded-full'
            >
              {isLoadingMore ? (
                <>
                  <LoaderCircle className='size-4 animate-spin motion-reduce:animate-none' />
                  {t('loading')}
                </>
              ) : (
                <>
                  {t('showMore')}
                  <ArrowRight className='size-4' />
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function escapeSearchToken(token: string): string {
  const special = '\\.^$*+?()[]{}|'
  return [...token].map((character) => (special.includes(character) ? `\\${character}` : character)).join('')
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = normalizeSearchPhrase(query)
  if (!normalizedQuery) return text

  const pattern = normalizedQuery.split(' ').filter(Boolean).map(escapeSearchToken).join('[^\\p{L}\\p{N}]+')
  const matcher = new RegExp(`(^|[^\\p{L}\\p{N}])(${pattern})(?=$|[^\\p{L}\\p{N}])`, 'giu')
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0

  for (const match of text.matchAll(matcher)) {
    const prefix = match[1] ?? ''
    const phrase = match[2] ?? ''
    if (!phrase || match.index === undefined) continue

    const start = match.index + prefix.length
    const end = start + phrase.length
    if (start > cursor) nodes.push(text.slice(cursor, start))
    nodes.push(
      <mark key={`${start}-${key++}`} data-highlight className='bg-warning/20 rounded-sm text-inherit'>
        {text.slice(start, end)}
      </mark>
    )
    cursor = end
  }

  if (cursor === 0) return text
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return <>{nodes}</>
}
