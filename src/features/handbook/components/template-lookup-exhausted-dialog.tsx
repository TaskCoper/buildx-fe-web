'use client'

import { Crown, FilePlus2, MessageCircle, Search, X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { designCreateRoute, ROUTES } from '@/shared/constants/routes'
import { BUILDING_IMAGE, rememberHandbookQuotaReturn } from '@/shared/lib'
import type { HandbookTemplate } from '../types/handbook.types'

interface TemplateLookupExhaustedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: HandbookTemplate | null
  total: number
  period: 'day' | 'month'
  planTier: 'basic' | 'advanced' | 'pro' | null
}

export function TemplateLookupExhaustedDialog({
  open,
  onOpenChange,
  template,
  total,
  period,
  planTier
}: TemplateLookupExhaustedDialogProps) {
  const t = useTranslations('handbook.lookupExhausted')
  const reduceMotion = useReducedMotion()

  if (!template) return null

  const planLabel = planTier === 'advanced' ? 'PLUS' : planTier === 'pro' ? 'PRO' : null
  const image = BUILDING_IMAGE.townhouse
  const title = planLabel ? t('titlePlan', { total, plan: planLabel }) : t('titleFree', { total })
  const openPlans = () => {
    rememberHandbookQuotaReturn(template.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-lookup-exhausted-dialog
        className='h-[min(590px,calc(100dvh-24px))] max-h-[calc(100dvh-24px)] w-[min(1080px,calc(100vw-24px))] max-w-[1080px] gap-0 overflow-hidden rounded-[24px] border-0 bg-primary-strong p-0 text-white shadow-2xl sm:max-w-[1080px] max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:top-auto max-[899px]:flex max-[899px]:h-[90dvh] max-[899px]:max-h-[90dvh] max-[899px]:w-full max-[899px]:max-w-full max-[899px]:translate-x-0 max-[899px]:translate-y-0 max-[899px]:flex-col max-[899px]:rounded-b-none max-[899px]:rounded-t-[22px]'
      >
        <div className='relative isolate h-full min-h-0 overflow-hidden max-[899px]:flex max-[899px]:flex-1 max-[899px]:flex-col'>
          {image ? (
            <motion.div
              aria-hidden
              initial={reduceMotion ? false : { opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
              className='absolute inset-y-0 right-0 -z-20 w-[64%] bg-cover bg-center max-[899px]:inset-x-0 max-[899px]:top-0 max-[899px]:h-[160px] max-[899px]:w-full max-[899px]:opacity-100'
              style={{ backgroundImage: `url("${image}")` }}
            />
          ) : null}
          <div
            aria-hidden
            className='absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--primary-strong)_0%,var(--primary-strong)_37%,rgba(42,117,63,.97)_48%,rgba(42,117,63,.74)_60%,rgba(42,117,63,.34)_76%,rgba(42,117,63,.10)_100%)] max-[899px]:bg-[linear-gradient(180deg,rgba(42,117,63,.08)_0%,rgba(42,117,63,.72)_140px,var(--primary-strong)_220px,var(--primary-strong)_100%)]'
          />

          <div className='relative flex h-full min-h-0 flex-col px-12 py-10 max-[899px]:flex-1 max-[899px]:overflow-y-auto max-[899px]:px-5 max-[899px]:pt-[178px] max-[899px]:pb-5'>
            <DialogClose
              aria-label={t('close')}
              className='absolute top-5 right-5 z-20 grid size-10 place-items-center rounded-full bg-white/8 text-white/90 transition-[background-color,transform] duration-150 hover:scale-105 hover:bg-white/15 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none max-[899px]:top-3 max-[899px]:right-3 max-[899px]:size-9'
            >
              <X className='size-5' />
            </DialogClose>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              className='flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[13px] font-bold backdrop-blur-md max-[899px]:text-[12px]'
            >
              <Crown className='size-4' />
              {t('badge')}
            </motion.div>

            <div className='mt-6 max-[899px]:mt-4'>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.04 }}
                className='max-w-[560px]'
              >
                <DialogTitle className='max-w-[560px] text-[clamp(2.35rem,4vw,3.15rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-white max-[899px]:pr-8 max-[899px]:text-[clamp(1.75rem,8vw,2.3rem)]'>
                  {renderHighlightedNumber(title, total)}
                </DialogTitle>
                <DialogDescription className='mt-5 max-w-[540px] text-[15px] leading-[1.72] font-medium text-white/88 max-[899px]:mt-3 max-[899px]:text-[14px]'>
                  {t('description', { name: template.name })}
                </DialogDescription>
              </motion.div>
            </div>

            <div className='absolute top-[88px] right-8 hidden flex-col items-end gap-3 min-[900px]:flex'>
              {[t('chip1'), t('chip2'), t('chip3')].map((label, index) => (
                <motion.span
                  key={label}
                  initial={reduceMotion ? false : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.24,
                    delay: reduceMotion ? 0 : 0.12 + index * 0.055,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className='flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-white/25 bg-[#31483f]/75 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.18)] backdrop-blur-[10px]'
                >
                  <Search className='size-4.5 shrink-0' />
                  {label}
                </motion.span>
              ))}
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.26,
                delay: reduceMotion ? 0 : 0.14,
                ease: [0.22, 1, 0.36, 1]
              }}
              className='mt-auto grid gap-4 min-[900px]:grid-cols-3 max-[899px]:mt-5 max-[899px]:grid-cols-1 max-[899px]:gap-3'
            >
              <Link
                href={ROUTES.PLANS}
                onClick={openPlans}
                className='group/button inline-flex h-[58px] items-center justify-center gap-2.5 rounded-[14px] brand-green-button px-5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,.14)] transition-[background-color,filter] duration-150 hover:brightness-[1.015] max-[899px]:h-[56px] max-[899px]:rounded-[12px] max-[899px]:text-[14px]'
              >
                <Crown className='size-5 shrink-0 max-[899px]:size-4.5' />
                <span>{t('more')}</span>
                <span aria-hidden className='transition-transform duration-150 group-hover/button:translate-x-0.5'>
                  →
                </span>
              </Link>

              <Link
                href={designCreateRoute()}
                onClick={() => onOpenChange(false)}
                className='inline-flex h-[58px] items-center justify-center gap-2.5 rounded-[14px] border border-white/48 bg-white/[0.025] px-5 text-[15px] font-bold text-white transition-[background-color,border-color] duration-150 hover:border-white/55 hover:bg-white/[0.04] active:bg-white/[0.025] max-[899px]:h-[56px] max-[899px]:rounded-[12px] max-[899px]:bg-transparent max-[899px]:text-[14px]'
              >
                <FilePlus2 className='size-5 shrink-0 max-[899px]:size-4.5' />
                {t('useSelected')}
              </Link>

              <Link
                href={`${ROUTES.CONSULT}?template=${encodeURIComponent(template.id)}`}
                onClick={() => onOpenChange(false)}
                className='inline-flex h-[58px] items-center justify-center gap-2.5 rounded-[14px] border border-white/48 bg-transparent px-5 text-[15px] font-bold text-white transition-[background-color,border-color] duration-150 hover:border-white/55 hover:bg-white/[0.025] active:bg-white/[0.018] max-[899px]:h-[56px] max-[899px]:rounded-[12px] max-[899px]:text-[14px]'
              >
                <MessageCircle className='size-5 shrink-0 max-[899px]:size-4.5' />
                {t('consult')}
              </Link>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : 0.2 }}
              className='mt-4 flex items-center justify-between gap-5 max-md:text-xs text-[11.5px] leading-relaxed text-white/68 max-[899px]:sticky max-[899px]:bottom-0 max-[899px]:z-20 max-[899px]:-mx-5 max-[899px]:bg-primary-strong max-[899px]:px-5 max-[899px]:pt-3 max-[899px]:pb-1'
            >
              <p className='max-w-[820px]'>{period === 'month' ? t('footnoteMonth') : t('footnoteDay')}</p>
              <button
                type='button'
                onClick={() => onOpenChange(false)}
                className='shrink-0 text-white/82 underline decoration-white/40 underline-offset-4 transition-colors duration-150 hover:text-white'
              >
                {t('later')}
              </button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function renderHighlightedNumber(title: string, total: number) {
  const number = String(total)
  const at = title.indexOf(number)
  if (at < 0) return title

  return (
    <>
      {title.slice(0, at)}
      <span className='text-[#ff8a20]'>{number}</span>
      {title.slice(at + number.length)}
    </>
  )
}
