'use client'

import { ArrowRight, Check, FilePlus2, Scale, UserRoundPlus, X, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'

import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/shared/auth'
import { useCmsCollection, useSiteImage } from '@/shared/cms'
import { Photo } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { JOURNEY_POPUP_TEST_MODE } from '@/shared/constants'
import { ROUTES } from '@/shared/constants/routes'
import { BUILDING_IMAGE, SUPERVISION_IMAGE, TOPIC_IMAGE, cn } from '@/shared/lib'
import type { HandbookArticle } from '../types/handbook.types'

const ARTICLE_POPUP_KEY = 'savico.page-popup.article'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface ArticleActionProps {
  article: HandbookArticle
  onCreateProject?: () => void
}

interface ArticleEndExperienceProps extends ArticleActionProps {
  articleRef: RefObject<HTMLElement | null>
}

interface PopupMemory {
  suppressedUntil: number | null
  completedAt: number | null
}

function storageKey(articleId: string) {
  return `${ARTICLE_POPUP_KEY}.${articleId}`
}

function readMemory(articleId: string): PopupMemory {
  if (typeof window === 'undefined' || JOURNEY_POPUP_TEST_MODE) return { suppressedUntil: null, completedAt: null }
  try {
    const raw = window.localStorage.getItem(storageKey(articleId))
    if (!raw) return { suppressedUntil: null, completedAt: null }
    const parsed = JSON.parse(raw) as Partial<PopupMemory>
    return {
      suppressedUntil: typeof parsed.suppressedUntil === 'number' ? parsed.suppressedUntil : null,
      completedAt: typeof parsed.completedAt === 'number' ? parsed.completedAt : null
    }
  } catch {
    return { suppressedUntil: null, completedAt: null }
  }
}

function writeMemory(articleId: string, memory: PopupMemory) {
  if (typeof window === 'undefined' || JOURNEY_POPUP_TEST_MODE) return
  window.localStorage.setItem(storageKey(articleId), JSON.stringify(memory))
}

function useIsS5() {
  const userEmail = useAuthStore((state) => state.user?.email)
  const transactions = useCmsCollection('transactions')

  return useMemo(() => {
    if (!userEmail) return false
    const email = userEmail.toLowerCase()
    // Chỉ tính S5 theo đơn giám sát ĐÃ THANH TOÁN. Không dựa vào chủ dự án giám
    // sát: bản mock gán chủ cho bất kỳ ai mở bảng điều khiển giám sát, làm popup
    // biến mất với tài khoản chỉ ghé xem thử.
    return transactions.some(
      (transaction) =>
        transaction.customerEmail.toLowerCase() === email &&
        transaction.status === 'paid' &&
        (transaction.tier === 'check' || transaction.tier === 'control')
    )
  }, [transactions, userEmail])
}

export function ArticleCompactCta({ article, onCreateProject }: ArticleActionProps) {
  const t = useTranslations('handbook.articleJourney.compact')
  const isS5 = useIsS5()

  if (isS5) return null

  return (
    <motion.section
      data-article-mid-cta
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className='border-primary/15 bg-accent rounded-[14px] border px-5 py-5 sm:px-6'
    >
      <div>
        <h3 className='text-primary-strong text-[18px] font-extrabold tracking-[-0.015em]'>{t('title')}</h3>
        <p className='mt-1 text-[13px] leading-relaxed text-[#737c77]'>{t('subtitle')}</p>
      </div>
      <div className='mt-3'>
        <ActionButtons article={article} onCreateProject={onCreateProject} compact />
      </div>
    </motion.section>
  )
}

export function ArticleEndExperience({ article, articleRef, onCreateProject }: ArticleEndExperienceProps) {
  const t = useTranslations('handbook.articleJourney')
  const endImage = useSiteImage('topic.articleEnd')
  const reduceMotion = useReducedMotion()
  const endRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const triggeredRef = useRef(false)
  const completedActionRef = useRef(false)

  const isS5 = useIsS5()

  useEffect(() => {
    if (isS5) return
    const articleElement = articleRef.current
    const endElement = endRef.current
    if (!articleElement || !endElement) return

    const memory = readMemory(article.id)
    const now = Date.now()
    if (
      !JOURNEY_POPUP_TEST_MODE &&
      (memory.completedAt !== null || (memory.suppressedUntil !== null && now < memory.suppressedUntil))
    ) {
      return
    }

    const tryOpen = () => {
      if (triggeredRef.current) return
      const rect = articleElement.getBoundingClientRect()
      const pageY = window.scrollY
      const articleTop = pageY + rect.top
      const articleEnd = articleTop + articleElement.offsetHeight - window.innerHeight
      const progress = Math.max(0, Math.min(1, (pageY - articleTop) / Math.max(1, articleEnd - articleTop)))
      const endReached = endElement.getBoundingClientRect().top <= window.innerHeight * 0.92

      if (progress < 0.7 && !endReached) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return

      triggeredRef.current = true
      setOpen(true)
    }

    const onScroll = () => window.requestAnimationFrame(tryOpen)
    tryOpen()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', tryOpen)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', tryOpen)
    }
  }, [article.id, articleRef, isS5])

  if (isS5) return null

  const commitAction = () => {
    completedActionRef.current = true
    writeMemory(article.id, { suppressedUntil: null, completedAt: Date.now() })
    setOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open && !completedActionRef.current) {
      writeMemory(article.id, { suppressedUntil: Date.now() + SEVEN_DAYS_MS, completedAt: null })
    }
    setOpen(nextOpen)
  }

  const createProject = () => {
    commitAction()
    window.setTimeout(() => onCreateProject?.(), 90)
  }

  return (
    <>
      <motion.section
        ref={endRef}
        data-article-end-cta
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
        className='border-primary/20 relative isolate overflow-hidden border-t bg-card'
      >
        <div className='relative min-h-[350px]'>
          <div className='pointer-events-none absolute inset-0 -z-10'>
            <Photo
              src={endImage}
              alt={t('end.imageAlt')}
              sizes='(max-width: 899px) 100vw, 595px'
              className='absolute inset-y-0 right-0 h-full w-full rounded-none min-[900px]:w-[70%] min-[900px]:[mask-image:linear-gradient(to_right,transparent,black_20%)]'
              imageClassName='object-cover object-right'
            />
            <div
              className='absolute inset-0 backdrop-blur-[2px]'
              style={{ maskImage: 'linear-gradient(to right, black 25%, transparent 64%)' }}
            />
            <div className='absolute inset-0 bg-linear-to-r from-card from-0% via-card/90 via-32% to-transparent to-67% max-[899px]:from-card/90 max-[899px]:via-card/80 max-[899px]:via-55% max-[899px]:to-transparent max-[899px]:to-95%' />
          </div>
          <div className='relative flex min-h-[270px] flex-col justify-center px-6 pt-8 pb-5 min-[900px]:w-[40%] sm:px-8'>
            <h2 className='text-primary-strong text-[clamp(1.35rem,2.1vw,1.72rem)] font-extrabold tracking-[-0.025em]'>
              {t('end.title')}
            </h2>
            <p className='text-muted-foreground mt-2 text-[14px] leading-relaxed max-[899px]:text-foreground/80'>
              {t('end.subtitle')}
            </p>

            <ul className='mt-4 space-y-2.5'>
              {[t('end.p1'), t('end.p2'), t('end.p3')].map((item) => (
                <li key={item} className='text-foreground flex items-center gap-2.5 text-[14px]'>
                  <span className='text-primary-foreground flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary-strong'>
                    <Check className='size-3' strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div
            data-article-end-actions
            className='relative grid items-center justify-items-center gap-3 px-6 pb-6 min-[900px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[900px]:justify-items-stretch min-[900px]:gap-2'
          >
            <ActionButtons article={article} onCreateProject={createProject} bannerRow />
            <span
              data-article-handwritten
              className='font-hand mx-auto w-full min-w-0 max-w-[160px] text-center text-[18px] leading-[1.25]'
            >
              <span data-article-handwritten-text>{t('end.handwritten')}</span>
            </span>
            <div className='grid w-full grid-cols-3 items-center gap-1.5 min-[900px]:flex min-[900px]:w-auto min-[900px]:justify-center min-[900px]:gap-1'>
              {[t('end.tag1'), t('end.tag2'), t('end.tag3')].map((tag) => (
                <span
                  key={tag}
                  className='text-foreground bg-card/95 flex h-[36px] min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-accent px-1.5 text-[9px] font-bold shadow-sm backdrop-blur'
                >
                  <span className='text-primary-foreground flex size-[14px] shrink-0 items-center justify-center rounded-full bg-primary-strong'>
                    <Check className='size-3' strokeWidth={3} />
                  </span>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className='max-h-[calc(100dvh-20px)] w-[min(1080px,calc(100vw-24px))] max-w-[1080px] gap-0 overflow-x-hidden overflow-y-auto rounded-[24px] border-0 bg-background p-0 shadow-2xl sm:max-w-[1080px] max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:top-auto max-[899px]:flex max-[899px]:h-[90dvh] max-[899px]:max-h-[90dvh] max-[899px]:w-full max-[899px]:max-w-full max-[899px]:translate-x-0 max-[899px]:translate-y-0 max-[899px]:flex-col max-[899px]:overflow-hidden max-[899px]:rounded-b-none max-[899px]:rounded-t-[24px]'
        >
          <div className='relative shrink-0 bg-background px-5 pt-5 sm:px-6 max-[899px]:px-4 max-[899px]:pt-12 max-[899px]:pb-3'>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              className='absolute top-5 left-6 hidden origin-top-left min-[900px]:block'
            >
              {/* Logo dọc, cùng popup "Bạn đang ở bước nào…" (`JourneyDialogShell`). `mix-blend-multiply`
                  để nền trắng của ảnh hòa vào nền popup. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- logo tĩnh trong public, không cần loader */}
              <img
                src='/images/brand/buildx-logo-vertical.png'
                alt='BuildX'
                className='h-16 w-auto mix-blend-multiply'
              />
            </motion.div>

            <DialogClose
              aria-label={t('popup.close')}
              className='bg-muted/80 hover:bg-muted absolute top-4 right-5 flex size-10 items-center justify-center rounded-full transition-[transform,background-color] duration-150 hover:scale-105 active:scale-95 max-[899px]:top-3 max-[899px]:right-3 max-[899px]:size-9'
            >
              <X className='size-5' />
            </DialogClose>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.04 }}
              className='mx-auto max-w-[820px] pt-1 text-center min-[900px]:pt-2 max-[899px]:w-full max-[899px]:max-w-none'
            >
              <DialogTitle className='text-foreground text-[clamp(1.5rem,2.25vw,2.1rem)] leading-[1.15] font-extrabold tracking-[-0.025em] max-[899px]:line-clamp-2 max-[899px]:text-[clamp(1.25rem,5.75vw,1.5rem)]'>
                {t('popup.title')}
              </DialogTitle>
              <DialogDescription className='text-muted-foreground mt-2 text-[clamp(.9rem,1.2vw,1rem)] leading-relaxed'>
                {t('popup.subtitle')}
              </DialogDescription>
            </motion.div>
          </div>

          <div className='grid gap-4 px-4 pt-5 sm:px-6 min-[900px]:grid-cols-3 max-[899px]:min-h-0 max-[899px]:flex-1 max-[899px]:overflow-y-auto max-[899px]:overscroll-contain max-[899px]:pt-2 max-[899px]:pb-4'>
            <PopupCard
              tone='orange'
              image={BUILDING_IMAGE.townhouse}
              imageAlt={t('popup.create.imageAlt')}
              Icon={FilePlus2}
              badge={t('popup.create.badge')}
              title={t('popup.create.title')}
              subtitle={t('popup.create.subtitle')}
              points={[t('popup.create.p1'), t('popup.create.p2'), t('popup.create.p3')]}
              value={t('popup.create.value')}
              order={0}
              actions={
                <Button
                  type='button'
                  onClick={createProject}
                  className='brand-orange-button group/button relative h-12 w-full rounded-full text-[15px] font-bold'
                >
                  {t('popup.create.action')}
                  <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                </Button>
              }
            />

            <PopupCard
              tone='green'
              image={TOPIC_IMAGE.blueprint}
              imageAlt={t('popup.architect.imageAlt')}
              Icon={UserRoundPlus}
              title={t('popup.architect.title')}
              subtitle={t('popup.architect.subtitle')}
              points={[t('popup.architect.p1'), t('popup.architect.p2'), t('popup.architect.p3')]}
              value={t('popup.architect.value')}
              order={1}
              actions={
                <Button asChild className='brand-green-button h-12 w-full rounded-full text-[15px] font-bold'>
                  <Link href={ROUTES.CONSULT} onClick={commitAction} className='group/button relative'>
                    {t('popup.architect.action')}
                    <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                  </Link>
                </Button>
              }
            />

            <PopupCard
              tone='green'
              image={SUPERVISION_IMAGE.legal}
              imageAlt={t('popup.legal.imageAlt')}
              Icon={Scale}
              title={t('popup.legal.title')}
              subtitle={t('popup.legal.subtitle')}
              points={[t('popup.legal.p1'), t('popup.legal.p2'), t('popup.legal.p3')]}
              value={t('popup.legal.value')}
              order={2}
              actions={
                <Button asChild className='brand-green-button h-12 w-full rounded-full text-[15px] font-bold'>
                  <Link href={`${ROUTES.CONSULT}?type=legal`} onClick={commitAction} className='group/button relative'>
                    {t('popup.legal.action')}
                    <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                  </Link>
                </Button>
              }
            />
          </div>

          <div className='flex shrink-0 justify-end bg-background px-5 pt-4 pb-4 sm:px-6 max-[899px]:hidden'>
            <button
              type='button'
              onClick={() => handleOpenChange(false)}
              className='text-muted-foreground hover:text-foreground text-sm underline decoration-current/60 underline-offset-4 transition-colors duration-150'
            >
              {t('popup.later')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ActionButtons({
  article,
  onCreateProject,
  compact = false,
  bannerRow = false
}: ArticleActionProps & { compact?: boolean; bannerRow?: boolean }) {
  const t = useTranslations('handbook.articleJourney.actions')
  const completeFromPage = () =>
    writeMemory(article.id, {
      suppressedUntil: null,
      completedAt: Date.now()
    })

  return (
    <div
      className={
        bannerRow
          ? 'grid w-full grid-cols-3 items-center gap-1.5 min-[900px]:flex min-[900px]:w-auto min-[900px]:gap-1'
          : compact
            ? 'flex flex-wrap items-center gap-2.5 max-[899px]:grid max-[899px]:grid-cols-1'
            : 'flex flex-wrap gap-3 max-[899px]:grid max-[899px]:grid-cols-1'
      }
    >
      <Button
        type='button'
        onClick={() => {
          completeFromPage()
          onCreateProject?.()
        }}
        className={cn(
          'brand-green-button group min-w-0 rounded-full font-bold',
          compact
            ? 'h-[42px] w-auto px-4 text-[13px] has-[>svg]:px-4 max-[899px]:w-full'
            : 'h-[42px] w-auto px-3.5 text-[12px] has-[>svg]:px-3.5 max-[899px]:w-full',
          bannerRow &&
            'h-9 gap-1 px-2 text-[10px] has-[>svg]:px-2 max-[899px]:w-full min-[900px]:px-2.5 min-[900px]:has-[>svg]:px-2.5'
        )}
      >
        {t('create')}
        <ArrowRight
          className={cn(
            'transition-transform duration-300 group-hover:translate-x-1',
            compact ? 'size-3.5' : 'size-4',
            bannerRow && 'size-3'
          )}
        />
      </Button>
      <Button
        asChild
        variant='outline'
        className={cn(
          'bg-card/85 min-w-0 rounded-full font-semibold',
          compact
            ? 'h-[42px] w-auto px-4 text-[13px] max-[899px]:w-full'
            : 'h-[42px] w-auto px-3.5 text-[12px] max-[899px]:w-full',
          bannerRow && 'h-9 px-2 text-[10px] max-[899px]:w-full min-[900px]:px-2.5'
        )}
      >
        <Link href={ROUTES.CONSULT} onClick={completeFromPage}>
          {t('architect')}
        </Link>
      </Button>
      <Button
        asChild
        variant='outline'
        className={cn(
          'bg-card/85 min-w-0 rounded-full font-semibold',
          compact
            ? 'h-[42px] w-auto px-4 text-[13px] max-[899px]:w-full'
            : 'h-[42px] w-auto px-3.5 text-[12px] max-[899px]:w-full',
          bannerRow && 'h-9 px-2 text-[10px] max-[899px]:w-full min-[900px]:px-2.5'
        )}
      >
        <Link href={`${ROUTES.CONSULT}?type=legal`} onClick={completeFromPage}>
          {t('legal')}
        </Link>
      </Button>
    </div>
  )
}

interface PopupCardProps {
  tone: 'orange' | 'green'
  image: string
  imageAlt: string
  Icon: LucideIcon
  badge?: string
  title: string
  subtitle: string
  points: readonly string[]
  value: string
  actions: ReactNode
  order: number
}

function PopupCard({
  tone,
  image,
  imageAlt,
  Icon,
  badge,
  title,
  subtitle,
  points,
  value,
  actions,
  order
}: PopupCardProps) {
  const reduceMotion = useReducedMotion()
  const orange = tone === 'orange'

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        opacity: { duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.12 + order * 0.07 },
        y: {
          duration: reduceMotion ? 0 : 0.16,
          delay: reduceMotion ? 0 : 0.12 + order * 0.07,
          ease: [0.22, 1, 0.36, 1]
        },
        scale: { duration: reduceMotion ? 0 : 0.16 }
      }}
      className='flex'
    >
      <motion.article
        whileHover={reduceMotion ? undefined : { y: -5, scale: 1.004 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'group flex min-h-[500px] w-full flex-col rounded-[18px] border bg-card p-4 transition-[border-color,box-shadow] duration-[180ms] max-[899px]:min-h-0 max-[899px]:p-3',
          orange
            ? 'border-brand-orange hover:shadow-[0_16px_34px_-25px_var(--brand-orange)]'
            : 'border-primary/25 hover:border-primary/45 hover:shadow-[0_16px_34px_-27px_var(--primary)]'
        )}
      >
        <div className='relative'>
          <Photo
            src={image}
            alt={imageAlt}
            sizes='(max-width:768px) 100vw,330px'
            className='h-[150px] rounded-[12px] max-[899px]:h-[132px]'
            imageClassName='transition-transform duration-[180ms] ease-out group-hover:scale-[1.025]'
          />
          {badge ? (
            <span className='bg-brand-orange text-brand-orange-foreground absolute top-2 left-2 rounded-full px-3 py-1 max-md:text-xs text-[11px] font-bold uppercase'>
              {badge}
            </span>
          ) : null}
          <span
            className={cn(
              'absolute -bottom-6 left-3 flex size-12 items-center justify-center rounded-full bg-background shadow-md ring-1',
              orange ? 'text-brand-orange ring-brand-orange/10' : 'text-primary ring-primary/10'
            )}
          >
            <Icon className='size-6' strokeWidth={1.9} />
          </span>
        </div>

        <div className='flex flex-1 flex-col pt-9'>
          <h3
            className={cn(
              'text-center text-[21px] leading-tight font-extrabold',
              orange ? 'text-brand-orange' : 'text-primary-strong'
            )}
          >
            {title}
          </h3>
          <p className='text-muted-foreground mx-auto mt-1.5 min-h-[42px] max-w-[300px] text-center text-[14px] leading-relaxed'>
            {subtitle}
          </p>
          <ul className='mt-4 space-y-2.5'>
            {points.map((point) => (
              <li key={point} className='flex items-start gap-2.5 text-[14px] leading-snug'>
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    orange ? 'border-brand-orange bg-brand-orange text-white' : 'border-primary text-primary'
                  )}
                >
                  <Check className='size-3' strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <div className='mt-auto pt-4'>
            <div
              className={cn(
                'flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-center text-[12px] font-bold',
                orange ? 'bg-brand-orange-soft text-brand-orange' : 'bg-accent text-primary-strong'
              )}
            >
              {value}
            </div>
            <div className='mt-3'>{actions}</div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  )
}
