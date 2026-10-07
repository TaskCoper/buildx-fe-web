'use client'

import { CalendarCheck, CircleCheck, Clock, FileText, Loader2, MapPin, Map as MapIcon, Send, Star } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { contractorFirmRoute, contractorInvitationsRoute, contractorInviteRoute } from '@/shared/constants/routes'
import { useCountUp } from '@/shared/hooks/use-count-up'
import { cn } from '@/shared/lib/utils'
import { formatNumber } from '@/shared/utils'
import { useInvitations } from '../hooks/use-invitations'
import { MAX_INVITATIONS } from '../constants/contractors.constants'
import { isNotAccepting } from '../services/contractor-list.service'
import type { Contractor } from '../types/contractor.types'
import { ContractorLogo } from './contractor-logo'

interface ContractorCardProps {
  contractor: Contractor
  projectId: string
  /** Đang được tick để so sánh (S12). */
  compared: boolean
  onToggleCompare: (contractorId: string) => void
  /** Nhà thầu này đã được mời cho dự án đang xét. */
  invited: boolean
  /** Chỉ nhà thầu vừa được mời ở lượt quay lại này mới nảy nhãn một lần. */
  invitedJustNow?: boolean
  /** Dự án đã đủ 3 lời mời — R1. */
  inviteLocked: boolean
  /** Đủ ba lựa chọn: khóa và làm mờ checkbox của những thẻ chưa chọn. */
  compareLocked?: boolean
  /** Vừa tạo hồ sơ từ M04, đây là thẻ đầu danh sách → viền loé một lần (mục 6). */
  ringFlash?: boolean
}

/**
 * Một thẻ trong danh sách "Nhà thầu được đề xuất" (S12).
 *
 * Bố cục theo bản thiết kế S12: ô tick "So sánh" và ô logo lớn nằm NGOÀI cùng
 * bên trái, giữa là tên nhà thầu (màu xanh, cỡ lớn) trên một LƯỚI chỉ số có vạch
 * ngăn dọc, phải là hai nút xếp chồng.
 *
 * Mỗi ô chỉ số là hai dòng — giá trị ở trên, nhãn nhỏ ở dưới ("18 dự án" /
 * "đã thực hiện") — chứ không phải một dãy chip một dòng như bản trước: cùng một bộ
 * số nhưng đọc lướt nhanh hơn hẳn khi so ba nhà thầu chồng lên nhau.
 *
 * Nút "Mời báo giá" khóa khi dự án đã đủ 3 lời mời (R1) — khóa chứ không ẩn, để
 * người dùng hiểu vì sao không bấm được.
 */
