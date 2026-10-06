'use client'

import {
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  ImageIcon,
  Loader2,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Star,
  Users,
  X
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useCmsCollection } from '@/shared/cms'
import { Photo, revealContainerVariants, revealEase, revealItemVariants, RevealPhoto } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import {
  CONTRACTOR_PREVIEW_ID,
  contractorCompareRoute,
  contractorFirmRoute,
  contractorInvitationsRoute,
  contractorInviteRoute,
  contractorMatchesRoute
} from '@/shared/constants/routes'
import { useCountUp } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatDate, formatDisplayDate, formatNumber } from '@/shared/utils'
import { mergeProjectDetail } from '../api/contractors.logic'
import { env } from '@/shared/config/env'
import { CONTRACTOR_TABS, MAX_INVITATIONS, type ContractorTab } from '../constants/contractors.constants'
import { useBrief } from '../hooks/use-brief'
import { useContractor, useContractorProject } from '../hooks/use-contractors'
import { useInvitations } from '../hooks/use-invitations'
import { isInvited } from '../services/contractor-list.service'
import { useContractorsStore } from '../store/contractors.store'
import type { Contractor, ContractorPhoto, ContractorProject } from '../types/contractor.types'
import { MATCHES_LAST_VIEWED_KEY } from './contractor-matches'
import { ContractorLogo } from './contractor-logo'
import { useProjectPickerStore } from '../store/project-picker.store'
import { ProjectContextBar } from './project-context-bar'
import { ProjectPickerDialog } from './project-picker-dialog'

interface ContractorProfileProps {
  projectId: string
  contractorId: string
  /** Tab đang mở, lấy từ `?tab=` để chia sẻ được đường dẫn tới đúng tab. */
  tab: ContractorTab
}

/** Bề ngang trang, đo từ ảnh S13: khối nội dung chiếm 90% bề ngang màn. */
const PAGE_CONTAINER = 'mx-auto w-full max-w-[90rem] px-4 lg:px-8'

/** Vòng tròn luôn khép kín; chỉ nét tick bên trong chạy hiệu ứng vẽ. */
function DrawnCircleCheck({
  className,
  delay = 0,
  active = true
}: {
  className?: string
  delay?: number
  active?: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'border-primary text-primary flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]',
        className
      )}
    >
      <Check
        className={cn(
          'size-2.5 motion-reduce:animate-none',
          active && 'animate-[firm-check-draw_.45s_ease-out_backwards]'
        )}
        style={{
          animationDelay: `${delay}s`,
          strokeDasharray: 48,
          strokeDashoffset: active ? undefined : 48
        }}
        strokeWidth={3}
      />
    </span>
  )
}

function CountedMetric({ value, format }: { value: number; format: (value: number) => string }) {
  const { ref, display } = useCountUp(value, { duration: 0.8, amount: 0.3 })
  return <span ref={ref}>{format(display)}</span>
}

/**
 * Nội dung tab trượt vào theo hướng tab vừa chọn (mục 4) — Radix dựng lại mỗi
 * `TabsContent` khi nó vừa active nên `initial`/`animate` chạy đúng một lần
 * mỗi lần đổi tab, không cần `AnimatePresence`.
 */
function TabPanel({ direction, children }: { direction: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -12 }}
      transition={{ duration: 0.3, ease: revealEase }}
      className='space-y-5'
    >
      {children}
    </motion.div>
  )
}

/**
 * Nút "Mời báo giá" — MỘT nơi quyết định trạng thái, dùng lại cho cột phải,
 * dải tóm tắt dính khi cuộn và thanh dưới cùng trên mobile (mục 3/11), để ba
 * chỗ không bao giờ lệch nhau.
 */
