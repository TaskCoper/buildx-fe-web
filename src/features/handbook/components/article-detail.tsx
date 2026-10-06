'use client'

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { ArrowLeft, ArrowUp, Clock } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { Link, useRouter } from '@/i18n/navigation'
import { ErrorState, Photo } from '@/shared/components/common'
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
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES, handbookArticleRoute } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import { ARTICLE_META_ICON, ARTICLE_META_TEXT } from '../constants/article-meta'
import { useArticleLabels } from '../hooks/use-article-labels'
import { useHandbookArticle, useHandbookArticles, useHandbookStages } from '../hooks/use-handbook'
import { selectRelatedArticles } from '../services/handbook.service'
import { ArticleCompactCta, ArticleEndExperience } from './article-action-experience'
import { ConsultButton } from './consult-button'

interface ArticleDetailProps {
  slug: string
  /** Bấm "Tạo dự án mới" ở khối mời cuối cột phải — do lớp app truyền vào. */
  onCreateProject?: () => void
}

/**
 * Trang bài viết (Phần 3.3, Hình 12).
 *
 * Đường dẫn phân cấp bốn cấp theo đúng cấu trúc Cẩm nang → giai đoạn → chủ đề →
 * bài. Cột phải liệt kê các bài cùng chủ đề để đọc tiếp mà không rời chủ đề.
 */