export function ContractorCard({
  contractor,
  projectId,
  compared,
  onToggleCompare,
  invited,
  invitedJustNow = false,
  inviteLocked,
  compareLocked = false,
  ringFlash = false
}: ContractorCardProps) {
  const t = useTranslations('contractors.common')
  const tMatches = useTranslations('contractors.matches')
  const rfq = useTranslations('contractors.rfq')
  const { limit, isError, siteRequired } = useInvitations(projectId)
  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()

  // Nhà thầu đã ngưng nhận dự án thì khóa nút mời (khóa chứ không ẩn, để biết vì sao không bấm được).
  const notAccepting = isNotAccepting(contractor)

  const [navigatingProfile, setNavigatingProfile] = useState(false)
  const [navigatingInvite, setNavigatingInvite] = useState(false)
  const handleCompare = () => {
    if (!compared && compareLocked) return
    onToggleCompare(contractor.id)
  }

  /** Bốn ô hàng trên: đánh giá · số dự án · khoảng cách · phạm vi phục vụ. */
  const facts = [
    {
      key: 'rating',
      icon: Star,
      iconClass: 'text-warning fill-current',
      value:
        contractor.ratingKnown === false ? (
          t('ratingUnknown')
        ) : (
          <AnimatedMetric
            value={Math.round(contractor.rating * 10)}
            format={(value) => `${formatNumber(value / 10, locale, { minimumFractionDigits: 1 })}/5`}
          />
        ),
      hint:
        contractor.reviewCountKnown === false
          ? t('informationUnknown')
          : t('reviewCount', { count: contractor.reviewCount })
    },
    {
      key: 'similar',
      icon: CalendarCheck,
      value: (
        <AnimatedMetric value={contractor.completedProjects} format={(value) => t('similarShort', { count: value })} />
      ),
      hint: t('similarSuffix')
    },
    {
      key: 'distance',
      icon: MapPin,
      value:
        contractor.distanceKnown === false ? (
          t('distanceUnknown')
        ) : (
          <AnimatedMetric
            value={Math.round(contractor.distanceKm * 10)}
            format={(value) =>
              t('distanceShort', { km: formatNumber(value / 10, locale, { minimumFractionDigits: 1 }) })
            }
          />
        ),
      hint: t('distanceSuffix')
    },
    {
      key: 'areas',
      icon: MapIcon,
      value: t('serviceAreas'),
      hint: contractor.serviceAreas.slice(0, 3).join(', ') || t('informationUnknown'),
      // Cả danh sách, hiện ở tooltip khi hover (dòng hint chỉ chừa 2 dòng nên dài là bị cắt "…").
      hintFull: contractor.serviceAreas.join(', ')
    }
  ]

  return (
    <motion.article
      animate={navigatingProfile && !reduceMotion ? { scale: 0.985, opacity: 0.52 } : { scale: 1, opacity: 1 }}
      whileHover={navigatingProfile || reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-card relative flex flex-col gap-4 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-start sm:p-5',
        'border-border hover:border-primary/40'
      )}
    >
      {/* Viền loé một lần khi đây là thẻ đầu vừa từ M04 sang (mục 6) — overlay
          riêng, không đụng viền gốc của thẻ. */}
      {ringFlash ? (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.1 }}
          className='border-primary pointer-events-none absolute -inset-1 rounded-2xl border-2'
        />
      ) : null}

      {/* Dải trái khi đang được tick so sánh (mục 7). */}
      <span
        aria-hidden
        className={cn(
          'bg-primary pointer-events-none absolute inset-y-1 left-px w-1 rounded-l-full opacity-0 transition-opacity',
          compared && 'opacity-100'
        )}
      />

      <div className='flex items-center gap-4 sm:items-start'>
        <label
          title={!compared && compareLocked ? tMatches('maxCompare', { max: MAX_INVITATIONS }) : undefined}
          className={cn(
            'text-muted-foreground flex cursor-pointer flex-col items-center gap-1.5 max-md:text-xs text-[11px] transition-opacity',
            !compared && compareLocked && 'cursor-not-allowed opacity-35'
          )}
        >
          <Checkbox
            checked={compared}
            disabled={!compared && compareLocked}
            onCheckedChange={handleCompare}
            aria-label={`${tMatches('compareCheckbox')} ${contractor.name}`}
          />
          <span>{tMatches('compareCheckbox')}</span>
        </label>

        {/* Ô logo lớn hơn hẳn bản trước — trong thiết kế nó là mốc nhận diện
            chính khi khách lướt qua ba nhà thầu. */}
        <ContractorLogo contractor={contractor} className='size-20 rounded-xl' />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='relative flex flex-wrap items-center gap-2'>
          <h3 className='text-primary-strong text-lg font-bold'>{contractor.name}</h3>
          {/* `popLayout` (cần cha `relative`): nhãn tĩnh bị thay bởi nhãn "vừa mời" rời
              dòng ngay, không đẩy lệch hàng tên trong lúc nhãn mới chờ phóng vào. */}
          <AnimatePresence mode='popLayout' custom={invitedJustNow}>
            {invited ? (
              <motion.span
                // Cờ "vừa mời" chỉ bật SAU lần render đầu (M05 đọc sessionStorage trong
                // effect), mà `initial` chỉ được đọc lúc gắn — đổi key để nhãn gắn lại
                // và phóng vào, trễ một nhịp cho thẻ kịp hiện (mục 5 của M09).
                key={invitedJustNow ? 'invited-now' : 'invited'}
                custom={invitedJustNow}
                variants={{
                  hidden: { scale: 0, opacity: 0 },
                  shown: { scale: 1, opacity: 1 },
                  // Nhãn tĩnh nhường chỗ cho nhãn "vừa mời" thì tắt ngay — co lại trước
                  // rồi mới phóng vào trông như nhãn bị giật hai lần.
                  exit: (swapping: boolean) =>
                    swapping ? { opacity: 0, transition: { duration: 0 } } : { scale: 0, opacity: 0 }
                }}
                initial={invitedJustNow && !reduceMotion ? 'hidden' : false}
                animate='shown'
                exit='exit'
                transition={{
                  type: 'spring',
                  bounce: 0.5,
                  duration: 0.35,
                  delay: invitedJustNow && !reduceMotion ? 0.45 : 0
                }}
                className='bg-primary/10 text-primary-strong rounded-md px-2 py-0.5 max-md:text-xs text-[11px] font-medium'
              >
                {t('invited')}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Vạch ngăn dọc giữa các ô, vạch ngang giữa hai hàng — `divide-*` lo cả
            hai, khỏi phải tự đặt border cho từng ô. */}
        <div className='divide-border mt-3 grid grid-cols-[minmax(0,1fr)] divide-y sm:grid-cols-2 lg:grid-cols-4'>
          <div className='divide-border grid grid-cols-[minmax(0,1fr)] divide-y sm:col-span-2 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:col-span-4 lg:grid-cols-4'>
            {facts.map((fact) => (
              <Fact
                key={fact.key}
                icon={fact.icon}
                iconClass={fact.iconClass}
                value={fact.value}
                hint={fact.hint}
                hintFull={'hintFull' in fact ? fact.hintFull : undefined}
              />
            ))}
          </div>

          <div className='divide-border grid grid-cols-[minmax(0,1fr)] divide-y sm:col-span-2 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:col-span-4'>
            <Fact
              icon={Clock}
              value={
                contractor.surveyTimeKnown === false ? (
                  t('informationUnknown')
                ) : (
                  <AnimatedMetric
                    value={contractor.surveyWithinHours}
                    format={(value) => t('surveyWithin', { hours: value })}
                  />
                )
              }
              hint={t('surveyLabel')}
            />
            <Fact
              icon={CircleCheck}
              value={
                contractor.acceptingProjectsKnown === false
                  ? t('informationUnknown')
                  : contractor.acceptingProjects
                    ? t('accepting')
                    : t('notAccepting')
              }
              hint={t('projectAvailability')}
            />
          </div>
        </div>
      </div>

      {/* Hai nút canh GIỮA theo chiều cao thẻ: khối chỉ số bên trái cao hai
          hàng nên để `items-start` thì cặp nút trôi hẳn lên đỉnh, nhìn lệch. */}
      <div className='flex shrink-0 flex-col gap-2.5 sm:w-44 sm:self-center'>
        <Button asChild variant='outline' className='justify-center' onClick={() => setNavigatingProfile(true)}>
          <Link href={contractorFirmRoute(projectId, contractor.id)}>
            {navigatingProfile ? <Loader2 className='size-4 animate-spin' /> : <FileText className='size-4' />}
            {t('viewProfile')}
          </Link>
        </Button>

        {invited ? (
          <Button asChild>
            <Link href={contractorInvitationsRoute(projectId)}>
              <CircleCheck className='size-4' />
              {tMatches('viewInvites')}
            </Link>
          </Button>
        ) : notAccepting ? (
          <Button disabled title={t('notAccepting')}>
            <Send className='size-4' />
            {t('invite')}
          </Button>
        ) : inviteLocked ? (
          <Button
            disabled
            title={
              siteRequired
                ? rfq('siteRequired')
                : isError
                  ? rfq('quotaUnavailable')
                  : limit === undefined
                    ? rfq('loading')
                    : tMatches('inviteLimitReached', { max: limit })
            }
          >
            <Send className='size-4' />
            {t('invite')}
          </Button>
        ) : (
          <Button asChild onClick={() => setNavigatingInvite(true)}>
            <Link href={contractorInviteRoute(projectId, contractor.id)}>
              {navigatingInvite ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
              {t('invite')}
            </Link>
          </Button>
        )}
      </div>
    </motion.article>
  )
}

