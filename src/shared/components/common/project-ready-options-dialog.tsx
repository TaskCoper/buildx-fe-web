'use client'

import { ArrowRight, Check, HardHat, Search, UserRoundPlus, X, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useRef, useState, type ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/shared/auth'
import { useCmsCollection } from '@/shared/cms'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { ROUTES } from '@/shared/constants'
import { BUILDING_IMAGE, TOPIC_IMAGE, cn, completeReadyProjectPopup, dismissReadyProjectPopup } from '@/shared/lib'
import { Logo } from './logo'
import { TurnkeyRequestDialog } from './turnkey-request-dialog'

interface ProjectReadyOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  findHref: string
  onFindNavigate?: () => void
}

type CardTone = 'green' | 'orange'

interface ReadyOptionCardProps {
  tone: CardTone
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
 * Popup 2/3 — lựa chọn hướng đi sau khi hồ sơ đã sẵn sàng.
 *
 * Đây là shared component vì cả design (nhánh A) và contractors (nhánh B)
 * đều cần mở cùng một dialog; giữ ở shared tránh cross-feature import.
 */
export function ProjectReadyOptionsDialog({
  open,
  onOpenChange,
  projectId,
  findHref,
  onFindNavigate
}: ProjectReadyOptionsDialogProps) {
  const t = useTranslations('contractors.start.popup2')
  const user = useAuthStore((state) => state.user)
  const subscriptions = useCmsCollection('subscriptions')
  const [turnkeyOpen, setTurnkeyOpen] = useState(false)
  const committedRef = useRef(false)

  const activeSubscription = subscriptions.find((subscription) => {
    if (!user?.email || subscription.customerEmail.toLowerCase() !== user.email.toLowerCase()) return false
    return subscription.status === 'active'
  })
  const isPro = activeSubscription?.tier === 'pro'

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      committedRef.current = false
      onOpenChange(true)
      return
    }

    if (open && !committedRef.current) dismissReadyProjectPopup(projectId)
    onOpenChange(false)
  }

  const commitChoice = () => {
    committedRef.current = true
    completeReadyProjectPopup(projectId)
  }

  const chooseTurnkey = () => {
    commitChoice()
    onOpenChange(false)
    window.setTimeout(() => setTurnkeyOpen(true), 100)
  }

  const chooseFind = () => {
    commitChoice()
    onFindNavigate?.()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className='max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1080px] gap-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[24px] border-0 bg-background p-0 shadow-2xl sm:max-w-[1080px]'
        >
          <ReadyDialogHeader title={t('title')} subtitle={t('subtitle')} closeLabel={t('close')} />

          <div className='grid gap-4 px-4 pt-5 pb-4 sm:px-6 sm:pb-5 min-[900px]:grid-cols-3'>
            <ReadyOptionCard
              tone='green'
              image={BUILDING_IMAGE.townhouse}
              imageAlt={t('find.imageAlt')}
              Icon={Search}
              title={t('find.title')}
              subtitle={t('find.subtitle')}
              points={[t('find.p1'), t('find.p2'), t('find.p3')]}
              value={t('find.value')}
              order={0}
              actions={
                <Button asChild className='brand-green-button h-12 w-full rounded-full text-[15px] font-bold'>
                  <Link href={findHref} onClick={chooseFind} className='group/button relative'>
                    <span>{t('find.action')}</span>
                    <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                  </Link>
                </Button>
              }
            />

            <ReadyOptionCard
              tone='orange'
              image={TOPIC_IMAGE.site}
              imageAlt={t('turnkey.imageAlt')}
              Icon={HardHat}
              badge={t('turnkey.badge')}
              title={isPro ? t('turnkey.titlePro') : t('turnkey.titleDefault')}
              subtitle={t('turnkey.subtitle')}
              points={[t('turnkey.p1'), t('turnkey.p2'), t('turnkey.p3')]}
              value={isPro ? t('turnkey.valuePro') : t('turnkey.valueUpgrade')}
              order={1}
              actions={
                <Button
                  type='button'
                  onClick={chooseTurnkey}
                  className='brand-orange-button group/button relative h-12 w-full rounded-full text-[15px] font-bold'
                >
                  <span>{isPro ? t('turnkey.actionPro') : t('turnkey.actionDefault')}</span>
                  <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                </Button>
              }
            />

            <ReadyOptionCard
              tone='green'
              image={TOPIC_IMAGE.blueprint}
              imageAlt={t('expert.imageAlt')}
              Icon={UserRoundPlus}
              title={t('expert.title')}
              subtitle={t('expert.subtitle')}
              points={[t('expert.p1'), t('expert.p2'), t('expert.p3')]}
              value={t('expert.value')}
              order={2}
              actions={
                <div className='grid gap-2'>
                  <Button asChild className='brand-green-button h-12 w-full rounded-full text-[15px] font-bold'>
                    <Link href={ROUTES.CONSULT} onClick={commitChoice} className='group/button relative'>
                      <span>{t('expert.architect')}</span>
                      <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant='outline'
                    className='border-primary text-primary-strong hover:bg-accent h-12 w-full rounded-full border-[1.5px] text-[15px] font-bold'
                  >
                    <Link
                      href={`${ROUTES.CONSULT}?type=legal`}
                      onClick={commitChoice}
                      className='group/button relative'
                    >
                      <span>{t('expert.legal')}</span>
                      <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
                    </Link>
                  </Button>
                </div>
              }
            />
          </div>

          <div className='flex shrink-0 justify-end bg-background px-5 pt-4 pb-4 sm:px-6'>
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

      <TurnkeyRequestDialog open={turnkeyOpen} onOpenChange={setTurnkeyOpen} />
    </>
  )
}

function ReadyDialogHeader({ title, subtitle, closeLabel }: { title: string; subtitle: string; closeLabel: string }) {
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

function ReadyOptionCard({
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
}: ReadyOptionCardProps) {
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
          <div
            role='img'
            aria-label={imageAlt}
            className='h-[150px] w-full overflow-hidden rounded-[12px] bg-cover bg-center transition-transform duration-[180ms] ease-out group-hover:scale-[1.018] max-[899px]:h-[132px]'
            style={{ backgroundImage: `url("${image}")` }}
          />

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
              'text-center text-[21px] leading-tight font-extrabold text-pretty max-[899px]:text-[18px]',
              orange ? 'text-brand-orange' : 'text-primary-strong'
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