export function ArticleDetail({ slug, onCreateProject }: ArticleDetailProps) {
  const t = useTranslations('handbook.article')
  const locale = useLocale() as Locale
  const { nameOf: labelName } = useArticleLabels()
  const router = useRouter()

  const { data: article, isPending, isError, refetch } = useHandbookArticle(slug)
  const { data: articles } = useHandbookArticles()
  const { data: stages } = useHandbookStages()
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`handbook.article.${slug}`, {
    enabled: !isPending && Boolean(article),
    offsetMs: 120,
    replayOnMount: true
  })

  const stage = stages?.find((item) => item.id === article?.stage)
  const topic = stage?.topics.find((item) => item.id === article?.topicId)

  const related = useMemo(() => (article ? selectRelatedArticles(articles ?? [], article) : []), [articles, article])
  const articleRef = useRef<HTMLElement>(null)
  const navigationLockedRef = useRef(false)
  const exitAnimationRef = useRef<Animation | null>(null)
  const scrollVelocityRef = useRef(0)
  const [heroLoadedSlug, setHeroLoadedSlug] = useState<string | null>(null)
  const [backToTopSlug, setBackToTopSlug] = useState<string | null>(null)
  const showBackToTop = backToTopSlug === slug

  const stageHref = stage ? `${ROUTES.HANDBOOK}?stage=${encodeURIComponent(stage.id)}` : ROUTES.HANDBOOK
  const topicHref =
    stage && topic
      ? `${ROUTES.HANDBOOK}?stage=${encodeURIComponent(stage.id)}&topic=${encodeURIComponent(topic.id)}`
      : stageHref

  const navigateArticle = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, href: string, direction: 'back' | 'forward') => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      event.preventDefault()
      if (navigationLockedRef.current) return
      navigationLockedRef.current = true

      const finish = () => {
        if (direction === 'forward') {
          sessionStorage.setItem('savico.handbook.article-direction', 'forward')
        } else {
          sessionStorage.removeItem('savico.handbook.article-direction')
        }
        router.push(href, { scroll: true })
      }

      const root = rootRef.current
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!root || reduced) {
        finish()
        return
      }

      const distance = direction === 'forward' ? -28 : 28
      const animation = root.animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0.78, transform: `translateX(${distance}px)` }
        ],
        { duration: 210, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
      )
      exitAnimationRef.current = animation
      void animation.finished
        .then(() => {
          if (exitAnimationRef.current !== animation) return
          finish()
        })
        .catch(() => undefined)
    },
    [rootRef, router]
  )

  useLayoutEffect(() => {
    navigationLockedRef.current = false
    exitAnimationRef.current?.cancel()
    exitAnimationRef.current = null

    if (isPending || !article) return
    if (sessionStorage.getItem('savico.handbook.article-direction') !== 'forward') return
    sessionStorage.removeItem('savico.handbook.article-direction')

    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = root.animate(
      [
        { opacity: 0.82, transform: 'translateX(28px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    )
    return () => animation.cancel()
  }, [article, isPending, rootRef, slug])

  useEffect(() => {
    if (isPending || !article) return
    const root = rootRef.current
    const articleElement = articleRef.current
    if (!root || !articleElement) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-article-scroll-reveal]'))
    // Snapshot which reveal sections are already visible on the very first
    // article paint. Browser scroll restoration / resize can report a large
    // synthetic velocity during reload, but these nodes were not reached by a
    // user's fast scroll and must keep the same 1 -> 2 -> 3 entrance cadence.
    const initialViewportNodes = new Set(
      revealNodes.filter((node) => {
        const rect = node.getBoundingClientRect()
        return rect.bottom > 0 && rect.top < window.innerHeight * 0.92
      })
    )
    let frame = 0
    let lastY = window.scrollY
    let lastAt = performance.now()
    let backToTopVisible = false
    const revealTimers: number[] = []
    const revealFrames: number[] = []
    const revealCycleStartedAt = performance.now()

    const updateScrollState = () => {
      frame = 0
      const now = performance.now()
      const currentY = window.scrollY
      const elapsed = Math.max(1, now - lastAt)
      scrollVelocityRef.current = Math.abs(currentY - lastY) / elapsed
      lastY = currentY
      lastAt = now

      const articleRect = articleElement.getBoundingClientRect()
      const articleTop = currentY + articleRect.top
      const articleEnd = articleTop + articleElement.offsetHeight - window.innerHeight
      const progress = Math.max(0, Math.min(1, (currentY - articleTop) / Math.max(1, articleEnd - articleTop)))
      document.documentElement.style.setProperty('--handbook-reading-progress', String(progress))

      const body = root.querySelector<HTMLElement>('[data-article-body]')
      const headerOffset =
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--public-header-offset')) || 64
      const nextBackToTop = Boolean(body && body.getBoundingClientRect().top <= headerOffset + 4)
      if (nextBackToTop !== backToTopVisible) {
        backToTopVisible = nextBackToTop
        setBackToTopSlug(nextBackToTop ? slug : null)
      }
    }

    const scheduleScrollUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateScrollState)
    }

    let observer: IntersectionObserver | null = null
    if (reduced) {
      revealNodes.forEach((node) => {
        node.dataset.articleReveal = 'shown'
      })
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          const skipSecondaryMotion = scrollVelocityRef.current > 4

          for (const [entryIndex, entry] of visibleEntries.entries()) {
            const node = entry.target as HTMLElement
            const isInitialViewportReveal = initialViewportNodes.has(node)
            observer?.unobserve(node)

            if (skipSecondaryMotion && !isInitialViewportReveal) {
              node.dataset.articleReveal = 'instant'
              continue
            }

            // An item can already be inside the viewport on the first render
            // (for example when the browser is zoomed out). Give the pending
            // state two real paint opportunities before switching to shown;
            // otherwise IntersectionObserver can fire before the browser ever
            // paints the hidden/offset state and section 3 appears instantly.
            const firstFrame = window.requestAnimationFrame(() => {
              const secondFrame = window.requestAnimationFrame(() => {
                const sectionNumber = Number(node.dataset.articleSection ?? 0)
                const elapsedSinceCycleStart = performance.now() - revealCycleStartedAt
                // Sections 1 and 2 use the shared page entrance rhythm:
                // 120ms page offset + 390ms step delay + 70ms per section.
                // If section 3+ is already visible on reload (zoomed-out / tall
                // viewport), continue that exact cadence instead of revealing it
                // immediately. Scroll-triggered reveals later on only stagger by
                // 70ms between simultaneously visible sections.
                const initialTargetDelay = 120 + 390 + sectionNumber * 70
                const cadenceDelay = isInitialViewportReveal
                  ? Math.max(120, initialTargetDelay - elapsedSinceCycleStart)
                  : entryIndex * 70
                const timer = window.setTimeout(() => {
                  node.dataset.articleReveal = 'shown'
                }, cadenceDelay)
                revealTimers.push(timer)
              })
              revealFrames.push(secondFrame)
            })
            revealFrames.push(firstFrame)
          }
        },
        { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
      )
      revealNodes.forEach((node) => observer?.observe(node))
    }

    updateScrollState()
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true })
    window.addEventListener('resize', scheduleScrollUpdate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      revealFrames.forEach((revealFrame) => window.cancelAnimationFrame(revealFrame))
      revealTimers.forEach((timer) => window.clearTimeout(timer))
      observer?.disconnect()
      window.removeEventListener('scroll', scheduleScrollUpdate)
      window.removeEventListener('resize', scheduleScrollUpdate)
      document.documentElement.style.removeProperty('--handbook-reading-progress')
    }
  }, [article, isPending, rootRef, slug])

  if (isPending) return <ArticleDetailSkeleton />
  if (isError) {
    return (
      <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
        <ErrorState
          title={t('loadError')}
          description={t('loadErrorHint')}
          retryLabel={t('retry')}
          onRetry={() => void refetch()}
        />
      </div>
    )
  }
  if (!article) return <ErrorState title={t('notFound')} description={t('notFoundHint')} />

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-8 px-4 py-5 lg:px-8'
    >
      <Link
        href={ROUTES.HANDBOOK}
        onClick={(event) => navigateArticle(event, ROUTES.HANDBOOK, 'back')}
        className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors lg:hidden'
      >
        <ArrowLeft className='size-4' />
        {t('breadcrumbRoot')}
      </Link>
      <Breadcrumb data-entrance-step='0' data-article-breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                data-article-breadcrumb-link
                href={ROUTES.HANDBOOK}
                onClick={(event) => navigateArticle(event, ROUTES.HANDBOOK, 'back')}
              >
                {t('breadcrumbRoot')}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {stage ? (
            <>
              <BreadcrumbSeparator>{'>'}</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    data-article-breadcrumb-link
                    href={stageHref}
                    onClick={(event) => navigateArticle(event, stageHref, 'back')}
                  >
                    {stage.title}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
          {topic ? (
            <>
              <BreadcrumbSeparator>{'>'}</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    data-article-breadcrumb-link
                    href={topicHref}
                    onClick={(event) => navigateArticle(event, topicHref, 'back')}
                  >
                    {topic.title}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
          <BreadcrumbSeparator>{'>'}</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{article.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='grid gap-6 lg:grid-cols-[1.7fr_1fr]'>
        <article
          key={article.id}
          ref={articleRef}
          data-article-reading-root
          className='bg-card overflow-hidden rounded-2xl border'
        >
          <div className='space-y-5 p-6'>
            <header data-article-intro data-entrance-step='1' className='space-y-5'>
              {stage || topic ? (
                <Badge variant='secondary'>{[stage?.title, topic?.title].filter(Boolean).join(' · ')}</Badge>
              ) : (
                <Badge variant='secondary'>{labelName(article.category)}</Badge>
              )}

              <h1 className='text-3xl font-semibold tracking-tight text-balance'>{article.title}</h1>

              <p className={cn(ARTICLE_META_TEXT, 'flex flex-wrap items-center gap-2 text-sm whitespace-nowrap')}>
                {/* Một định dạng ngày cho cả Cẩm nang: dd/mm/yyyy (góp ý BuildX). */}
                {t('updatedAt', {
                  date: formatDisplayDate(article.publishedAt, locale, {
                    weekday: true,
                    // Bài cũ chỉ lưu ngày — không bịa ra giờ.
                    time: article.publishedAt.includes('T')
                  })
                })}
                <span aria-hidden>·</span>
                <Clock className={cn(ARTICLE_META_ICON, 'size-4')} />
                {t('readingTime', { minutes: article.readingMinutes })}
              </p>
            </header>

            <div
              data-article-hero
              data-entrance-step='2'
              className='bg-primary/5 aspect-16/9 w-full overflow-hidden rounded-xl'
            >
              <Photo
                className='bg-primary/5 size-full rounded-xl'
                imageClassName={cn(
                  'transition-opacity duration-500 ease-out motion-reduce:duration-200',
                  heroLoadedSlug === slug ? 'opacity-100' : 'opacity-0'
                )}
                src={article.imageUrl}
                alt={article.title}
                sizes='(max-width: 1024px) 100vw, 760px'
                priority
                onLoad={() => setHeroLoadedSlug(slug)}
              />
            </div>

            <div data-article-body className='space-y-6'>
              {article.contentHtml ? (
                <>
                  {/*
                    Nội dung bài do admin biên soạn và ĐÃ được backend làm sạch theo
                    allowlist (p, br, strong, em, h2–h6, ul, ol, li, blockquote, a,
                    img — script/style/handler/URL javascript:data: bị loại). Repo
                    chưa có thư viện sanitize phía client nên render trực tiếp; rủi ro
                    XSS đã được chặn ở server. Nhánh này chỉ chạy cho bài từ API.
                  */}
                  <div
                    className='space-y-4 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-primary/40 [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h2]:text-primary [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5'
                    dangerouslySetInnerHTML={{ __html: article.contentHtml }}
                  />
                  <ArticleCompactCta article={article} onCreateProject={onCreateProject} />
                </>
              ) : (
                article.body.map((section, index) => (
                  <div key={`${article.id}:${section.heading ?? index}`} className='space-y-6'>
                    <section
                      data-article-section={index + 1}
                      data-entrance-step={index < 2 ? '3' : undefined}
                      data-entrance-order={index < 2 ? String(index + 1) : undefined}
                      data-article-scroll-reveal={index >= 2 ? 'true' : undefined}
                      data-article-reveal={index >= 2 ? 'pending' : undefined}
                      className='space-y-3'
                    >
                      {section.heading ? (
                        <h2 className='text-primary text-lg font-semibold'>
                          {index + 1}. {section.heading}
                        </h2>
                      ) : null}
                      {/* Hình 12: đoạn có ảnh thì chữ chiếm cột trái rộng hơn, ảnh
                      nằm phải và căn theo đầu đoạn — không kéo cao bằng cột chữ. */}
                      <div
                        className={cn(
                          'space-y-2',
                          section.imageUrl && 'sm:grid sm:grid-cols-[1.35fr_1fr] sm:items-start sm:gap-4 sm:space-y-0'
                        )}
                      >
                        <div className='space-y-2'>
                          {section.paragraphs.map((paragraph) => (
                            <p key={paragraph} className='text-sm leading-relaxed'>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                        {section.imageUrl ? (
                          <Photo
                            className='aspect-4/3 w-full rounded-lg'
                            src={section.imageUrl}
                            alt={section.heading ?? article.title}
                            sizes='(max-width: 640px) 100vw, 340px'
                          />
                        ) : null}
                      </div>
                    </section>

                    {index === Math.max(0, Math.floor(article.body.length / 2) - 1) ? (
                      <ArticleCompactCta article={article} onCreateProject={onCreateProject} />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <ArticleEndExperience article={article} articleRef={articleRef} onCreateProject={onCreateProject} />
        </article>

        <aside
          key={`aside:${article.id}`}
          data-article-aside
          className='space-y-4 lg:sticky lg:self-start'
          style={{
            top: 'calc(var(--public-header-offset, 64px) + 1rem)',
            transition: 'top var(--public-header-duration, 180ms) ease-out'
          }}
        >
          {/* Góp ý BuildX: cột phải cố định khi cuộn, chỉ còn bài viết liên quan xếp
              dọc + nút tròn "Đặt lịch tư vấn 1:1" ngay dưới. */}
          {related.length > 0 ? (
            <section
              data-article-related
              data-entrance-step='2'
              data-entrance-from='right'
              className='bg-card space-y-3 rounded-2xl border p-5'
            >
              <h2 className='text-base font-semibold'>{t('related')}</h2>
              <ul className='divide-y'>
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={handbookArticleRoute(item.slug)}
                      onClick={(event) => navigateArticle(event, handbookArticleRoute(item.slug), 'forward')}
                      className='group flex gap-3 py-3'
                    >
                      <Photo
                        className='size-16 shrink-0 rounded-lg'
                        imageClassName='transition-transform duration-300 ease-out motion-reduce:transition-none'
                        src={item.imageUrl}
                        alt={item.title}
                        sizes='64px'
                      />
                      <span className='min-w-0 space-y-1'>
                        <span className='group-hover:text-primary line-clamp-2 block text-sm font-medium transition-colors'>
                          {item.title}
                        </span>
                        <span className={cn(ARTICLE_META_TEXT, 'block text-xs')}>
                          {[
                            stages?.find((s) => s.id === item.stage)?.title,
                            t('readingTime', { minutes: item.readingMinutes })
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div
            data-article-consult-card
            data-entrance-step='3'
            data-entrance-from='right'
            className='flex justify-center'
          >
            <ConsultButton variant='pill' />
          </div>
        </aside>
      </div>

      <Button
        type='button'
        variant='outline'
        size='icon'
        data-article-back-to-top
        data-visible={showBackToTop ? 'true' : 'false'}
        aria-label={t('backToTop')}
        className='bg-card fixed right-5 bottom-5 z-30 rounded-full shadow-md sm:right-7 sm:bottom-7'
        onClick={() => {
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
        }}
      >
        <ArrowUp className='size-4' />
      </Button>
    </div>
  )
}

function ArticleDetailSkeleton() {
  return (
    <div
      data-handbook-loading='true'
      className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-8 px-4 py-5 lg:px-8'
      aria-hidden='true'
    >
      <Skeleton className='handbook-skeleton animate-none h-4 w-72 max-w-[78%]' />
      <div className='grid gap-6 lg:grid-cols-[1.7fr_1fr]'>
        <article className='bg-card space-y-5 rounded-2xl border p-6'>
          <Skeleton className='handbook-skeleton animate-none h-6 w-28 rounded-full' />
          <Skeleton className='handbook-skeleton animate-none h-9 w-4/5' />
          <Skeleton className='handbook-skeleton animate-none h-4 w-44' />
          <Skeleton className='handbook-skeleton animate-none aspect-16/9 w-full rounded-xl' />
          <div className='space-y-5 pt-1'>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className='space-y-2.5'>
                <Skeleton className='handbook-skeleton animate-none h-5 w-52 max-w-[65%]' />
                <Skeleton className='handbook-skeleton animate-none h-3 w-full' />
                <Skeleton className='handbook-skeleton animate-none h-3 w-[94%]' />
                <Skeleton className='handbook-skeleton animate-none h-3 w-[82%]' />
              </div>
            ))}
          </div>
        </article>
        <aside className='space-y-4'>
          <div className='bg-card space-y-3 rounded-2xl border p-5'>
            <Skeleton className='handbook-skeleton animate-none h-5 w-32' />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className='handbook-skeleton animate-none h-4 w-full' />
            ))}
          </div>
          <div className='bg-primary/5 border-primary/30 space-y-3 rounded-2xl border p-5'>
            <Skeleton className='handbook-skeleton animate-none size-8 rounded-lg' />
            <Skeleton className='handbook-skeleton animate-none h-4 w-5/6' />
            <Skeleton className='handbook-skeleton animate-none h-10 w-full rounded-lg' />
          </div>
          <div className='bg-card rounded-2xl border p-5'>
            <Skeleton className='handbook-skeleton animate-none h-5 w-40' />
          </div>
        </aside>
      </div>
    </div>
  )
}
