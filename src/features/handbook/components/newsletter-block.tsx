'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ArrowRight, Clock } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { Photo } from '@/shared/components/common'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { handbookArticleRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import { ARTICLE_META_ICON, ARTICLE_META_TEXT } from '../constants/article-meta'
import { useArticleLabels } from '../hooks/use-article-labels'
import { HANDBOOK_ARTICLE_LIST_HISTORY_KEY, HANDBOOK_CATEGORY_SELECT_EVENT } from '../constants/handbook.constants'
import { useHandbookArticles } from '../hooks/use-handbook'
import { featuredArticles, sortByNewest } from '../services/handbook.service'
import type { HandbookArticle } from '../types/handbook.types'

/**
 * "Bản tin SAVICO" (Phần 3.2, Hình 11).
 *
 * Bài do đội nội dung chọn đẩy lên: một bài nổi bật lớn, ba bài phụ đánh số và
 * cột bài liên quan bên phải. Thứ tự lấy từ `featuredRank` chứ không phải theo
 * ngày — đây là khối biên tập, không phải dòng thời gian.
 */
export function NewsletterBlock() {
  const t = useTranslations('handbook.newsletter')
  const { nameOf: labelName } = useArticleLabels()
  const locale = useLocale() as Locale
  const sectionRef = useRef<HTMLElement>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewArticleId, setPreviewArticleId] = useState<string | null>(null)
  const [swapVersion, setSwapVersion] = useState(0)

  const { data: articles, isPending } = useHandbookArticles(undefined, undefined, { source: 'mock' })
  const featured = useMemo(() => featuredArticles(articles ?? []), [articles])
  const related = useMemo(
    () => sortByNewest(articles ?? []).filter((article) => !featured.includes(article)),
    [articles, featured]
  )

  const lead = featured[0]
  const supporting = featured.slice(1)
  const displayedLead = previewArticleId ? (featured.find((article) => article.id === previewArticleId) ?? lead) : lead
  const displayedLeadIndex = displayedLead ? featured.findIndex((article) => article.id === displayedLead.id) : -1
  const displayedLeadNumber = String(displayedLeadIndex >= 0 ? displayedLeadIndex + 1 : 1).padStart(2, '0')

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || isPending || featured.length === 0) return
    const historyState = window.history.state as Record<string, unknown> | null
    if (historyState?.[HANDBOOK_ARTICLE_LIST_HISTORY_KEY]) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rule = section.querySelector<HTMLElement>('[data-newsletter-rule]')
    const title = section.querySelector<HTMLElement>('[data-newsletter-title]')
    const date = section.querySelector<HTMLElement>('[data-newsletter-date]')
    const leadImage = section.querySelector<HTMLElement>('[data-newsletter-lead-image]')
    const leadNumber = section.querySelector<HTMLElement>('[data-newsletter-lead-number]')
    const leadParts = Array.from(section.querySelectorAll<HTMLElement>('[data-newsletter-lead-part]'))
    const supportingCards = Array.from(section.querySelectorAll<HTMLElement>('[data-newsletter-supporting]'))
    const relatedRows = Array.from(section.querySelectorAll<HTMLElement>('[data-newsletter-related]'))
    if (!rule || !title) return

    const nodes = [title, date].filter((node): node is HTMLElement => Boolean(node))
    nodes.forEach((node) => {
      node.style.opacity = '0'
    })
    title.style.transform = 'translateX(-12px)'
    if (date) date.style.transform = 'translateY(5px)'
    rule.style.transform = 'scaleX(0)'
    rule.style.transformOrigin = 'left center'
    if (leadImage) {
      leadImage.style.opacity = '0'
      leadImage.style.transform = 'scale(1.035)'
    }
    if (leadNumber) {
      leadNumber.style.opacity = '0'
      leadNumber.style.transform = 'translateY(-8px)'
    }
    leadParts.forEach((node) => {
      node.style.opacity = '0'
      node.style.transform = 'translateY(8px)'
    })
    supportingCards.forEach((node) => {
      node.style.opacity = '0'
      node.style.transform = 'translateY(12px)'
    })
    relatedRows.forEach((node) => {
      node.style.opacity = '0'
      node.style.transform = 'translateX(16px)'
    })

    const animations: Animation[] = []
    const remember = (animation: Animation, settle: () => void) => {
      animations.push(animation)
      void animation.finished
        .then(() => {
          animation.cancel()
          settle()
        })
        .catch(() => undefined)
    }

    const settleNode = (node: HTMLElement | null) => {
      if (!node) return
      node.style.removeProperty('opacity')
      node.style.removeProperty('transform')
    }

    const settleAll = (immediate = false) => {
      const transitionTargets = [
        ...nodes,
        leadImage,
        leadNumber,
        ...leadParts,
        ...supportingCards,
        ...relatedRows
      ].filter((node): node is HTMLElement => Boolean(node))

      if (immediate) {
        transitionTargets.forEach((node) => {
          node.style.transition = 'none'
        })
      }
      animations.forEach((animation) => animation.cancel())
      animations.length = 0
      rule.style.removeProperty('transform')
      rule.style.removeProperty('transform-origin')
      nodes.forEach(settleNode)
      settleNode(leadImage)
      settleNode(leadNumber)
      leadParts.forEach(settleNode)
      supportingCards.forEach(settleNode)
      relatedRows.forEach(settleNode)

      if (immediate) {
        void section.offsetWidth
        transitionTargets.forEach((node) => {
          node.getAnimations().forEach((animation) => animation.cancel())
        })
        requestAnimationFrame(() => {
          transitionTargets.forEach((node) => node.style.removeProperty('transition'))
        })
      }
    }

    let revealed = false
    const reveal = (skipSecondaryMotion = false) => {
      if (revealed) return
      revealed = true
      observer.disconnect()

      if (skipSecondaryMotion) {
        settleAll(true)
        return
      }

      remember(
        rule.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration: 420,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both'
        }),
        () => {
          rule.style.removeProperty('transform')
          rule.style.removeProperty('transform-origin')
        }
      )
      remember(
        title.animate(
          [
            { opacity: 0, transform: 'translateX(-12px)' },
            { opacity: 1, transform: 'translateX(0)' }
          ],
          { duration: 300, delay: 100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
        ),
        () => settleNode(title)
      )
      if (date) {
        remember(
          date.animate(
            [
              { opacity: 0, transform: 'translateY(5px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 240, delay: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
          ),
          () => settleNode(date)
        )
      }
      if (leadImage) {
        remember(
          leadImage.animate(
            [
              { opacity: 0, transform: 'scale(1.035)' },
              { opacity: 1, transform: 'scale(1)' }
            ],
            { duration: 460, delay: 470, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
          ),
          () => settleNode(leadImage)
        )
      }
      if (leadNumber) {
        remember(
          leadNumber.animate(
            [
              { opacity: 0, transform: 'translateY(-8px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 300, delay: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
          ),
          () => settleNode(leadNumber)
        )
      }
      leadParts.forEach((node, index) => {
        remember(
          node.animate(
            [
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 300,
              delay: 600 + index * 78,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'both'
            }
          ),
          () => settleNode(node)
        )
      })
      supportingCards.forEach((node, index) => {
        remember(
          node.animate(
            [
              { opacity: 0, transform: 'translateY(12px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 320,
              delay: 1160 + index * 90,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'both'
            }
          ),
          () => settleNode(node)
        )
      })
      relatedRows.forEach((node, index) => {
        remember(
          node.animate(
            [
              { opacity: 0, transform: 'translateX(16px)' },
              { opacity: 1, transform: 'translateX(0)' }
            ],
            {
              duration: 320,
              delay: 650 + index * 82,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'both'
            }
          ),
          () => settleNode(node)
        )
      })
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        reveal(false)
      },
      { threshold: 0.16 }
    )

    const handleViewportScroll = () => {
      const rect = section.getBoundingClientRect()
      if (rect.bottom < 0) {
        if (revealed) settleAll(true)
        else reveal(true)
        return
      }

      if (!revealed && rect.top < window.innerHeight * 0.88 && rect.bottom > window.innerHeight * 0.08) {
        reveal(false)
      }
    }

    observer.observe(section)
    window.addEventListener('scroll', handleViewportScroll, { passive: true })
    requestAnimationFrame(handleViewportScroll)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleViewportScroll)
      settleAll()
    }
  }, [featured.length, isPending])

  const startSupportingPreview = (article: HandbookArticle) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      setSwapVersion((version) => version + 1)
      setPreviewArticleId(article.id)
    }, 650)
  }

  const stopSupportingPreview = (article: HandbookArticle) => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    if (previewArticleId === article.id) {
      setSwapVersion((version) => version + 1)
      setPreviewArticleId(null)
    }
  }

  const handleSeeAllRelated = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (lead) {
      window.dispatchEvent(
        new CustomEvent(HANDBOOK_CATEGORY_SELECT_EVENT, {
          detail: { category: lead.category }
        })
      )
    }
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#all-articles')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      })
    })
  }

  if (isPending) return <Skeleton className='h-96 rounded-2xl' />
  if (featured.length === 0) return null

  return (
    <section ref={sectionRef} data-newsletter-block className='border-primary/30 bg-card rounded-2xl border p-5'>
      {/* Góp ý BuildX: bỏ dòng phân loại, ngày dời về góc phải cùng hàng tiêu đề. */}
      <header className='relative flex flex-wrap items-baseline justify-between gap-2 pb-3'>
        <h2 data-newsletter-title className='text-foreground text-3xl font-bold tracking-tight text-balance'>
          {t('title')}
        </h2>
        {lead ? (
          <p data-newsletter-date className='text-foreground/80 text-sm font-semibold'>
            {formatDisplayDate(lead.publishedAt, locale, { weekday: true })}
          </p>
        ) : null}
        <span
          data-newsletter-rule
          aria-hidden
          className='bg-border absolute inset-x-0 bottom-0 h-px origin-left motion-reduce:transform-none'
        />
      </header>

      <div className='grid gap-6 pt-5 lg:grid-cols-[1.6fr_1fr]'>
        <div className='space-y-5'>
          <h3 className='border-primary inline-block border-b-2 pb-1 text-lg font-semibold'>{t('featured')}</h3>

          {displayedLead ? (
            <article
              key={`${displayedLead.id}-${swapVersion}`}
              data-newsletter-lead
              data-newsletter-swap={swapVersion > 0 ? 'true' : 'false'}
              className='grid gap-4 sm:grid-cols-2'
            >
              <div data-newsletter-lead-image>
                <Photo
                  className='aspect-4/3 w-full rounded-xl'
                  src={displayedLead.imageUrl}
                  alt={displayedLead.title}
                  sizes='(max-width: 640px) 100vw, 380px'
                />
              </div>
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <span data-newsletter-lead-part>
                    <Badge variant='secondary'>{labelName(displayedLead.category)}</Badge>
                  </span>
                  <span data-newsletter-lead-number className='text-primary-strong text-3xl font-black'>
                    {displayedLeadNumber}
                  </span>
                </div>
                <Link data-newsletter-lead-part href={handbookArticleRoute(displayedLead.slug)} className='block'>
                  <h4 data-newsletter-lead-title className='text-xl leading-snug font-semibold text-balance'>
                    {displayedLead.title}
                  </h4>
                </Link>
                <p data-newsletter-lead-part className='text-muted-foreground text-sm leading-relaxed'>
                  {displayedLead.excerpt}
                </p>
                <p
                  data-newsletter-lead-part
                  className={cn(
                    ARTICLE_META_TEXT,
                    'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs whitespace-nowrap'
                  )}
                >
                  {formatDisplayDate(displayedLead.publishedAt, locale, { weekday: true })}
                  <span aria-hidden>·</span>
                  <Clock className={cn(ARTICLE_META_ICON, 'size-3.5')} />
                  {t('readingTime', { minutes: displayedLead.readingMinutes })}
                </p>
              </div>
            </article>
          ) : null}

          <ul className='grid gap-3 sm:grid-cols-3'>
            {supporting.map((article, index) => (
              <li key={article.id}>
                <Link
                  data-newsletter-supporting
                  href={handbookArticleRoute(article.slug)}
                  onPointerEnter={() => startSupportingPreview(article)}
                  onPointerLeave={() => stopSupportingPreview(article)}
                  onBlur={() => stopSupportingPreview(article)}
                  className='group flex h-full gap-2 rounded-xl border p-2.5 transition-[transform,border-color,background-color] duration-200 ease-out'
                >
                  <span
                    data-newsletter-supporting-number
                    className='text-primary-strong text-xl leading-none font-black'
                  >
                    {String(index + 2).padStart(2, '0')}
                  </span>
                  <div data-newsletter-supporting-image className='shrink-0'>
                    <Photo className='size-14 rounded-lg' src={article.imageUrl} alt={article.title} sizes='56px' />
                  </div>
                  <span className='min-w-0 space-y-1'>
                    <span className='line-clamp-3 block text-sm font-medium'>{article.title}</span>
                    <span className={cn(ARTICLE_META_TEXT, 'flex items-center gap-1 text-xs whitespace-nowrap')}>
                      <Clock className={cn(ARTICLE_META_ICON, 'size-3')} />
                      {t('readingTime', { minutes: article.readingMinutes })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className='space-y-4 lg:border-l lg:pl-6'>
          <h3 className='border-primary inline-block border-b-2 pb-1 text-lg font-semibold'>{t('related')}</h3>
          <ul className='divide-y'>
            {related.slice(0, 4).map((article) => (
              <li key={article.id} className='py-3 first:pt-0'>
                <RelatedRow article={article} />
              </li>
            ))}
          </ul>
          <Link
            data-stage-guide-link
            href='#all-articles'
            onClick={handleSeeAllRelated}
            className='text-primary group inline-flex items-center gap-1.5 text-sm font-medium'
          >
            <span className='relative grid'>
              <span aria-hidden className='invisible col-start-1 row-start-1 font-bold'>
                {t('seeAllRelated')}
              </span>
              <span className='col-start-1 row-start-1 group-hover:font-bold group-focus-visible:font-bold'>
                {t('seeAllRelated')}
              </span>
              <span
                data-stage-guide-underline
                aria-hidden
                className='bg-primary absolute right-0 -bottom-0.5 left-0 h-px motion-reduce:transition-none'
              />
            </span>
            <ArrowRight
              data-step-link-arrow
              data-newsletter-see-all-arrow
              className='size-4 transition-transform duration-200'
            />
          </Link>
        </div>
      </div>
    </section>
  )
}

function RelatedRow({ article }: { article: HandbookArticle }) {
  const t = useTranslations('handbook.newsletter')
  const { nameOf: labelName } = useArticleLabels()

  return (
    <Link
      data-newsletter-related
      href={handbookArticleRoute(article.slug)}
      className='group flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors duration-200'
    >
      <div data-newsletter-related-image className='shrink-0'>
        <Photo className='size-16 rounded-lg' src={article.imageUrl} alt={article.title} sizes='64px' />
      </div>
      <span className='min-w-0 flex-1 space-y-1'>
        <span data-newsletter-related-title className='line-clamp-2 block text-sm font-medium transition-colors'>
          {article.title}
        </span>
        <span className='block text-xs'>
          <span className='text-primary'>{labelName(article.category)}</span>
          <span className={cn(ARTICLE_META_TEXT, 'whitespace-nowrap')}>
            {' '}
            · {t('readingTime', { minutes: article.readingMinutes })}
          </span>
        </span>
      </span>
      <ArrowRight
        data-newsletter-related-arrow
        aria-hidden
        className='text-primary size-4 shrink-0 transition-[opacity,transform] duration-200'
      />
    </Link>
  )
}
