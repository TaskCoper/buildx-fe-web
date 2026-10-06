'use client'

import { ArrowRight, Check, FilePlus2, Heart, UserRoundPlus, X, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/shared/auth'
import { useCmsCollection, type HandbookTemplate } from '@/shared/cms'
import { Logo, Photo } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { JOURNEY_POPUP_TEST_MODE } from '@/shared/constants'
import { designCreateRoute, ROUTES } from '@/shared/constants/routes'
import { useFavoriteStore, useIsFavorite } from '@/shared/favorite'
import { TOPIC_IMAGE, cn } from '@/shared/lib'

const TEMPLATE_POPUP_SESSION_KEY = 'savico.page-popup.template'
const TRIGGER_DELAY_MS = 8_000

interface TemplateDetailCtaPopupProps {
  template: HandbookTemplate
}

interface TemplatePopupCardProps {
  tone: 'green' | 'orange'
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

/**
 * Popup theo trang — Thư viện mẫu / chi tiết mẫu.
 *
 * Trigger: sau 8 giây HOẶC khi khách cuộn hết trang. Production chỉ hiện một
 * lần cho mỗi mẫu trong một session; QA mode hiện tại bỏ khóa để test reload.
 */
export function TemplateDetailCtaPopup({ template }: TemplateDetailCtaPopupProps) {
  const t = useTranslations('handbook.templatePopup')
  const favoriteT = useTranslations('favorite')
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const triggeredRef = useRef(false)
  const retryTimerRef = useRef<number | null>(null)

  const user = useAuthStore((state) => state.user)
  const subscriptions = useCmsCollection('subscriptions')
  const activeSubscription = subscriptions.find(
    (subscription) =>
      Boolean(user?.email) &&
      subscription.customerEmail.toLowerCase() === user?.email.toLowerCase() &&
      subscription.status === 'active'
  )
  const planLabel = activeSubscription?.tier ? activeSubscription.tier.toUpperCase() : null

  const favorite = useIsFavorite(template.id)
  const toggleFavorite = useFavoriteStore((state) => state.toggle)

  const favoriteItem = {
    templateId: template.id,
    kind: template.kind,
    name: template.name,
    imageUrl: template.imageUrl ?? template.floors[0]?.imageUrl ?? '',
    tagLabel: template.styleLabel
  }

  useEffect(() => {
    const seenKey = `${TEMPLATE_POPUP_SESSION_KEY}.${template.id}`
    if (!JOURNEY_POPUP_TEST_MODE && window.sessionStorage.getItem(seenKey) === '1') return

    let disposed = false

    const editableFocused = () => {
      const active = document.activeElement
      return (
        active instanceof HTMLElement &&
        (active.matches('input, textarea, select, [contenteditable="true"]') ||
          Boolean(active.closest('input, textarea, select, [contenteditable="true"]')))
      )
    }

    const scheduleRetry = () => {
      if (retryTimerRef.current !== null || disposed || triggeredRef.current) return
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null
        attemptOpen()
      }, 500)
    }

    const attemptOpen = () => {
      if (disposed || triggeredRef.current) return
      const anotherDialog = Boolean(document.querySelector('[role="dialog"][data-state="open"]'))
      if (anotherDialog || editableFocused()) {
        scheduleRetry()
        return
      }

      triggeredRef.current = true
      if (!JOURNEY_POPUP_TEST_MODE) window.sessionStorage.setItem(seenKey, '1')
      setOpen(true)
    }

    const delayTimer = window.setTimeout(attemptOpen, TRIGGER_DELAY_MS)
    const checkPageEnd = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48) attemptOpen()
    }

    checkPageEnd()
    window.addEventListener('scroll', checkPageEnd, { passive: true })
    window.addEventListener('resize', checkPageEnd)

    return () => {
      disposed = true
      window.clearTimeout(delayTimer)
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
      window.removeEventListener('scroll', checkPageEnd)
      window.removeEventListener('resize', checkPageEnd)
    }
  }, [template.id])

  const saveTemplate = () => {
    if (!favorite) {
      toggleFavorite(favoriteItem)
      toast.success(favoriteT('savedToast'), { description: favoriteT('viewSaved') })
    } else {
      toast.success(t('save.alreadySaved'))
    }
    setOpen(false)
  }

  const primaryImage = template.imageUrl ?? template.floors[0]?.imageUrl ?? TOPIC_IMAGE.blueprint
  const saveImage = template.floors[1]?.imageUrl ?? template.floors[0]?.imageUrl ?? primaryImage

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className='max-h-[calc(100dvh-20px)] w-[min(1080px,calc(100vw-24px))] max-w-[1080px] gap-0 overflow-x-hidden overflow-y-auto rounded-[24px] border-0 bg-background p-0 shadow-2xl sm:max-w-[1080px] max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:top-auto max-[899px]:flex max-[899px]:h-[90dvh] max-[899px]:max-h-[90dvh] max-[899px]:w-full max-[899px]:max-w-full max-[899px]:translate-x-0 max-[899px]:translate-y-0 max-[899px]:flex-col max-[899px]:overflow-hidden max-[899px]:rounded-b-none max-[899px]:rounded-t-[24px]'
      >
        <div className='relative shrink-0 bg-background px-5 pt-5 sm:px-6 max-[899px]:pb-3'>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
            className='absolute top-5 left-6 hidden origin-top-left min-[900px]:block'
          >
            <Logo className='origin-top-left scale-[0.92]' />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className='bg-accent text-primary-strong mx-auto flex w-fit items-center justify-center rounded-full px-4 py-2 text-sm font-bold'
          >
            {t('badge')}
          </motion.div>

          <DialogClose
            aria-label={t('close')}
            className='bg-muted/80 hover:bg-muted absolute top-4 right-5 flex size-10 items-center justify-center rounded-full transition-[transform,background-color] duration-150 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none max-[899px]:top-3 max-[899px]:right-3 max-[899px]:size-9'
          >
            <X className='size-5' strokeWidth={2.2} />
          </DialogClose>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.3,
              delay: reduceMotion ? 0 : 0.04,
              ease: [0.22, 1, 0.36, 1]
            }}
            className='mx-auto mt-4 max-w-[820px] text-center max-[899px]:px-14'
          >
            <DialogTitle className='text-foreground text-[clamp(1.45rem,2.1vw,2rem)] leading-[1.15] font-extrabold tracking-[-0.025em]'>
              {t('title')}
            </DialogTitle>
            <DialogDescription className='text-muted-foreground mt-2 text-[clamp(0.9rem,1.2vw,1rem)] leading-relaxed'>
              {t('subtitle', { name: template.name })}
            </DialogDescription>
          </motion.div>
        </div>

        <div className='grid gap-4 px-4 pt-5 sm:px-6 min-[900px]:grid-cols-3 max-[899px]:min-h-0 max-[899px]:flex-1 max-[899px]:overflow-y-auto max-[899px]:overscroll-contain max-[899px]:pt-2 max-[899px]:pb-4'>
          <TemplatePopupCard
            tone='orange'
            image={primaryImage}
            imageAlt={t('create.imageAlt')}
            Icon={FilePlus2}
            badge={t('create.badge')}
            title={t('create.title')}
            subtitle={t('create.subtitle')}
            points={[t('create.p1'), t('create.p2'), t('create.p3')]}
            value={planLabel ? t('create.valuePlan', { plan: planLabel }) : t('create.valueFree')}
            order={0}
            actions={
              <Button asChild className='brand-orange-button h-12 w-full rounded-full text-[15px] font-bold'>
                <Link href={designCreateRoute()} onClick={() => setOpen(false)} className='group/button relative'>
                  <span>{t('create.action')}</span>
                  <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                </Link>
              </Button>
            }
          />

          <TemplatePopupCard
            tone='green'
            image={saveImage}
            imageAlt={t('save.imageAlt')}
            Icon={Heart}
            title={t('save.title')}
            subtitle={t('save.subtitle')}
            points={[t('save.p1'), t('save.p2'), t('save.p3')]}
            value={t('save.value')}
            order={1}
            actions={
              <Button
                type='button'
                onClick={saveTemplate}
                className='brand-green-button group/button relative h-12 w-full rounded-full text-[15px] font-bold'
              >
                <span>{favorite ? t('save.savedAction') : t('save.action')}</span>
                <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
              </Button>
            }
          />

          <TemplatePopupCard
            tone='green'
            image={TOPIC_IMAGE.blueprint}
            imageAlt={t('consult.imageAlt')}
            Icon={UserRoundPlus}
            title={t('consult.title')}
            subtitle={t('consult.subtitle')}
            points={[t('consult.p1'), t('consult.p2'), t('consult.p3')]}
            value={t('consult.value')}
            order={2}
            actions={
              <Button asChild className='brand-green-button h-12 w-full rounded-full text-[15px] font-bold'>
                <Link
                  href={`${ROUTES.CONSULT}?template=${encodeURIComponent(template.id)}`}
                  onClick={() => setOpen(false)}
                  className='group/button relative'
                >
                  <span>{t('consult.action')}</span>
                  <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                </Link>
              </Button>
            }
          />
        </div>

        <div className='flex shrink-0 justify-end bg-background px-5 pt-4 pb-4 sm:px-6 max-[899px]:border-t max-[899px]:border-border/70 max-[899px]:pt-3'>
          <button
            type='button'
            onClick={() => setOpen(false)}
            className='text-muted-foreground hover:text-foreground text-sm underline decoration-current/60 underline-offset-4 transition-colors duration-150'
          >
            {t('later')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TemplatePopupCard({
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
}: TemplatePopupCardProps) {
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
        scale: { duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }
      }}
      className='flex'
    >
      <motion.article
        whileHover={reduceMotion ? undefined : { y: -5, scale: 1.004 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'group relative flex min-h-[500px] w-full flex-col rounded-[18px] border bg-card p-4 transition-[border-color,box-shadow] duration-[180ms] max-[899px]:min-h-0 max-[899px]:p-3',
          orange
            ? 'border-brand-orange hover:shadow-[0_16px_34px_-25px_var(--brand-orange)]'
            : 'border-primary/25 hover:border-primary/45 hover:shadow-[0_16px_34px_-27px_var(--primary)]'
        )}
      >
        <div className='relative'>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{
              duration: reduceMotion ? 0 : 0.42,
              delay: reduceMotion ? 0 : 0.18 + order * 0.07,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            <Photo
              src={image}
              alt={imageAlt}
              sizes='(max-width: 768px) 100vw, 330px'
              className='h-[150px] rounded-[12px] max-[899px]:h-[132px]'
              imageClassName='transition-transform duration-[180ms] ease-out group-hover:scale-[1.025]'
            />
          </motion.div>

          {badge ? (
            <span className='bg-brand-orange text-brand-orange-foreground absolute top-2 left-2 z-10 rounded-full px-3 py-1 max-md:text-xs text-[11px] font-bold tracking-wide uppercase shadow-sm'>
              {badge}
            </span>
          ) : null}

          <motion.span
            initial={reduceMotion ? false : { opacity: 0, scale: 0.75, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.3,
              delay: reduceMotion ? 0 : 0.24 + order * 0.07,
              ease: [0.22, 1, 0.36, 1]
            }}
            className={cn(
              'absolute -bottom-6 left-3 flex size-12 items-center justify-center rounded-full bg-background shadow-md ring-1',
              orange ? 'text-brand-orange ring-brand-orange/10' : 'text-primary ring-primary/10'
            )}
          >
            <Icon className='size-6' strokeWidth={1.9} />
          </motion.span>
        </div>

        <div className='flex flex-1 flex-col pt-9'>
          <h3
            className={cn(
              'text-center text-[21px] leading-tight font-extrabold text-pretty',
              orange ? 'text-brand-orange' : 'text-primary-strong'
            )}
          >
            {title}
          </h3>
          <p className='text-muted-foreground mx-auto mt-1.5 min-h-[42px] max-w-[300px] text-center text-[14px] leading-relaxed text-pretty'>
            {subtitle}
          </p>

          <ul className='mt-4 space-y-2.5'>
            {points.map((point, index) => (
              <motion.li
                key={point}
                initial={reduceMotion ? false : { opacity: 0, x: -7 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.24,
                  delay: reduceMotion ? 0 : 0.3 + order * 0.07 + index * 0.045,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className='flex items-start gap-2.5 text-[14px] leading-snug'
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    orange ? 'border-brand-orange bg-brand-orange text-white' : 'border-primary text-primary'
                  )}
                >
                  <Check className='size-3' strokeWidth={3} />
                </span>
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>

          <div className='mt-auto pt-4'>
            <div
              className={cn(
                'flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-center text-[12px] leading-snug font-bold',
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
