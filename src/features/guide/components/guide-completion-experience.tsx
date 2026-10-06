'use client'

import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Camera,
  Check,
  MoveUpRight,
  UserRoundPlus,
  X,
  type LucideIcon
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { Logo, Photo } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { ROUTES } from '@/shared/constants/routes'
import { BUILDING_IMAGE, TOPIC_IMAGE, cn } from '@/shared/lib'
import type { GuideVideo } from '../types/guide.types'

interface GuideCompletionExperienceProps {
  video: GuideVideo
  popupOpen: boolean
  onPopupOpenChange: (open: boolean) => void
  onCreateProject?: () => void
  onBrowseGuides: () => void
}

interface EndCardProps {
  video: GuideVideo
  onCreateProject?: () => void
  onBrowseGuides: () => void
}

interface EndCardOptionProps {
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

export function GuideCompletionExperience({
  video,
  popupOpen,
  onPopupOpenChange,
  onCreateProject,
  onBrowseGuides
}: GuideCompletionExperienceProps) {
  return (
    <>
      <GuideCompletionSection video={video} onCreateProject={onCreateProject} onBrowseGuides={onBrowseGuides} />
      <GuideEndCardDialog
        video={video}
        open={popupOpen}
        onOpenChange={onPopupOpenChange}
        onCreateProject={onCreateProject}
        onBrowseGuides={onBrowseGuides}
      />
    </>
  )
}

function GuideCompletionSection({ video, onCreateProject, onBrowseGuides }: EndCardProps) {
  const t = useTranslations('guide.endCard.section')
  const reduceMotion = useReducedMotion()
  const landPhoto = video.topic === 'land-photo'

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
      className='mb-8 overflow-hidden rounded-[20px] border bg-card shadow-[0_16px_44px_-34px_rgba(42,117,63,.28)]'
    >
      <div className='grid min-h-[250px] items-center gap-8 px-7 py-7 min-[900px]:grid-cols-[56px_minmax(0,1fr)_320px] lg:px-10 max-[899px]:px-5 max-[899px]:py-6'>
        <motion.div
          initial={reduceMotion ? false : { scale: 0.72, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='bg-primary text-primary-foreground shadow-primary/20 flex size-14 items-center justify-center rounded-full shadow-xl max-[899px]:hidden'
        >
          <Check className='size-6' strokeWidth={2.5} />
        </motion.div>

        <div className='min-w-0'>
          <h2 className='text-primary-strong text-[clamp(1.3rem,2.1vw,1.65rem)] font-extrabold tracking-[-0.02em]'>
            {landPhoto ? t('landPhotoTitle') : t('genericTitle', { title: video.title })}
          </h2>
          <p className='text-muted-foreground mt-2 max-w-[760px] text-[14px] leading-[1.7]'>
            {landPhoto ? t('landPhotoDescription') : t('genericDescription')}
          </p>

          <div className='mt-4 flex flex-wrap gap-2.5 max-[899px]:grid max-[899px]:grid-cols-1'>
            {onCreateProject ? (
              <Button
                type='button'
                onClick={onCreateProject}
                className='brand-green-button h-11 rounded-full px-5 text-[14px] font-bold max-[899px]:w-full'
              >
                <Camera className='size-4' />
                {t('create')}
                <ArrowRight className='size-4' />
              </Button>
            ) : null}

            <Button
              type='button'
              variant='outline'
              onClick={onBrowseGuides}
              className='border-primary/30 text-primary-strong hover:bg-accent h-11 rounded-full px-5 text-[14px] font-bold max-[899px]:w-full'
            >
              <BookOpen className='size-4' />
              {t('browse')}
            </Button>

            <Button
              asChild
              variant='outline'
              className='border-primary/30 text-primary-strong hover:bg-accent h-11 rounded-full px-5 text-[14px] font-bold max-[899px]:w-full'
            >
              <Link href={ROUTES.CONSULT}>
                <UserRoundPlus className='size-4' />
                {t('consult')}
              </Link>
            </Button>
          </div>
        </div>

        <div className='relative hidden h-[276px] w-[320px] min-[900px]:block'>
          <div className='relative ml-auto h-full w-[306px]'>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10, rotate: 1.1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.12 }}
              className='absolute top-0 right-[10px] h-[254px] w-[153px] overflow-hidden rounded-[30px] border-[9px] border-primary-strong bg-primary-strong shadow-[0_24px_42px_-18px_rgba(0,0,0,.5)]'
            >
              <Photo
                src={video.thumbnailUrl || TOPIC_IMAGE.site}
                alt={video.title}
                sizes='153px'
                className='size-full rounded-[20px]'
                imageClassName='object-cover object-center'
              />
              <span className='border-brand-orange absolute top-[22px] right-[18px] bottom-[86px] left-[18px] rounded-[9px] border-2' />
            </motion.div>

            <motion.div
              aria-hidden
              animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className='text-primary absolute top-[17px] right-[163px]'
            >
              <svg
                className='size-10'
                viewBox='0 0 40 40'
                fill='none'
                stroke='currentColor'
                strokeWidth={3}
                strokeLinecap='round'
              >
                <path d='M2 24C10 8 16 8 22 20S34 32 40 20' />
              </svg>
            </motion.div>

            <MoveUpRight aria-hidden className='text-brand-orange absolute top-[1px] right-0 size-8' strokeWidth={2} />

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: 10, y: 4 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.22 }}
              className='absolute right-[21px] bottom-[2px] z-20 flex h-[61px] w-[244px] items-center gap-3 rounded-[15px] border border-border/80 bg-background/98 px-3.5 py-2.5 max-md:text-xs text-[11px] leading-[1.35] font-bold text-primary-strong shadow-[0_20px_38px_-17px_rgba(0,0,0,.38)] backdrop-blur'
            >
              <span className='bg-brand-orange text-brand-orange-foreground flex size-[31px] shrink-0 items-center justify-center rounded-full'>
                <ArrowUp className='size-[15px]' strokeWidth={2.6} />
              </span>
              <span className='max-w-[176px]'>{t('readyNote')}</span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function GuideEndCardDialog({
  video,
  open,
  onOpenChange,
  onCreateProject,
  onBrowseGuides
}: EndCardProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('guide.endCard.popup')
  const reduceMotion = useReducedMotion()

  const closeAndCreate = () => {
    onOpenChange(false)
    window.setTimeout(() => onCreateProject?.(), 90)
  }

  const closeAndBrowse = () => {
    onOpenChange(false)
    window.setTimeout(onBrowseGuides, 90)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            className='bg-muted/80 hover:bg-muted absolute top-4 right-5 flex size-10 items-center justify-center rounded-full transition-[transform,background-color] duration-150 hover:scale-105 active:scale-95 max-[899px]:top-3 max-[899px]:right-3 max-[899px]:size-9'
          >
            <X className='size-5' />
          </DialogClose>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.04, ease: [0.22, 1, 0.36, 1] }}
            className='mx-auto mt-4 max-w-[860px] text-center max-[899px]:px-14'
          >
            <DialogTitle className='text-foreground text-[clamp(1.5rem,2.25vw,2.1rem)] leading-[1.15] font-extrabold tracking-[-0.025em]'>
              {t('title', { title: video.title })}
            </DialogTitle>
            <DialogDescription className='text-muted-foreground mt-2 text-[clamp(0.9rem,1.2vw,1rem)] leading-relaxed'>
              {t('subtitle')}
            </DialogDescription>
          </motion.div>
        </div>

        <div className='grid gap-4 px-4 pt-5 sm:px-6 min-[900px]:grid-cols-3 max-[899px]:min-h-0 max-[899px]:flex-1 max-[899px]:overflow-y-auto max-[899px]:overscroll-contain max-[899px]:pt-2 max-[899px]:pb-4'>
          <EndCardOption
            tone='orange'
            image={TOPIC_IMAGE.site}
            imageAlt={t('create.imageAlt')}
            Icon={Camera}
            badge={t('create.badge')}
            title={t('create.title')}
            subtitle={t('create.subtitle')}
            points={[t('create.p1'), t('create.p2'), t('create.p3')]}
            value={t('create.value')}
            order={0}
            actions={
              <Button
                type='button'
                onClick={closeAndCreate}
                disabled={!onCreateProject}
                className='brand-orange-button group/button relative h-12 w-full rounded-full text-[15px] font-bold'
              >
                <span>{t('create.action')}</span>
                <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
              </Button>
            }
          />

          <EndCardOption
            tone='green'
            image={BUILDING_IMAGE.townhouse}
            imageAlt={t('browse.imageAlt')}
            Icon={BookOpen}
            title={t('browse.title')}
            subtitle={t('browse.subtitle')}
            points={[t('browse.p1'), t('browse.p2'), t('browse.p3')]}
            value={t('browse.value')}
            order={1}
            actions={
              <Button
                type='button'
                onClick={closeAndBrowse}
                className='brand-green-button group/button relative h-12 w-full rounded-full text-[15px] font-bold'
              >
                <span>{t('browse.action')}</span>
                <ArrowRight className='absolute right-4 size-4 transition-transform duration-150 group-hover/button:translate-x-1' />
              </Button>
            }
          />

          <EndCardOption
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
                <Link href={ROUTES.CONSULT} onClick={() => onOpenChange(false)} className='group/button relative'>
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
            onClick={() => onOpenChange(false)}
            className='text-muted-foreground hover:text-foreground text-sm underline decoration-current/60 underline-offset-4 transition-colors duration-150'
          >
            {t('later')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EndCardOption({
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
}: EndCardOptionProps) {
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
            transition={{ duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : 0.18 + order * 0.07 }}
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
            transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.24 + order * 0.07 }}
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
            {points.map((point, index) => (
              <motion.li
                key={point}
                initial={reduceMotion ? false : { opacity: 0, x: -7 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.24,
                  delay: reduceMotion ? 0 : 0.3 + order * 0.07 + index * 0.045
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