/** Một ô chỉ số: icon + giá trị ở dòng trên, nhãn nhỏ ở dòng dưới. */
function Fact({
  icon: Icon,
  iconClass,
  value,
  hint,
  hintFull
}: {
  icon: typeof Star
  iconClass?: string
  value: ReactNode
  hint: string
  /** Nội dung đầy đủ của `hint` — có thì hover vào dòng hint sẽ hiện tooltip. */
  hintFull?: string
}) {
  return (
    // Cột chỉ số hẹp (4 ô trên một hàng) nên chữ phải nhỏ lại, và dòng nhãn
    // được XUỐNG DÒNG tối đa 2 dòng thay vì `truncate` — "TP. Buôn Ma Thuột,
    // Cư M'gar" mà cắt cụt thì mất luôn thông tin phục vụ ở đâu.
    <div className='grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-1.5 rounded-lg px-2.5 py-2'>
      <Icon aria-hidden className={cn('mt-0.5 size-3.5 shrink-0', iconClass ?? 'text-primary')} />
      <p className='min-w-0 truncate text-[13px] leading-snug font-semibold'>{value}</p>
      {hintFull ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className='text-muted-foreground col-start-2 mt-0.5 line-clamp-2 max-md:text-xs text-[11px] leading-snug text-pretty'
              tabIndex={0}
            >
              {hint}
            </p>
          </TooltipTrigger>
          <TooltipContent side='top' className='max-w-xs'>
            {hintFull}
          </TooltipContent>
        </Tooltip>
      ) : (
        <p className='text-muted-foreground col-start-2 mt-0.5 line-clamp-2 max-md:text-xs text-[11px] leading-snug text-pretty'>
          {hint}
        </p>
      )}
    </div>
  )
}

function AnimatedMetric({ value, format }: { value: number; format: (value: number) => string }) {
  const { ref, display } = useCountUp(value, { duration: 0.75, amount: 0.25 })
  return <span ref={ref}>{format(display)}</span>
}
