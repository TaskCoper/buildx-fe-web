'use client'

import { ArrowRight, Check, Crown, ShieldCheck, UserRound, X, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useRef, type ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useCmsCollection } from '@/shared/cms'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { checkoutConfirmRoute } from '@/shared/constants/routes'
import { SUPERVISION_IMAGE, TOPIC_IMAGE, cn, completeManagementPopup, dismissManagementPopup } from '@/shared/lib'
import { rememberCheckoutReturn } from '@/shared/lib/checkout-return'
import { formatCurrency } from '@/shared/utils'
import { Logo } from './logo'
import { Photo } from './photo'

interface ProjectManagementOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

type ManagementCardVariant = 'self' | 'check' | 'control'

interface ManagementOptionCardProps {
  variant: ManagementCardVariant
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
 * Popup 3/3 — chọn cách quản lý thi công sau khi nhà thầu đã được chốt.
 *
 * Nằm ở shared vì milestone phát sinh trong feature contractors, trong khi hai
 * nhánh trả phí đi vào checkout/supervision. Component chỉ dùng shared routes
 * để không tạo cross-feature import.
 */
export function ProjectManagementOptionsDialog({ open, onOpenChange, projectId }: ProjectManagementOptionsDialogProps) {
  const t = useTranslations('supervision.managementPopup')
  const locale = useLocale() as Locale
  const packages = useCmsCollection('supervisionPackages')
  const committedRef = useRef(false)

  const checkPackage = packages.find((item) => item.tier === 'check')
  const controlPackage = packages.find((item) => item.tier === 'control')

  const checkId = checkPackage?.id ?? 'check'
  const controlId = controlPackage?.id ?? 'control'
  const checkPrice = formatCurrency(checkPackage?.price ?? 8_900_000, locale)
  const controlPrice = formatCurrency(controlPackage?.price ?? 18_900_000, locale)
  const checkInspections = checkPackage?.inspections ?? 6
  const controlInspections = controlPackage?.inspections ?? 12

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      committedRef.current = false
      onOpenChange(true)
      return
    }