function InviteButton({
  projectId,
  contractorId,
  contractor,
  preview,
  invited,
  inviteLocked,
  navigating,
  onNavigate,
  onOpenPicker,
  size
}: {
  projectId: string
  contractorId: string
  contractor: Contractor
  preview: boolean
  invited: boolean
  inviteLocked: boolean
  navigating: boolean
  onNavigate: () => void
  onOpenPicker: () => void
  size?: 'sm'
}) {
  const t = useTranslations('contractors.firm')
  const tCommon = useTranslations('contractors.common')

  const { limit } = useInvitations(projectId)
  const rfq = useTranslations('contractors.rfq')

  if (env.NEXT_PUBLIC_USE_MOCK_API && !contractor.acceptingProjects) {
    return (
      <Button size={size} className='w-full opacity-50' disabled>
        <Send className='size-4' />
        {tCommon('invite')}
      </Button>
    )
  }

  if (preview) {
    return (
      <Button size={size} className='w-full' onClick={onOpenPicker}>
        <Send className='size-4' />
        {tCommon('invite')}
      </Button>
    )
  }

  if (invited) {
    return (
      <Button asChild size={size} variant='outline' className='border-primary text-primary-strong w-full'>
        <Link href={contractorInvitationsRoute(projectId)}>
          <Send className='size-4' />
          {tCommon('invited')} · {t('viewInvites')}
        </Link>
      </Button>
    )
  }

  if (inviteLocked) {
    return (
      <Button
        size={size}
        className='w-full'
        disabled
        title={limit === undefined ? rfq('quotaUnavailable') : tCommon('inviteFull', { max: limit })}
      >
        <Send className='size-4' />
        {limit === undefined ? tCommon('invite') : tCommon('inviteFull', { max: limit })}
      </Button>
    )
  }

  return (
    <Button asChild size={size} className='w-full' onClick={onNavigate}>
      <Link href={contractorInviteRoute(projectId, contractorId)}>
        {navigating ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
        {tCommon('invite')}
      </Link>
    </Button>
  )
}

/**
 * Hồ sơ một nhà thầu — S13 (tab Tổng quan) và S14 (tab Hợp tác SAVICO) là HAI
 * TAB CỦA CÙNG MỘT MÀN, không phải hai trang.
 *
 * Ba điểm bố cục lấy thẳng từ ảnh S13, đừng "dọn dẹp" lại:
 * - Khối nhận diện, dải chỉ số và HÀNG TAB nằm chung MỘT thẻ. Tab tách ra ngoài
 *   thẻ (bản trước) làm phần đầu trang vỡ thành hai mảnh rời.
 * - Tab Tổng quan là bản TÓM TẮT cả hồ sơ (giới thiệu, hợp tác, dự án tiêu
 *   biểu, năng lực); ba tab còn lại là bản chi tiết của từng phần. Ảnh mẫu vẽ
 *   đúng như vậy — khách xem lướt một lượt rồi mới bấm vào tab cần soi kỹ.
 * - Cột phải chỉ có ba dòng TÌNH TRẠNG NHẬN VIỆC (khảo sát / đang nhận / phạm
 *   vi). Năm thành lập, quy mô đội ngũ và văn phòng chuyển sang cột trái, nằm
 *   ngay dưới đoạn giới thiệu.
 */
export function ContractorProfile({ projectId, contractorId, tab }: ContractorProfileProps) {
  const t = useTranslations('contractors.firm')
  const tCommon = useTranslations('contractors.common')
  const locale = useLocale() as Locale
  const router = useRouter()

  const openPicker = useProjectPickerStore((s) => s.openPicker)
  /** Xem thử — chưa gắn hồ sơ dự án nào (xem `CONTRACTOR_PREVIEW_ID`). */
  const preview = projectId === CONTRACTOR_PREVIEW_ID

  const { data: brief } = useBrief(projectId)
  const { data: contractor, isPending, isError, refetch } = useContractor(contractorId)
  const { data: invitations, remaining } = useInvitations(projectId)

  const compareIds = useContractorsStore((s) => s.compareIds)
  const toggleCompare = useContractorsStore((s) => s.toggleCompare)

  const sent = invitations ?? []
  const invited = isInvited(sent, contractorId)
  const inviteLocked = remaining === 0
  const inCompare = compareIds.includes(contractorId)
  const compareLocked = !inCompare && compareIds.length >= MAX_INVITATIONS
  const reduceMotion = useReducedMotion()
  const compareButtonRef = useRef<HTMLButtonElement>(null)
  const [compareFlight, setCompareFlight] = useState<{
    fromX: number
    fromY: number
    toX: number
    toY: number
  } | null>(null)

  // Cuộn qua khối nhận diện → dải tóm tắt dính dưới thanh điều hướng (mục 3).

  const handleToggleCompare = () => {
    if (compareLocked) return
    if (!inCompare && !reduceMotion) {
      const source = compareButtonRef.current?.getBoundingClientRect()
      const target = document.getElementById('firm-compare-target')?.getBoundingClientRect()
      if (source && target) {
        setCompareFlight({
          fromX: source.left + source.width / 2,
          fromY: source.top + source.height / 2,
          toX: target.left + target.width / 2,
          toY: target.top + target.height / 2
        })
      }
    }
    toggleCompare(contractorId)
  }

  /** Đang xem ảnh nào trong hộp phóng — `null` là đang đóng (mục 6). */
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)

  /** Nút "Mời báo giá" thở một nhịp sau khi hiện (mục 11). */
  const [inviteBreathe, setInviteBreathe] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setInviteBreathe(true), 500)
    return () => window.clearTimeout(timer)
  }, [])
  /** Bấm "Mời báo giá" → vòng xoay trong lúc trang M08 tải (mục 11). */
  const [navigatingInvite, setNavigatingInvite] = useState(false)

  /**
   * Nội dung trượt vào theo HƯỚNG của tab vừa chọn so với tab trước đó (mục
   * 4) — dương là sang phải (tab đứng sau), âm là sang trái. Mẫu "điều chỉnh
   * state khi prop đổi" chính thức của React: so với tab đã thấy lần render
   * trước, đặt lại ngay trong thân hàm thay vì trong `useEffect`.
   */
  const [renderedTab, setRenderedTab] = useState(tab)
  const [tabDirection, setTabDirection] = useState(1)
  if (tab !== renderedTab) {
    setTabDirection(CONTRACTOR_TABS.indexOf(tab) - CONTRACTOR_TABS.indexOf(renderedTab) || 1)
    setRenderedTab(tab)
  }

  if (isError)
    return (
      <div className='mx-auto max-w-5xl space-y-3 p-6'>
        <p role='alert'>{t('loadFailed')}</p>
        <Button onClick={() => void refetch()}>{t('retry')}</Button>
      </div>
    )

  if (isPending || !contractor) {
    return (
      <div className={cn(PAGE_CONTAINER, 'space-y-6 py-5')}>
        <Skeleton className='h-20 rounded-2xl' />
        <Skeleton className='h-96 rounded-2xl' />
      </div>
    )
  }

  const areas = contractor.serviceAreas.slice(0, 3).join(', ')

  /** Dải chỉ số trong thẻ nhận diện — xem thử chưa chọn dự án nên ẩn khoảng cách. */
  const headerFacts = [
    {
      key: 'similar',
      icon: CalendarCheck,
      value: (
        <CountedMetric
          value={contractor.similarProjects}
          format={(value) => tCommon('similarShort', { count: value })}
        />
      ),
      hint: tCommon('similarSuffix')
    },
    {
      key: 'distance',
      icon: MapPin,
      value:
        contractor.distanceKnown === false ? (
          tCommon('distanceUnknown')
        ) : (
          <CountedMetric
            value={Math.round(contractor.distanceKm * 10)}
            format={(value) =>
              tCommon('distanceShort', {
                km: formatNumber(value / 10, locale, { minimumFractionDigits: 1 })
              })
            }
          />
        ),
      hint: tCommon('distanceSuffix')
    },
    {
      key: 'areas',
      icon: MapIcon,
      value: (
        <CountedMetric
          value={contractor.serviceAreas.length}
          format={(value) => t('serviceAreaCount', { count: value })}
        />
      ),
      hint: areas
    },
    {
      key: 'survey',
      icon: Clock,
      value: (
        <CountedMetric
          value={contractor.surveyWithinHours}
          format={(value) => tCommon('surveyHours', { hours: value })}
        />
      ),
      hint: tCommon('surveyLabel')
    }
  ].filter((fact) => fact.key !== 'distance' || !preview)

  /** Ba dòng "Thông tin hoạt động" ở cột phải — nhãn nhỏ ở trên, giá trị ở dưới. */
  const activityRows = [
    {
      key: 'survey',
      icon: Clock,
      label: tCommon('surveyLabel'),
      value: tCommon('surveyHours', { hours: contractor.surveyWithinHours })
    },
    {
      key: 'accepting',
      icon: Briefcase,
      label: contractor.acceptingProjects ? tCommon('acceptingLabel') : tCommon('notAccepting'),
      value: tCommon('acceptingSuffix')
    },
    { key: 'areas', icon: MapIcon, label: tCommon('serviceAreas'), value: areas }
  ]

  return (
    <div className={cn(PAGE_CONTAINER, 'space-y-4 py-5')}>
      {/* Xem thử thì chưa có hồ sơ để hiện — để nguyên thanh này là một khung
          chờ xám đứng mãi ở đầu trang. */}
      {preview ? null : (
        <ProjectContextBar
          brief={brief}
          extra={
            <motion.div
              id='firm-compare-target'
              key={compareIds.length}
              initial={reduceMotion ? false : { scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              <Button asChild size='sm' variant='outline' className='border-primary/40 text-primary-strong'>
                <Link href={contractorCompareRoute(projectId)}>
                  <Scale className='size-3.5' />
                  {t('compareChip', { count: compareIds.length, max: MAX_INVITATIONS })}
                </Link>
              </Button>
            </motion.div>
          }
        />
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Link
          href={contractorMatchesRoute(projectId)}
          onClick={() => window.sessionStorage.setItem(MATCHES_LAST_VIEWED_KEY, contractorId)}
          className='text-primary-strong inline-flex items-center gap-2 text-sm font-medium'
        >
          ← {tCommon('backToList')}
        </Link>
      </motion.div>

      <div className='grid gap-x-[1.4%] gap-y-5 lg:grid-cols-[79%_minmax(0,1fr)]'>
        <div className='min-w-0'>
          <Tabs
            value={tab}
            onValueChange={(next) => router.replace(contractorFirmRoute(projectId, contractorId, next))}
            className='gap-5'
          >
            {/* Nhận diện + chỉ số + tab: một thẻ duy nhất, đúng ảnh S13. */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: revealEase }}
              className='bg-card rounded-2xl border'
            >
              <div className='flex flex-wrap items-center gap-y-4 px-5 py-4'>
                <ContractorLogo contractor={contractor} className='size-24 shrink-0 rounded-xl' />

                <div className='min-w-0 grow basis-52 px-4 lg:grow-0 lg:basis-[25%]'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h1 className='min-w-0 text-xl font-semibold tracking-tight text-balance'>{contractor.name}</h1>
                    {invited ? (
                      <span className='bg-primary/10 text-primary-strong rounded-md px-2 py-0.5 max-md:text-xs text-[11px] font-medium'>
                        {tCommon('invited')}
                      </span>
                    ) : null}
                  </div>
                  {/* Dấu xác minh đứng cùng hàng với loại nhà thầu, không rơi xuống hàng riêng khi tên dài. */}
                  <p className='text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-sm whitespace-nowrap'>
                    {contractor.verified ? (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.6, duration: 0.4, delay: 0.3 }}
                        className='flex shrink-0'
                      >
                        <BadgeCheck className='text-primary size-4 shrink-0 animate-[firm-check-draw_.5s_ease-out_backwards] overflow-visible motion-reduce:animate-none' />
                      </motion.span>
                    ) : null}
                    <span className='truncate'>{contractor.kind}</span>
                  </p>
                </div>

                <motion.div
                  variants={revealContainerVariants}
                  initial='hidden'
                  animate='show'
                  transition={{ delayChildren: 0.4 }}
                  // Mobile: lưới 2x2 (4 ô một hàng làm chữ bị cắt "3 d…", "6.9…"); từ `sm` trở lên
                  // quay về một hàng có vạch ngăn dọc như cũ.
                  className='divide-border border-border grid min-w-0 grow basis-full grid-cols-2 gap-x-3 gap-y-3 sm:flex sm:gap-0 sm:divide-x sm:border-l lg:basis-0'
                >
                  {headerFacts.map((fact) => (
                    <motion.div variants={revealItemVariants} key={fact.key} className='min-w-0 flex-1 sm:px-2.5'>
                      <p className='flex min-w-0 items-center gap-1.5 text-sm font-semibold'>
                        <fact.icon aria-hidden className='text-primary size-4 shrink-0' />
                        <span className='truncate'>{fact.value}</span>
                      </p>
                      <p className='text-muted-foreground mt-1 truncate pl-5.5 text-xs'>{fact.hint}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Tab gạch chân, không phải viên thuốc nền xám của primitive.
                  Gạch chân trượt giữa các tab + vẽ từ trái khi vào trang (mục 4). */}
              <TabsList className='h-auto w-full justify-start gap-8 overflow-x-auto rounded-none border-t bg-transparent px-5 py-0'>
                {CONTRACTOR_TABS.map((key) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className='data-[state=active]:text-primary-strong text-muted-foreground relative h-auto flex-none rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                  >
                    {t(`tabs.${key}`)}
                    {tab === key ? (
                      <motion.span
                        layoutId='firm-tab-underline'
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        style={{ transformOrigin: 'left' }}
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                        className='border-primary pointer-events-none absolute inset-x-0 bottom-0 border-b-2'
                      />
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>

              {tab === 'projects' ? (
                <FeaturedProjects
                  contractor={contractor}
                  inviteAction={
                    <InviteButton
                      projectId={projectId}
                      contractorId={contractorId}
                      contractor={contractor}
                      preview={preview}
                      invited={invited}
                      inviteLocked={inviteLocked}
                      navigating={navigatingInvite}
                      onNavigate={() => setNavigatingInvite(true)}
                      onOpenPicker={openPicker}
                      size='sm'
                    />
                  }
                />
              ) : null}
              {tab === 'legal' ? (
                <div className='px-4 pt-4 pb-5 sm:px-5 sm:pt-5 sm:pb-6'>
                  <LegalChecks contractor={contractor} detailed />
                </div>
              ) : null}
            </motion.div>

            <motion.div layout className='overflow-hidden' transition={{ duration: 0.3, ease: revealEase }}>
              <AnimatePresence mode='wait'>
                <TabPanel key={tab} direction={tabDirection}>
                  {tab === 'overview' ? (
                    <>
                      <IntroCard contractor={contractor} onOpenPhoto={setActivePhotoIndex} />
                      <LegalChecks contractor={contractor} />
                    </>
                  ) : null}
                  {tab === 'partnership' ? <PartnershipTab contractor={contractor} /> : null}
                </TabPanel>
              </AnimatePresence>
            </motion.div>
          </Tabs>
        </div>

        {/* Cột phải dính theo cuộn: nút "Mời báo giá" là hành động chính của màn,
            hồ sơ lại dài — để nó trôi mất là bắt người dùng cuộn ngược lên. */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className='hidden space-y-4 lg:block'
        >
          <motion.section
            variants={revealContainerVariants}
            initial='hidden'
            animate='show'
            className='bg-card rounded-2xl border p-4'
          >
            <h2 className='text-base font-semibold'>{t('activity')}</h2>
            <ul className='mt-3 space-y-2'>
              {activityRows.map((row) => (
                <motion.li
                  variants={revealItemVariants}
                  key={row.key}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                    row.key === 'accepting' && !contractor.acceptingProjects && 'bg-muted/60 text-muted-foreground'
                  )}
                >
                  <row.icon
                    aria-hidden
                    className={cn(
                      'text-primary size-4 shrink-0',
                      row.key === 'accepting' && !contractor.acceptingProjects && 'text-muted-foreground'
                    )}
                  />
                  <div className='min-w-0'>
                    <p className='text-muted-foreground max-md:text-xs text-[11px] leading-tight'>{row.label}</p>
                    <p className='mt-0.5 truncate text-sm font-semibold'>{row.value}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          <div className='space-y-2.5'>
            {/* Hiện sau cùng + một nhịp thở (mục 11); tạm ngưng nhận dự án →
                nút mờ + dẫn hướng sang nhà thầu khác (mục 10). */}
            <motion.div
              className='h-11 [&>*]:h-11'
              animate={{ scale: inviteBreathe && contractor.acceptingProjects ? [1, 1.02, 1] : 1 }}
              transition={{ duration: 0.5 }}
            >
              <InviteButton
                projectId={projectId}
                contractorId={contractorId}
                contractor={contractor}
                preview={preview}
                invited={invited}
                inviteLocked={inviteLocked}
                navigating={navigatingInvite}
                onNavigate={() => setNavigatingInvite(true)}
                onOpenPicker={openPicker}
              />
            </motion.div>
            {!contractor.acceptingProjects ? (
              <>
                <p className='text-muted-foreground text-xs text-pretty'>{t('notAcceptingNotice')}</p>
                <Button asChild variant='outline' className='h-11 w-full'>
                  <Link href={contractorMatchesRoute(projectId)}>{t('viewSimilar')}</Link>
                </Button>
              </>
            ) : null}

            <Button
              ref={compareButtonRef}
              variant='outline'
              disabled={compareLocked}
              title={compareLocked ? t('compareFull', { max: MAX_INVITATIONS }) : undefined}
              className={cn(
                'border-primary/50 text-primary-strong h-11 w-full',
                inCompare && 'border-primary bg-primary/10 hover:bg-primary/15'
              )}
              onClick={handleToggleCompare}
            >
              {inCompare ? (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.6, duration: 0.35 }}
                >
                  <DrawnCircleCheck />
                </motion.span>
              ) : (
                <Plus className='size-4' />
              )}
              {inCompare ? t('inCompare') : t('addToCompare')}
            </Button>
          </div>
        </motion.aside>
      </div>

      {compareFlight && typeof document !== 'undefined'
        ? createPortal(
            <motion.div
              initial={{ x: compareFlight.fromX, y: compareFlight.fromY, opacity: 0, scale: 0.74 }}
              animate={{
                x: [compareFlight.fromX, compareFlight.fromX, compareFlight.toX, compareFlight.toX],
                y: [compareFlight.fromY, compareFlight.fromY - 72, compareFlight.toY - 24, compareFlight.toY],
                opacity: [0, 1, 1, 0],
                scale: [0.74, 0.9, 0.7, 0.5]
              }}
              transition={{ duration: 0.85, ease: revealEase, times: [0, 0.16, 0.82, 1] }}
              onAnimationComplete={() => setCompareFlight(null)}
              className='bg-card pointer-events-none fixed top-0 left-0 z-60 flex max-w-44 items-center gap-2 rounded-xl border px-2 py-1.5 shadow-lg'
            >
              <ContractorLogo contractor={contractor} className='size-7 rounded-md max-md:text-xs text-[9px]' />
              <span className='truncate text-xs font-semibold'>{contractor.name}</span>
            </motion.div>,
            document.body
          )
        : null}

      <PhotoLightbox
        photos={contractor.photos}
        index={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onNavigate={setActivePhotoIndex}
      />

      {preview ? <ProjectPickerDialog /> : null}
    </div>
  )
}

/**
 * Khối giới thiệu: chữ bên trái, bộ ảnh ghép bên phải.
 *
 * Ảnh ghép là 1 ảnh lớn + 2 ảnh xếp chồng, mỗi ảnh có chú thích đè lên đáy —
 * đúng ảnh S13. Tỉ lệ 58,6% / 41,4% cũng đo từ ảnh đó.
 */
function IntroCard({ contractor, onOpenPhoto }: { contractor: Contractor; onOpenPhoto: (index: number) => void }) {
  const t = useTranslations('contractors.firm')

  const facts = [
    { key: 'founded', icon: CalendarDays, text: t('founded', { year: contractor.foundedYear }) },
    { key: 'team', icon: Users, text: t('team', { count: contractor.teamSize }) },
    { key: 'office', icon: MapPin, text: t('office', { address: contractor.officeAddress }) }
  ]

  const [lead, ...rest] = contractor.photos

  return (
    <section className='bg-card grid gap-x-[1.5%] gap-y-5 rounded-2xl border p-4 lg:grid-cols-[37%_minmax(0,1fr)]'>
      <motion.div
        variants={revealContainerVariants}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, amount: 0.25 }}
        className='min-w-0'
      >
        <motion.h2 variants={revealItemVariants} className='text-base font-semibold'>
          {t('introTitle')}
        </motion.h2>
        <motion.p
          variants={revealItemVariants}
          className='text-muted-foreground mt-2 text-sm leading-relaxed text-pretty'
        >
          {contractor.intro}
        </motion.p>

        <motion.ul variants={revealContainerVariants} className='mt-4 space-y-2.5 text-sm'>
          {facts.map((fact) => (
            <motion.li variants={revealItemVariants} key={fact.key} className='flex items-start gap-2.5'>
              <fact.icon aria-hidden className='text-primary mt-0.5 size-4 shrink-0' />
              <span className='text-pretty'>{fact.text}</span>
            </motion.li>
          ))}
        </motion.ul>

        {/* Hai thẻ mặc định, CHỈ ĐỂ XEM — không bấm được và không chuyển tab. */}
        <motion.ul variants={revealContainerVariants} className='mt-4 flex flex-wrap gap-2'>
          {(['buildingType', 'scope'] as const).map((tag) => (
            <motion.li
              variants={revealItemVariants}
              key={tag}
              className='border-primary/40 text-primary-strong rounded-md border px-2.5 py-1 text-xs'
            >
              {t(`introTags.${tag}`)}
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      {/* Ô lớn KHÔNG khóa tỉ lệ: trong ảnh mẫu bộ ảnh cao đúng bằng khối chữ bên
          trái, hai đáy thẳng hàng. Đặt `aspect-*` cho ô lớn thì nó dừng sớm hơn
          cột ảnh nhỏ bên cạnh, bộ ghép thành hình răng cưa. */}
      {lead ? (
        <motion.div
          variants={revealContainerVariants}
          initial='hidden'
          animate='show'
          className='grid min-h-52 min-w-0 gap-[1.8%] sm:grid-cols-[58.6%_minmax(0,1fr)]'
        >
          <CollagePhoto photo={lead} onOpen={() => onOpenPhoto(0)} />
          <div className='flex flex-col gap-2'>
            {rest.slice(0, 2).map((photo, index) => (
              <CollagePhoto
                key={photo.caption}
                photo={photo}
                className='min-h-24 flex-1'
                onOpen={() => onOpenPhoto(index + 1)}
              />
            ))}
          </div>
        </motion.div>
      ) : null}
    </section>
  )
}

/**
 * Một ô ảnh trong bộ ghép.
 *
 * CHỖ CHỜ ASSET: chưa có ảnh thật của nhà thầu thì để KHUNG NÉT ĐỨT kèm chú
 * thích, giống ô logo. Nhét đại ảnh kho vào đây thì "Trụ sở công ty" hóa ra
 * biệt thự có hồ bơi, "Đội ngũ nhân sự" hóa ra một người thợ điện — trông như
 * đã có ảnh nên không ai biết là còn thiếu.
 */
function CollagePhoto({
  photo,
  className,
  onOpen
}: {
  photo: ContractorPhoto
  className?: string
  onOpen?: () => void
}) {
  if (!photo.url) {
    return (
      <motion.div
        variants={revealItemVariants}
        className={cn(
          'bg-muted/30 text-muted-foreground/70 flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-2 text-center',
          className
        )}
      >
        <ImageIcon aria-hidden className='size-5 shrink-0' />
        <p className='text-xs'>{photo.caption}</p>
      </motion.div>
    )
  }

  return (
    <motion.button
      type='button'
      variants={revealItemVariants}
      layoutId={`firm-photo-${photo.caption}`}
      onClick={onOpen}
      className={cn('group relative min-w-0 overflow-hidden rounded-xl border text-left', className)}
    >
      {/* `alt` để trống: chú thích ngay bên dưới đã mô tả ảnh, đặt cả hai thì
          trình đọc màn hình đọc trùng hai lần. `RevealPhoto` đã tự lo hiện
          mờ→nét lúc tải và phóng nhẹ khi rê (mục 6). */}
      <RevealPhoto src={photo.url} alt='' className='size-full' sizes='(max-width: 768px) 100vw, 360px' />
      {/* Lớp tối + biểu tượng xem khi rê (mục 6). */}
      <span className='absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-200 group-hover:bg-black/30 group-hover:opacity-100'>
        <Eye className='size-6 text-white' />
      </span>
      <p className='pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pt-6 pb-2 text-xs font-medium text-white'>
        {photo.caption}
      </p>
    </motion.button>
  )
}

/**
 * Hộp phóng ảnh doanh nghiệp (mục 6) — phóng ra từ đúng ảnh vừa bấm, mũi tên
 * chuyển ảnh, Esc/bấm nền để đóng.
 *
 * Shared layout giữ đúng điểm xuất phát của ảnh; kéo ngang, phím mũi tên và Esc
 * cùng dùng chung một chỉ số nên không tạo ba luồng điều hướng lệch nhau.
 */
function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate
}: {
  photos: ContractorPhoto[]
  index: number | null
  onClose: () => void
  onNavigate: (nextIndex: number) => void
}) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (index === null) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onNavigate((index - 1 + photos.length) % photos.length)
      if (event.key === 'ArrowRight') onNavigate((index + 1) % photos.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, photos.length, onClose, onNavigate])

  const photo = index !== null ? photos[index] : undefined

  return (
    <AnimatePresence>
      {photo?.url ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6'
        >
          <motion.div
            key={index}
            layoutId={`firm-photo-${photo.caption}`}
            initial={reduceMotion ? false : { opacity: 0.65, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0.65, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            drag={photos.length > 1 && !reduceMotion ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.22}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) onNavigate(((index ?? 0) + 1) % photos.length)
              if (info.offset.x > 60) onNavigate(((index ?? 0) - 1 + photos.length) % photos.length)
            }}
            className='relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl'
          >
            <Photo src={photo.url} alt='' className='size-full' sizes='90vw' />
            <p className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-4 pt-8 pb-3 text-sm font-medium text-white'>
              {photo.caption}
            </p>
          </motion.div>

          <button
            type='button'
            onClick={onClose}
            aria-label='Close'
            className='absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
          >
            <X className='size-4' />
          </button>

          {photos.length > 1 ? (
            <>
              <button
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  onNavigate(((index ?? 0) - 1 + photos.length) % photos.length)
                }}
                aria-label='Previous photo'
                className='absolute left-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
              >
                <ChevronLeft className='size-5' />
              </button>
              <button
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  onNavigate(((index ?? 0) + 1) % photos.length)
                }}
                aria-label='Next photo'
                className='absolute right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
              >
                <ChevronRight className='size-5' />
              </button>
            </>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * Tab "Dự án đã thực hiện" (epic ContractorManagement §2, §7, §12): tổng số và số
 * đã xác minh đếm từ chính danh sách dự án đang hiển thị, lọc theo Loại công
 * trình trong danh mục dùng chung, badge Đã xác minh / Nổi bật trên thẻ. Tab
 * Tổng quan không có khối dự án riêng.
 */
function FeaturedProjects({ contractor, inviteAction }: { contractor: Contractor; inviteAction?: React.ReactNode }) {
  const t = useTranslations('contractors.firm')
  const reduceMotion = useReducedMotion()
  const { typeLabel, scopeLabel, scaleOf } = useProjectLabels(contractor.featuredProjects)
  const [selectedProject, setSelectedProject] = useState<ContractorProject | null>(null)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [projectSort, setProjectSort] = useState<'latest' | 'oldest'>('latest')
  const [showAllProjects, setShowAllProjects] = useState(false)
  // Mở dự án → nạp chi tiết từ `GET /contractors/{id}/projects/{projectId}` rồi phủ lên dữ liệu thẻ
  // (field API có thì lấy, không có thì giữ). Dự án mock không có gì để nạp nên hook trả `null`.
  const { data: projectDetail } = useContractorProject(contractor.id, selectedProject?.id ?? '')
  const shownProject = selectedProject
    ? mergeProjectDetail(selectedProject, projectDetail, (count) => t('projects.detail.floors', { count }))
    : null
  const allProjects = contractor.featuredProjects
  const projects = [...allProjects]
    .filter((project) => !verifiedOnly || project.verified)
    .filter((project) => typeFilter === 'all' || project.buildingTypeId === typeFilter)
    .sort((left, right) => (projectSort === 'latest' ? right.year - left.year : left.year - right.year))

  const typeCounts = new Map<string, number>()
  for (const project of allProjects) {
    if (project.buildingTypeId)
      typeCounts.set(project.buildingTypeId, (typeCounts.get(project.buildingTypeId) ?? 0) + 1)
  }
  const projectFilters = [
    { key: 'all', label: t('projects.filters.all', { count: allProjects.length }) },
    ...[...typeCounts].map(([key, count]) => ({
      key,
      label: t('projects.filters.type', { label: typeLabel(key), count })
    }))
  ]
  const visibleProjects = showAllProjects ? projects : projects.slice(0, 6)
  const moreCount = Math.max(0, projects.length - visibleProjects.length)
  const resultsKey = `${verifiedOnly}-${typeFilter}-${projectSort}`

  return (
    <>
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
        className='border-t px-4 py-5 sm:px-5 sm:py-6'
      >
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <p className='text-sm'>
            <strong className='font-semibold'>{t('projects.projectCount', { count: allProjects.length })}</strong>
            <span className='text-muted-foreground'>
              {' '}
              · {t('projects.verifiedSummary', { count: allProjects.filter((project) => project.verified).length })}
            </span>
          </p>

          <div className='flex flex-wrap items-center gap-3'>
            <label className='hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors'>
              <Checkbox
                checked={verifiedOnly}
                onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
                aria-label={t('projects.verifiedOnly')}
              />
              <span>{t('projects.verifiedOnly')}</span>
            </label>
            <Select value={projectSort} onValueChange={(value) => setProjectSort(value as 'latest' | 'oldest')}>
              <SelectTrigger className='w-36' aria-label={t('projects.sortLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='latest'>{t('projects.sortLatest')}</SelectItem>
                <SelectItem value='oldest'>{t('projects.sortOldest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='mt-4 flex gap-2 overflow-x-auto pb-1' role='group' aria-label={t('projects.filterLabel')}>
          {projectFilters.map((item) => (
            <button
              key={item.key}
              type='button'
              aria-pressed={typeFilter === item.key}
              onClick={() => setTypeFilter(item.key)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98]',
                typeFilter === item.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:border-primary/40 hover:text-primary-strong bg-background'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {projects.length ? (
          <motion.ul
            key={resultsKey}
            layout
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
            className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
          >
            <AnimatePresence mode='popLayout'>
              {visibleProjects.map((project, index) => (
                <motion.li
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.26,
                    delay: reduceMotion ? 0 : Math.min(index % 6, 5) * 0.045,
                    ease: revealEase
                  }}
                  key={project.id}
                  className='overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-[0_14px_28px_-22px_rgba(42,117,63,0.62)]'
                >
                  <button
                    type='button'
                    onClick={() => setSelectedProject(project)}
                    className='group block size-full text-left active:scale-[0.995]'
                  >
                    <div className='bg-muted/30 relative aspect-[16/9] overflow-hidden'>
                      {project.imageUrl ? (
                        <RevealPhoto
                          src={project.imageUrl}
                          alt={project.name}
                          className='size-full transition-transform duration-300 group-hover:scale-[1.02]'
                          sizes='(max-width: 640px) 90vw, (max-width: 1280px) 40vw, 260px'
                        />
                      ) : (
                        <div className='flex size-full items-center justify-center'>
                          <ImageIcon className='text-muted-foreground/45 size-8' />
                        </div>
                      )}
                      <div className='absolute top-2 left-2 flex flex-wrap gap-1.5'>
                        {project.featured ? (
                          <span className='bg-background/95 inline-flex items-center gap-1 rounded-md border px-2 py-1 max-md:text-xs text-[11px] font-medium shadow-sm'>
                            <Star className='size-3.5' />
                            {t('projects.featuredBadge')}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className='p-3'>
                      <h3 className='group-hover:text-primary-strong text-sm font-semibold transition-colors'>
                        {project.name}
                      </h3>
                      {project.buildingTypeId || project.scopeId || project.scope ? (
                        <div className='mt-2 flex flex-wrap gap-1.5'>
                          {[
                            project.buildingTypeId ? typeLabel(project.buildingTypeId) : null,
                            project.scopeId || project.scope ? scopeLabel(project) : null
                          ]
                            .filter(Boolean)
                            .map((label) => (
                              <span
                                key={label}
                                className='bg-muted rounded-md px-2 py-1 max-md:text-xs text-[11px] text-muted-foreground'
                              >
                                {label}
                              </span>
                            ))}
                        </div>
                      ) : null}
                      <div className='text-muted-foreground mt-3 flex flex-wrap items-center gap-y-1 text-xs'>
                        {project.dimensions ? <span className='pr-2'>{project.dimensions}</span> : null}
                        {project.areaM2 ? (
                          <span className='pr-2'>{t('projects.area', { area: project.areaM2 })}</span>
                        ) : null}
                        {scaleOf(project) ? <span className='border-l px-2'>{scaleOf(project)}</span> : null}
                      </div>
                      <p className='text-muted-foreground mt-2 text-xs'>
                        {t('projects.completed', { year: project.year })}
                      </p>
                      {project.location ? (
                        <p className='text-muted-foreground mt-2 flex items-start gap-1.5 text-xs'>
                          <MapPin className='mt-0.5 size-3.5 shrink-0' />
                          <span>{project.location}</span>
                        </p>
                      ) : null}
                      <span className='text-primary-strong mt-3 inline-flex items-center gap-1 text-xs font-medium'>
                        {t('projects.viewDetail')}
                        <span className='transition-transform group-hover:translate-x-0.5'>→</span>
                      </span>
                    </div>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <motion.div
            key={resultsKey}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-muted/30 mt-4 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground'
          >
            {t('projects.empty')}
          </motion.div>
        )}

        {moreCount > 0 ? (
          <div className='mt-5 text-center'>
            <Button type='button' variant='outline' size='sm' onClick={() => setShowAllProjects(true)}>
              {t('projects.showMore', { count: moreCount })}
            </Button>
          </div>
        ) : null}
      </motion.section>

      <ProjectDetailModal
        contractor={contractor}
        project={shownProject}
        inviteAction={inviteAction}
        onClose={() => setSelectedProject(null)}
      />
    </>
  )
}

/**
 * Nhãn Loại công trình theo danh mục dùng chung và Quy mô (Số tầng, Tum) theo
 * phương án đã lưu (ContractorManagement §7). Bản API dùng tên loại/phạm vi và
 * số tầng trong DTO; dự án cũ chỉ có quy mô dạng chữ vẫn giữ dòng đó.
 */
function useProjectLabels(projects: readonly ContractorProject[]) {
  const t = useTranslations('contractors.firm.projects.detail')
  const buildingTypes = useCmsCollection('buildingTypes')
  const floorOptions = useCmsCollection('floorOptions')
  const typeLabel = (id: string) =>
    projects.find((project) => project.buildingTypeId === id && project.buildingTypeName)?.buildingTypeName ??
    buildingTypes.find((type) => type.id === id)?.label ??
    t('notUpdated')
  const scopeLabel = (project: ContractorProject) =>
    project.scopeName ?? (project.scope ? t(`constructionScopes.${project.scope}`) : t('notUpdated'))
  const scaleOf = (project: ContractorProject) => {
    const floors =
      project.floorCount == null
        ? floorOptions.find((option) => option.id === project.floorOptionId)?.label
        : t('floors', { count: project.floorCount })
    const attic = project.hasAttic === undefined ? null : project.hasAttic ? t('attic') : t('noAttic')
    return [floors ?? (project.floorOptionId ? null : project.scale), attic].filter(Boolean).join(' · ')
  }
  return { typeLabel, scopeLabel, scaleOf }
}

/**
 * Popup "Chi tiết dự án đã thực hiện" (góp ý NT — Review Row #1): KHÔNG còn là
 * ngăn trượt bên phải mà là MODAL LỚN GIỮA MÀN, nền tối mờ (`DialogOverlay` đã
 * lo `bg-black/45 backdrop-blur-sm`), chia HAI CỘT — trái là bộ ảnh có nút
 * chuyển ảnh trước/sau kèm dải ảnh nhỏ, phải là thông tin dự án. Nút "Đóng" và
 * "Mời báo giá" nằm CỐ ĐỊNH ở đáy popup (`DialogFooter` ngoài vùng cuộn) nên
 * không bao giờ bị nội dung che.
 */
function ProjectDetailModal({
  contractor,
  project,
  inviteAction,
  onClose
}: {
  contractor: Contractor
  project: ContractorProject | null
  inviteAction?: React.ReactNode
  onClose: () => void
}) {
  const t = useTranslations('contractors.firm.projects.detail')
  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  // Đổi dự án → về ảnh đầu. Mẫu "chỉnh state khi prop đổi" của React (giống
  // `renderedTab` phía trên): đặt lại ngay trong thân hàm, không dùng effect.
  const projectId = project?.id
  const [renderedProjectId, setRenderedProjectId] = useState(projectId)
  if (projectId !== renderedProjectId) {
    setRenderedProjectId(projectId)
    setActiveIndex(0)
  }

  const { typeLabel, scopeLabel, scaleOf } = useProjectLabels(project ? [project] : [])
  const projectType = project?.buildingTypeId ? typeLabel(project.buildingTypeId) : t('notUpdated')
  const constructionScope = project ? scopeLabel(project) : t('notUpdated')
  const contractorRole = project?.contractorRole ? t(`roles.${project.contractorRole}`) : t('roles.contractor')
  const dimensions = [
    project?.dimensions,
    project?.areaM2 ? t('area', { area: project.areaM2 }) : null,
    project ? scaleOf(project) : null
  ]
    .filter(Boolean)
    .join(' · ')
  const constructionPeriod =
    project?.constructionMonths && project.constructionStartedAt && project.constructionEndedAt
      ? t('constructionPeriodValue', {
          months: project.constructionMonths,
          from: formatDate(project.constructionStartedAt, locale, { month: '2-digit', year: 'numeric' }),
          to: formatDate(project.constructionEndedAt, locale, { month: '2-digit', year: 'numeric' })
        })
      : t('completedYear', { year: project?.year ?? '' })

  // Modal lớn hơn → dùng cả bộ ảnh làm carousel, không cắt còn 3 như ngăn trượt cũ.
  const gallery: string[] = project
    ? [project.imageUrl, ...(project.galleryUrls ?? [])].filter((url): url is string => Boolean(url))
    : []
  const safeIndex = gallery.length ? Math.min(activeIndex, gallery.length - 1) : 0
  const activeImage = gallery[safeIndex]
  const goPrev = () => setActiveIndex((safeIndex - 1 + gallery.length) % gallery.length)
  const goNext = () => setActiveIndex((safeIndex + 1) % gallery.length)

  // "Mời báo giá" phải đóng modal trước khi điều hướng/mở bộ chọn dự án — nếu
  // không, khi quay lại màn này modal vẫn treo mở trên nền.
  const footerInviteAction = isValidElement<{
    onNavigate?: () => void
    onOpenPicker?: () => void
  }>(inviteAction)
    ? cloneElement(inviteAction, {
        onNavigate: () => {
          onClose()
          inviteAction.props.onNavigate?.()
        },
        onOpenPicker: () => {
          onClose()
          inviteAction.props.onOpenPicker?.()
        }
      })
    : inviteAction

  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className='flex max-h-[calc(100vh-2rem)] w-full max-w-[62rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[62rem]'
      >
        {project ? (
          <>
            <div className='flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[1.08fr_minmax(0,1fr)] lg:overflow-hidden'>
              {/* Cột trái — bộ ảnh + carousel + dải ảnh nhỏ. */}
              <div className='bg-muted/25 flex flex-col gap-3 border-b p-4 lg:overflow-hidden lg:border-r lg:border-b-0'>
                <div className='bg-muted/50 relative aspect-[4/3] w-full overflow-hidden rounded-xl border lg:aspect-auto lg:min-h-0 lg:flex-1'>
                  <AnimatePresence mode='wait' initial={false}>
                    {activeImage ? (
                      <motion.div
                        key={activeImage}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.22 }}
                        className='absolute inset-0'
                      >
                        <RevealPhoto
                          src={activeImage}
                          alt={t('imageAlt', { project: project.name, index: safeIndex + 1 })}
                          className='size-full'
                          sizes='(max-width: 1024px) 92vw, 560px'
                        />
                      </motion.div>
                    ) : (
                      <div className='flex size-full items-center justify-center'>
                        <ImageIcon className='text-muted-foreground/55 size-8' />
                      </div>
                    )}
                  </AnimatePresence>

                  {gallery.length > 1 ? (
                    <>
                      <button
                        type='button'
                        onClick={goPrev}
                        aria-label={t('prevImage')}
                        className='absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                      >
                        <ChevronLeft className='size-5' />
                      </button>
                      <button
                        type='button'
                        onClick={goNext}
                        aria-label={t('nextImage')}
                        className='absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                      >
                        <ChevronRight className='size-5' />
                      </button>
                      <span className='absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur-sm'>
                        {safeIndex + 1}/{gallery.length}
                      </span>
                    </>
                  ) : null}
                </div>

                {gallery.length > 1 ? (
                  <div className='flex gap-2 overflow-x-auto pb-1'>
                    {gallery.map((imageUrl, index) => (
                      <button
                        key={imageUrl}
                        type='button'
                        onClick={() => setActiveIndex(index)}
                        aria-label={t('selectImage', { index: index + 1 })}
                        aria-current={index === safeIndex}
                        className={cn(
                          'relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                          index === safeIndex ? 'border-primary ring-primary/40 ring-2' : 'opacity-70 hover:opacity-100'
                        )}
                      >
                        <RevealPhoto
                          src={imageUrl}
                          alt={t('imageAlt', { project: project.name, index: index + 1 })}
                          className='size-full'
                          sizes='96px'
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Cột phải — thông tin dự án (cuộn riêng ở desktop). */}
              <div className='flex min-h-0 flex-col lg:overflow-hidden'>
                <DialogHeader className='border-b px-5 py-4 pr-12 text-left'>
                  <DialogTitle className='text-base'>{project.name}</DialogTitle>
                  <DialogDescription className='sr-only'>
                    {t('description', { contractor: contractor.name })}
                  </DialogDescription>
                  <DialogClose asChild>
                    <button
                      type='button'
                      aria-label={t('close')}
                      className='ring-offset-background focus:ring-ring absolute top-4 right-4 flex size-8 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden'
                    >
                      <X className='size-4' />
                    </button>
                  </DialogClose>
                </DialogHeader>

                <div className='min-h-0 flex-1 px-5 py-4 lg:overflow-y-auto'>
                  <div className='flex flex-wrap gap-2'>
                    <span className='bg-muted rounded-md px-2.5 py-1 text-xs'>{projectType}</span>
                    <span className='bg-muted rounded-md px-2.5 py-1 text-xs'>{constructionScope}</span>
                    {project.verified ? (
                      <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium'>
                        <CircleCheck className='size-3.5' />
                        {t('verifiedBadge')}
                      </span>
                    ) : null}
                  </div>

                  <motion.section
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.08 }}
                    className='mt-5'
                  >
                    <h3 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                      {t('title')}
                    </h3>
                    <dl className='mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm'>
                      <dt className='text-muted-foreground'>{t('projectType')}</dt>
                      <dd className='font-medium'>{projectType}</dd>
                      <dt className='text-muted-foreground'>{t('scale')}</dt>
                      <dd className='font-medium'>{dimensions || t('notUpdated')}</dd>
                      <dt className='text-muted-foreground'>{t('constructionScope')}</dt>
                      <dd className='font-medium'>{constructionScope}</dd>
                      <dt className='text-muted-foreground'>{t('role')}</dt>
                      <dd className='font-medium'>{contractorRole}</dd>
                      <dt className='text-muted-foreground'>{t('constructionPeriod')}</dt>
                      <dd className='font-medium'>{constructionPeriod}</dd>
                      <dt className='text-muted-foreground'>{t('location')}</dt>
                      <dd className='font-medium'>{project.location ?? t('notUpdated')}</dd>
                      <dt className='text-muted-foreground'>{t('mainItems')}</dt>
                      <dd className='font-medium text-pretty'>{project.mainItems ?? t('mainItemsFallback')}</dd>
                    </dl>
                  </motion.section>

                  {project.verified ? (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.13 }}
                      className='border-primary/25 bg-primary/5 mt-5 flex items-start gap-3 rounded-xl border p-3.5'
                    >
                      <ShieldCheck className='text-primary mt-0.5 size-5 shrink-0' />
                      <div>
                        <p className='text-sm font-semibold'>
                          {t('verifiedTitle', {
                            date: project.verifiedAt
                              ? formatDisplayDate(project.verifiedAt, locale)
                              : t('verifiedDateFallback')
                          })}
                        </p>
                        <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>{t('verifiedBody')}</p>
                      </div>
                    </motion.div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* `sm:justify-between` để đè `sm:justify-end` mặc định của DialogFooter
                — nếu không, ở desktop cả nhận diện lẫn hai nút bị dồn về bên phải,
                nửa trái trống. Cần dàn hai mép: nhận diện trái, nút phải. */}
            <DialogFooter className='flex-row items-center justify-between gap-3 border-t bg-background px-5 py-3 sm:justify-between'>
              {/* Nhận diện nhà thầu ở đầu thanh (bên trái): logo + tên + dòng nhỏ
                  loại hình (`contractor.kind` = "Nhà thầu xây dựng"). Tên co lại
                  khi hẹp để không đẩy hai nút ra ngoài. */}
              <div className='flex min-w-0 items-center gap-2.5'>
                <ContractorLogo
                  contractor={contractor}
                  className='size-9 shrink-0 rounded-lg max-md:text-xs text-[10px]'
                />
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>{contractor.name}</p>
                  <p className='text-muted-foreground truncate text-xs'>{contractor.kind}</p>
                </div>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                <DialogClose asChild>
                  <Button type='button' variant='outline' size='sm' className='hover:bg-muted/80'>
                    {t('close')}
                  </Button>
                </DialogClose>
                {footerInviteAction ? (
                  <div className='min-w-36 [&>*]:w-full [&>*]:transition-[filter] [&>*]:hover:brightness-105'>
                    {footerInviteAction}
                  </div>
                ) : null}
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Khối "Năng lực & xác minh" — bốn mục đã được SAVICO đối chiếu. */
function LegalChecks({ contractor, detailed = false }: { contractor: Contractor; detailed?: boolean }) {
  const t = useTranslations('contractors.firm')
  const tLegal = useTranslations('contractors.firm.legal')
  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false)
  const checks = [...contractor.legalChecks]
  const fallbackChecks = [
    t('team', { count: contractor.teamSize }),
    t('warranty', { months: contractor.warrantyMonths })
  ]

  for (const fallback of fallbackChecks) {
    if (checks.length >= 4) break
    if (!checks.includes(fallback)) checks.push(fallback)
  }

  if (detailed) {
    const legal = contractor.legalProfile
    const verified = legal?.registrationStatus !== 'pending'
    const rows = [
      { key: 'legalName', label: tLegal('fields.legalName'), value: legal?.legalName ?? contractor.name },
      {
        key: 'taxCode',
        label: tLegal('fields.taxCode'),
        value: (
          <span className='inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='decoration-primary/45 cursor-help underline decoration-dotted underline-offset-4'>
                  {legal?.taxCodeMasked ?? tLegal('updating')}
                </span>
              </TooltipTrigger>
              <TooltipContent side='top' sideOffset={7} className='max-w-64'>
                {tLegal('fields.taxCodeHint')}
              </TooltipContent>
            </Tooltip>
            <span className='text-muted-foreground max-md:text-xs text-[11px] font-normal'>
              {tLegal('fields.taxCodeHint')}
            </span>
          </span>
        )
      },
      {
        key: 'establishedAt',
        label: tLegal('fields.establishedAt'),
        value: legal
          ? tLegal('establishedValue', {
              date: formatDisplayDate(legal.establishedAt, locale),
              years: legal.operationYears
            })
          : tLegal('updating')
      },
      {
        key: 'representative',
        label: tLegal('fields.representative'),
        value: legal ? `${legal.representative} · ${legal.representativeTitle}` : tLegal('updating')
      },
      {
        key: 'address',
        label: tLegal('fields.registeredAddress'),
        value: legal?.registeredAddress ?? contractor.officeAddress
      },
      { key: 'business', label: tLegal('fields.primaryBusiness'), value: legal?.primaryBusiness ?? contractor.kind },
      {
        key: 'workforce',
        label: tLegal('fields.capacity'),
        value: legal?.workforce ?? t('team', { count: contractor.teamSize })
      }
    ]

    return (
      <div className='space-y-5'>
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.1, ease: revealEase }}
        >
          <div className='mb-3 flex flex-wrap items-center gap-2'>
            <h2 className='text-base font-semibold'>{tLegal('identity.title')}</h2>
            <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1 rounded-md px-2 py-1 max-md:text-xs text-[11px] font-medium'>
              <CircleCheck className='size-3.5' />
              {verified ? tLegal('identity.active') : tLegal('identity.pending')}
            </span>
          </div>
          <dl className='bg-card grid gap-x-6 gap-y-3 rounded-2xl border p-4 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:p-5'>
            {rows.map((row) => (
              <div key={row.key} className='contents'>
                <dt className='text-muted-foreground text-xs sm:py-0.5'>{row.label}</dt>
                <dd className='font-medium text-pretty'>{row.value}</dd>
              </div>
            ))}
          </dl>
        </motion.section>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.2, ease: revealEase }}
        >
          <div className='mb-3 flex flex-wrap items-center gap-2'>
            <h2 className='text-base font-semibold'>{tLegal('license.title')}</h2>
            <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1 rounded-md px-2 py-1 max-md:text-xs text-[11px] font-medium'>
              <CircleCheck className='size-3.5' />
              {verified ? tLegal('license.verified') : tLegal('identity.pending')}
            </span>
          </div>
          <div className='bg-card hover:bg-primary/[0.035] flex flex-col gap-4 rounded-2xl border p-4 transition-colors duration-200 sm:flex-row sm:items-center'>
            <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
              <FileText className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h3 className='text-sm font-semibold'>{tLegal('license.documentTitle')}</h3>
              <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                <span className='block'>{tLegal('license.documentMatch')}</span>
                <span className='block'>{tLegal('license.issuer')}</span>
              </p>
            </div>
            <dl className='grid shrink-0 grid-cols-2 gap-x-8 text-xs sm:min-w-64'>
              <div>
                <dt className='text-muted-foreground'>{tLegal('license.number')}</dt>
                <dd className='mt-1 font-medium'>{legal?.registrationNumberMasked ?? tLegal('updating')}</dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>{tLegal('license.issuedAt')}</dt>
                <dd className='mt-1 font-medium whitespace-nowrap'>
                  {legal
                    ? tLegal('license.effectiveValue', {
                        date: formatDisplayDate(legal.registrationIssuedAt, locale)
                      })
                    : tLegal('updating')}
                </dd>
              </div>
            </dl>
          </div>
        </motion.section>
      </div>
    )
  }

  return (
    <motion.section
      variants={revealItemVariants}
      initial='hidden'
      whileInView='show'
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={() => setHasEnteredViewport(true)}
      className='bg-card rounded-2xl border p-4'
    >
      <h2 className='text-base font-semibold'>{t('legalTitle')}</h2>
      <motion.ul
        variants={revealContainerVariants}
        className='mt-3 grid gap-x-[3%] gap-y-3 sm:grid-cols-2 lg:grid-cols-4'
      >
        {checks.map((check, index) => (
          <motion.li
            variants={revealItemVariants}
            key={check}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
            className='flex items-start gap-2.5 text-sm'
          >
            <DrawnCircleCheck className='mt-0.5' delay={index * 0.12} active={hasEnteredViewport} />
            <span className='text-muted-foreground text-pretty'>{check}</span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  )
}

/**
 * Tab Hợp tác SAVICO (S14).
 *
 * Hình S14 vẽ một khung xem tài liệu đầy đủ: dải thumbnail từng trang bên
 * trái, khung trang ở giữa với thanh công cụ (số trang, thu/phóng, toàn màn
 * hình) ở đáy, cột siêu dữ liệu bên phải. Tỉ lệ ba cột 10,3% / 57,8% / 27,9%
 * đo từ ảnh đó.
 *
 * CHỖ CHỜ ASSET: bản scan thật do đội vận hành tải lên (`partnership.scanUrl`).
 * Chưa có thì khung xem và dải thumbnail để NÉT ĐỨT, thanh công cụ và hai nút
 * thao tác khóa lại — dựng khung sẵn để khi có tệp là hiện, chứ không vẽ một
 * trang hợp đồng giả cho đẹp ảnh chụp màn hình.
 *
 * Lưu ý nội dung: hợp đồng nguyên bản có chữ ký và con dấu của hai pháp nhân,
 * nên thứ hiển thị ở đây phải là bản ĐÃ CHE các nội dung bảo mật.
 */
function PartnershipTab({ contractor }: { contractor: Contractor }) {
  const t = useTranslations('contractors.firm.partnership')
  const locale = useLocale() as Locale
  const { partnership } = contractor

  const hasScan = Boolean(partnership.scanUrl)
  const pages = Array.from({ length: partnership.pageCount }, (_, index) => index + 1)

  const rows = [
    { key: 'code', icon: FileText, label: t('code'), value: partnership.contractCode },
    {
      key: 'signedAt',
      icon: CalendarDays,
      label: t('signedAt'),
      // Nhà thầu chưa ký hợp tác thì ngày ký rỗng — `Intl` ném RangeError nếu định dạng.
      value: partnership.signedAt ? formatDisplayDate(partnership.signedAt, locale) : '—'
    },
    { key: 'pages', icon: FileText, label: t('pages'), value: String(partnership.pageCount) },
    { key: 'state', icon: CircleCheck, label: t('state'), value: t('stateVerified'), highlight: true }
  ]

  return (
    <div className='space-y-5'>
      <section className='bg-card rounded-2xl border p-4'>
        <h3 className='text-base font-semibold'>{t('scanTitle')}</h3>

        <div className='mt-3 grid gap-x-[2%] gap-y-4 lg:grid-cols-[10.3%_57.8%_minmax(0,1fr)]'>
          {/* Dải thumbnail: ô trang bên trái, số trang bên phải. */}
          <ol className='bg-muted/40 flex gap-2 overflow-x-auto rounded-xl p-2 lg:flex-col lg:self-start lg:overflow-x-visible'>
            {pages.map((page) => (
              <li key={page} className='flex shrink-0 items-center gap-2 lg:shrink'>
                <button
                  type='button'
                  disabled={!hasScan}
                  aria-label={t('goToPage', { page })}
                  className={cn(
                    'bg-card aspect-3/4 w-12 rounded-md border lg:w-[57%]',
                    page === 1 ? 'border-primary' : 'border-dashed',
                    hasScan ? 'hover:border-primary' : 'cursor-default'
                  )}
                />
                <span className='text-muted-foreground text-xs'>{page}</span>
              </li>
            ))}
          </ol>

          {/* Khung xem: vùng trang + thanh công cụ dưới đáy. */}
          <div className='bg-muted/40 flex aspect-315/268 min-h-64 flex-col overflow-hidden rounded-xl'>
            <div className='flex min-h-0 flex-1 items-center justify-center p-4'>
              <div className='bg-card flex aspect-3/4 h-full max-w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center'>
                <FileCheck2 className='text-muted-foreground/60 size-9' strokeWidth={1.25} />
                <p className='text-muted-foreground max-w-xs text-xs text-pretty'>
                  {hasScan ? t('privacyNote') : t('unavailable')}
                </p>
              </div>
            </div>

            <div className='text-muted-foreground flex items-center justify-between gap-3 border-t px-3 py-2 text-xs'>
              <span>{t('page', { current: 1, total: partnership.pageCount })}</span>
              <div className='flex items-center gap-1'>
                <ViewerControl icon={Minus} label={t('zoomOut')} disabled={!hasScan} />
                <ViewerControl icon={Search} label={t('zoomFit')} disabled={!hasScan} />
                <ViewerControl icon={Plus} label={t('zoomIn')} disabled={!hasScan} />
                <ViewerControl icon={Maximize2} label={t('fullscreen')} disabled={!hasScan} />
              </div>
            </div>
          </div>

          {/* Cột siêu dữ liệu đã xác minh. */}
          <div className='min-w-0'>
            <p className='text-muted-foreground text-sm'>{t('agreement')}</p>
            <p className='mt-1 text-base font-semibold text-pretty'>{t('parties', { name: contractor.name })}</p>

            <dl className='mt-4 space-y-3 text-sm'>
              {rows.map((row) => (
                <div key={row.key} className='flex items-center gap-3'>
                  <dt className='text-muted-foreground flex min-w-0 flex-1 items-center gap-2'>
                    <row.icon
                      aria-hidden
                      className={cn('size-4 shrink-0', row.highlight ? 'text-primary' : 'text-muted-foreground')}
                    />
                    <span className='truncate'>{row.label}</span>
                  </dt>
                  <dd className={cn('shrink-0 font-medium', row.highlight && 'text-primary-strong')}>{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className='mt-4 space-y-2.5'>
              <Button className='h-11 w-full' disabled={!hasScan}>
                <Maximize2 className='size-4' />
                {t('fullscreen')}
              </Button>
              <Button
                variant='outline'
                className='border-primary/50 text-primary-strong h-11 w-full'
                disabled={!hasScan}
              >
                <Download className='size-4' />
                {t('download')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/** Một nút nhỏ trên thanh công cụ của khung xem. */
function ViewerControl({ icon: Icon, label, disabled }: { icon: typeof Plus; label: string; disabled: boolean }) {
  return (
    <button
      type='button'
      disabled={disabled}
      aria-label={label}
      title={label}
      className='hover:bg-card flex size-7 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50'
    >
      <Icon className='size-3.5' />
    </button>
  )
}