    if (open && !committedRef.current) dismissManagementPopup(projectId)
    onOpenChange(false)
  }

  const commitChoice = () => {
    committedRef.current = true
    completeManagementPopup(projectId)
  }

  const choosePaidPlan = (planId: string) => {
    commitChoice()
    rememberCheckoutReturn(planId, projectId)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='max-h-[calc(100dvh-20px)] w-[min(1080px,calc(100vw-24px))] max-w-[1080px] gap-0 overflow-x-hidden overflow-y-auto rounded-[24px] border-0 bg-background p-0 shadow-2xl sm:max-w-[1080px] max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:top-auto max-[899px]:flex max-[899px]:h-[90dvh] max-[899px]:max-h-[90dvh] max-[899px]:w-full max-[899px]:max-w-full max-[899px]:translate-x-0 max-[899px]:translate-y-0 max-[899px]:flex-col max-[899px]:overflow-hidden max-[899px]:rounded-b-none max-[899px]:rounded-t-[24px]'
      >
        <ManagementDialogHeader title={t('title')} subtitle={t('subtitle')} closeLabel={t('close')} />

        <div className='grid gap-4 px-4 pt-5 sm:px-6 min-[900px]:grid-cols-3 max-[899px]:min-h-0 max-[899px]:flex-1 max-[899px]:overflow-y-auto max-[899px]:overscroll-contain max-[899px]:pt-2 max-[899px]:pb-4'>
          <ManagementOptionCard
            variant='self'
            image={TOPIC_IMAGE.blueprint}
            imageAlt={t('self.imageAlt')}
            Icon={UserRound}
            title={t('self.title')}
            subtitle={t('self.subtitle')}
            points={[t('self.p1'), t('self.p2'), t('self.p3')]}
            value={t('self.value')}
            order={0}
            actions={
              <div className='bg-accent text-primary-strong flex h-12 w-full items-center justify-center rounded-full px-4 text-center text-[15px] font-bold'>
                {t('self.action')}
              </div>
            }
          />

          <ManagementOptionCard
            variant='check'
            image={SUPERVISION_IMAGE.finishing}
            imageAlt={t('check.imageAlt')}
            Icon={ShieldCheck}
            badge={t('check.badge')}
            title={t('check.title')}
            subtitle={t('check.subtitle')}
            points={[t('check.p1'), t('check.p2'), t('check.p3', { count: checkInspections })]}
            value={t('check.value', { price: checkPrice })}
            order={1}
            actions={
              <Button asChild className='brand-orange-button h-12 w-full rounded-full text-[15px] font-bold'>
                <Link
                  href={checkoutConfirmRoute(checkId, projectId)}
                  onClick={() => choosePaidPlan(checkId)}
                  className='group/button relative'
                >
                  <span>{t('check.action')}</span>
                  <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                </Link>
              </Button>
            }
          />

          <ManagementOptionCard
            variant='control'
            image={TOPIC_IMAGE.site}
            imageAlt={t('control.imageAlt')}
            Icon={Crown}
            badge={t('control.badge')}
            title={t('control.title')}
            subtitle={t('control.subtitle')}
            points={[t('control.p1'), t('control.p2'), t('control.p3', { count: controlInspections })]}
            value={t('control.value', { price: controlPrice })}
            order={2}
            actions={
              <Button asChild className='brand-orange-button h-12 w-full rounded-full text-[15px] font-bold'>
                <Link
                  href={checkoutConfirmRoute(controlId, projectId)}
                  onClick={() => choosePaidPlan(controlId)}
                  className='group/button relative'
                >
                  <span>{t('control.action')}</span>
                  <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                </Link>
              </Button>
            }
          />
        </div>

        <div className='flex shrink-0 justify-end bg-background px-5 pt-4 pb-4 sm:px-6 max-[899px]:border-t max-[899px]:border-border/70 max-[899px]:pt-3'>
          <button
            type='button'
            onClick={() => handleOpenChange(false)}
            className='text-muted-foreground hover:text-foreground text-sm underline decoration-current/60 underline-offset-4 transition-colors duration-150'
          >
            {t('later')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ManagementDialogHeader({
  title,
  subtitle,
  closeLabel
}: {
  title: string
  subtitle: string
  closeLabel: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div className='relative shrink-0 bg-background px-5 pt-5 sm:px-6 max-[899px]:pb-3'>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        className='absolute top-5 left-6 hidden origin-top-left min-[900px]:block'
      >
        <Logo className='origin-top-left scale-[0.92]' />
      </motion.div>

      <DialogClose
        aria-label={closeLabel}
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
        className='mx-auto max-w-[760px] pt-1 text-center min-[900px]:pt-2 max-[899px]:px-14'
      >
        <DialogTitle className='text-foreground text-[clamp(1.45rem,2.1vw,2rem)] leading-[1.15] font-extrabold tracking-[-0.025em]'>
          {title}
        </DialogTitle>
        <DialogDescription className='text-muted-foreground mt-2 text-[clamp(0.9rem,1.2vw,1rem)] leading-relaxed'>
          {subtitle}
        </DialogDescription>
      </motion.div>
    </div>
  )
}

function ManagementOptionCard({
  variant,
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
}: ManagementOptionCardProps) {
  const reduceMotion = useReducedMotion()
  const orangeContent = variant !== 'self'
  const highlighted = variant === 'control'

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
          highlighted
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
              orangeContent ? 'text-brand-orange ring-brand-orange/10' : 'text-primary ring-primary/10'
            )}
          >
            <Icon className='size-6' strokeWidth={1.9} />
          </motion.span>
        </div>

        <div className='flex flex-1 flex-col pt-9'>
          <h3
            className={cn(
              'text-center text-[21px] leading-tight font-extrabold text-pretty max-[899px]:text-[18px]',
              orangeContent ? 'text-brand-orange' : 'text-primary-strong'
            )}
          >
            {title}
          </h3>
          <p className='text-muted-foreground mx-auto mt-1.5 min-h-[42px] max-w-[300px] text-center text-[14px] leading-relaxed text-pretty max-[899px]:min-h-0 max-[899px]:text-[13px]'>
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
                    orangeContent ? 'border-brand-orange bg-brand-orange text-white' : 'border-primary text-primary'
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
                orangeContent ? 'bg-brand-orange-soft text-brand-orange' : 'bg-accent text-primary-strong'
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
