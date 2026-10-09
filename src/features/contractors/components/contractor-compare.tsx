'use client'

import { ArrowRight, BadgeCheck, Check, Circle, FileText, Info, Star, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { EmptyState, revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { Switch } from '@/shared/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { CONTRACTOR_PREVIEW_ID, contractorInviteRoute, contractorMatchesRoute } from '@/shared/constants/routes'
import { usePastElement } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatNumber } from '@/shared/utils'
import { COMPARE_CRITERIA, MAX_INVITATIONS, MIN_COMPARE } from '../constants/contractors.constants'
import { useBrief } from '../hooks/use-brief'
import { useContractors, useContractorsByIds } from '../hooks/use-contractors'
import { useInvitations } from '../hooks/use-invitations'
import {
  betterByCriterion,
  compareLegalVerified,
  compareNumber,
  mergeForCompare,
  type CompareNumberCriterion
} from '../services/contractor-compare.service'
import { isInvited, withDistanceFrom } from '../services/contractor-list.service'
import { useContractorsStore } from '../store/contractors.store'
import type { Contractor } from '../types/contractor.types'
import { ContractorLogo } from './contractor-logo'
import { useProjectPickerStore } from '../store/project-picker.store'
import { ProjectContextBar } from './project-context-bar'
import { ProjectPickerDialog } from './project-picker-dialog'

/** Neo cho `usePastElement` — cuộn qua thì hàng đầu bảng dính trên + đổ bóng (mục 3). */
const TABLE_TOP_ANCHOR_ID = 'compare-table-anchor'

/** Vòng chọn luôn khép kín; chỉ dấu tick bên trong chạy nét để không hở chu vi. */
function SelectedCheckIcon() {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scale: 0.65 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className='flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current'
    >
      <Check
        className='size-2.5 animate-[firm-check-draw_.45s_ease-out_backwards] motion-reduce:animate-none'
        strokeWidth={3}
      />
    </motion.span>
  )
}

/** Các tiêu chí so được hơn-kém bằng số (mục 4); `legal` là có/không nên không nằm đây. */
const NUMERIC_CRITERIA = [
  'rating',
  'similarProjects',
  'distance',
  'surveyTime',
  'warranty'
] as const satisfies readonly CompareNumberCriterion[]

interface ContractorCompareProps {
  projectId: string
}

/**
 * So sánh hồ sơ nhà thầu (S15).
 *
 * R1: cho chọn tối đa 3 nhà thầu để mời — bản demo chỉ cho chọn 1, ở đây là
 * chọn nhiều. R2: bảng KHÔNG có dòng nào về giá; dòng dẫn ngay dưới tiêu đề nói
 * rõ đây là so sánh năng lực.
 *
 * Bảng đặt trong khung `overflow-x-auto` với cột tiêu chí `sticky left-0`: ba
 * cột nhà thầu không co thêm được nữa thì bảng cuộn ngang, người đọc vẫn thấy
 * mình đang ở dòng tiêu chí nào.
 */
export function ContractorCompare({ projectId }: ContractorCompareProps) {
  const t = useTranslations('contractors.compare')
  const tCommon = useTranslations('contractors.common')
  const tFirm = useTranslations('contractors.firm')
  const locale = useLocale() as Locale
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const openPicker = useProjectPickerStore((s) => s.openPicker)
  /** Xem thử — chưa gắn hồ sơ dự án nào (xem `CONTRACTOR_PREVIEW_ID`). */
  const preview = projectId === CONTRACTOR_PREVIEW_ID

  const { data: brief } = useBrief(projectId)
  const { data: contractors, isPending: listPending } = useContractors(projectId)
  const { data: invitations, remaining } = useInvitations(projectId)

  const compareIds = useContractorsStore((s) => s.compareIds)
  const toggleCompare = useContractorsStore((s) => s.toggleCompare)
  const startInviteQueue = useContractorsStore((s) => s.startInviteQueue)
  // Bảng so sánh lấy hồ sơ THEO TỪNG MÃ đã tick, không dựa vào danh sách đề xuất: nhà thầu tick từ hồ sơ riêng hoặc nằm
  // ngoài danh sách đang hiện vẫn phải có cột.
  const { contractors: details, isPending: detailsPending, failedIds, refetchFailed } = useContractorsByIds(compareIds)

  const [picked, setPicked] = useState<string[]>([])
  /** Làm nổi ô giá trị tốt hơn — công tắc tắt/mở (mục 4). */
  const [highlightBetter, setHighlightBetter] = useState(true)
  /** Rê cả hàng/cột để tô sáng (mục 4). */
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  /** Chọn vượt lượt còn lại → ô rung + thông báo (mục 5). */
  const [exceedShakeId, setExceedShakeId] = useState<string | null>(null)
  /** M06 dạng bảng bên, không rời khỏi bảng so sánh phía sau. */
  const [profileContractor, setProfileContractor] = useState<Contractor | null>(null)
  const [leavingBack, setLeavingBack] = useState(false)

  /** Nút "Mời" thở một nhịp ngay khi vừa có nhà thầu đầu tiên được chọn (mục 6). */
  const wasAnyPickedRef = useRef(false)
  const [inviteBreathe, setInviteBreathe] = useState(false)
  useEffect(() => {
    if (picked.length > 0 && !wasAnyPickedRef.current) {
      setInviteBreathe(true)
      const timer = window.setTimeout(() => setInviteBreathe(false), 500)
      wasAnyPickedRef.current = true
      return () => window.clearTimeout(timer)
    }
    wasAnyPickedRef.current = picked.length > 0
  }, [picked.length])

  const isPending = listPending || detailsPending
  const site = brief?.constructionSite
  const siteCoords = site ? { latitude: site.latitude, longitude: site.longitude } : undefined

  /* `compareIds` giữ thứ tự người dùng thêm. Cột mới vì thế luôn vào từ mép phải. Hồ sơ chi tiết ghép với số liệu theo dự án
     (dự án tương tự, khoảng cách, giờ khảo sát) của danh sách đề xuất khi nhà thầu có trong đó. */
  const rows = compareIds.flatMap((id, index) => {
    const merged = mergeForCompare(
      details[index],
      (contractors ?? []).find((contractor) => contractor.id === id)
    )
    return merged ? [withDistanceFrom(merged, siteCoords)] : []
  })
  const unavailableCount = compareIds.length - rows.length
  const room = remaining

  const togglePick = (contractorId: string) =>
    setPicked((current) => {
      if (current.includes(contractorId)) return current.filter((id) => id !== contractorId)
      if (isInvited(invitations ?? [], contractorId)) return current
      if (current.length >= room) {
        setExceedShakeId(contractorId)
        window.setTimeout(() => setExceedShakeId(null), 450)
        return current
      }
      return [...current, contractorId]
    })

  const removeColumn = (contractorId: string) => {
    setPicked((current) => current.filter((id) => id !== contractorId))
    toggleCompare(contractorId)
  }

  /** Giá trị tốt hơn theo từng tiêu chí có thể so bằng số (mục 4); ô chưa cập nhật không tham gia. */
  const betterIdByCriterion = betterByCriterion(rows, NUMERIC_CRITERIA)

  /** Mời hàng loạt: xếp hàng đợi rồi mở màn chọn lịch của nhà thầu đầu tiên (S16). */
  const invitePicked = () => {
    // Xem thử: chưa có dự án để gắn lời mời — mở hộp thoại chọn dự án trước.
    if (preview) {
      openPicker()
      return
    }
    if (picked.length === 0) return
    const eligible = picked.filter((id) => !isInvited(invitations ?? [], id)).slice(0, room)
    startInviteQueue(eligible, projectId)
    const first = eligible[0]
    if (first) router.push(contractorInviteRoute(projectId, first))
  }

  const pickedNames = rows.filter((c) => picked.includes(c.id)).map((c) => c.name)

  const colWidth = rows.length > 0 ? `${(100 - 19) / rows.length}%` : undefined
  const tableTopPast = usePastElement(TABLE_TOP_ANCHOR_ID)

  const goBack = () => {
    if (reduceMotion) {
      router.push(contractorMatchesRoute(projectId))
      return
    }
    setLeavingBack(true)
    window.setTimeout(() => router.push(contractorMatchesRoute(projectId)), 180)
  }

  return (
    <motion.div
      animate={leavingBack ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: revealEase }}
      className='mx-auto w-full max-w-[90rem] px-4 lg:px-8 space-y-5 py-5'
    >
      {preview ? null : <ProjectContextBar brief={brief} />}

      {/* Liên kết quay lại nằm sát mép trái, tiêu đề canh giữa TRANG chứ không
          canh giữa phần còn lại — nên nó được nhấc ra khỏi luồng ở màn rộng. */}
      <div className='relative space-y-3 lg:space-y-0'>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <button
            type='button'
            onClick={goBack}
            data-back-navigation
            className='text-foreground inline-flex items-center gap-2 text-sm font-medium lg:absolute lg:top-1 lg:left-0'
          >
            ← {tCommon('backToList')}
          </button>
        </motion.div>

        <motion.header initial='hidden' animate='show' className='space-y-1 text-center'>
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.35, delay: 0.08, ease: revealEase }}
            className='text-2xl font-semibold tracking-tight sm:text-3xl'
          >
            {t('title')}
          </motion.h1>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.35, delay: 0.16, ease: revealEase }}
            className='text-muted-foreground text-pretty'
          >
            {t('subtitle')}
          </motion.p>
        </motion.header>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.26 }}
        className='text-info-foreground bg-info-soft mx-auto flex w-fit max-w-3xl items-start gap-2 rounded-xl px-4 py-3 text-sm'
      >
        <Info className='text-info mt-0.5 size-4 shrink-0' />
        <AnimatePresence mode='wait'>
          <motion.span
            key={rows.length === 1 ? 'one' : 'lead'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='text-pretty'
          >
            {rows.length === 1 ? t('tooFewInline', { count: MIN_COMPARE - rows.length }) : t('lead')}
          </motion.span>
        </AnimatePresence>
      </motion.p>

      {!isPending && unavailableCount > 0 ? (
        <div
          role='alert'
          className='bg-muted/50 mx-auto flex w-fit max-w-3xl flex-wrap items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm'
        >
          <span>{t('loadFailed', { count: unavailableCount })}</span>
          {failedIds.length > 0 ? (
            <Button size='sm' variant='outline' onClick={() => void refetchFailed()}>
              {t('retry')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {isPending ? (
        <Skeleton className='h-96 rounded-2xl' />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('tooFew', { min: MIN_COMPARE })}
          action={
            <Button data-back-navigation variant='outline' onClick={goBack}>
              {t('back')}
            </Button>
          }
        />
      ) : (
        <>
          <div id={TABLE_TOP_ANCHOR_ID} className='h-px' aria-hidden />
          <div className='contractor-compare-scroll bg-card overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border md:overflow-visible'>
            <div className='relative min-w-[820px] md:min-w-[640px]'>
              <table className='contractor-compare-table w-full text-sm'>
                <thead className='sticky top-0 z-20 md:top-16'>
                  <tr
                    className={cn(
                      'bg-card transition-shadow',
                      tableTopPast && 'shadow-[0_4px_10px_-6px_rgba(0,0,0,0.25)]'
                    )}
                  >
                    {/* `rounded-tl-2xl` — mép này KHÔNG được viền cong của khối
                        cha vẽ hộ: khối cha chỉ có `border` (không `overflow-
                        hidden`, vì `sticky` cần thoát ra ngoài để dính đúng),
                        nên ô vuông này phải tự bo đúng góc, không thì lộ khe
                        trắng giữa viền cong và góc vuông của ô. */}
                    <th className='bg-card sticky left-0 z-30 w-[19%] rounded-tl-2xl border-r border-b p-4 text-left align-middle font-medium whitespace-nowrap'>
                      {t('criterion')}
                    </th>
                    <AnimatePresence initial={false}>
                      {rows.map((contractor, index) => (
                        <motion.th
                          layout
                          key={contractor.id}
                          style={{ width: colWidth }}
                          initial={reduceMotion ? false : { opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, scaleX: 0.72 }}
                          transition={{ duration: 0.32, delay: index * 0.07, ease: revealEase }}
                          onMouseEnter={() => setHoveredColumn(contractor.id)}
                          onMouseLeave={() =>
                            setHoveredColumn((current) => (current === contractor.id ? null : current))
                          }
                          className={cn(
                            'group relative border-b border-l p-4 text-left align-middle font-normal transition-colors',
                            // Cột cuối bo góc trên-phải, cùng lý do với ô "Tiêu chí" ở trên.
                            index === rows.length - 1 && 'rounded-tr-2xl',
                            picked.includes(contractor.id)
                              ? 'bg-accent/40'
                              : hoveredColumn === contractor.id && 'bg-accent/20'
                          )}
                        >
                          <PickedFrame
                            show={picked.includes(contractor.id)}
                            edge='top'
                            last={index === rows.length - 1}
                          />
                          {/* Rê tiêu đề cột → nút × hiện (mục 3). */}
                          <button
                            type='button'
                            aria-label={t('removeColumn')}
                            onClick={() => removeColumn(contractor.id)}
                            className='text-muted-foreground hover:text-destructive hover:bg-muted absolute top-2 right-2 flex size-6 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100'
                          >
                            <X className='size-3.5' />
                          </button>

                          <motion.div key={contractor.id} layout className='flex items-center gap-3'>
                            <motion.div
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', bounce: 0.5, duration: 0.4, delay: index * 0.06 + 0.1 }}
                            >
                              <ContractorLogo contractor={contractor} className='size-14 shrink-0' />
                            </motion.div>
                            <div className='min-w-0'>
                              <span className='flex items-center gap-1.5 text-sm font-semibold'>
                                <span className='truncate'>{contractor.name}</span>
                                {contractor.verified ? <BadgeCheck className='text-primary size-4 shrink-0' /> : null}
                              </span>
                              <span className='mt-1 flex items-center gap-1.5 text-sm'>
                                {compareNumber('rating', contractor) === null ? (
                                  <span className='text-muted-foreground'>{t('notUpdated')}</span>
                                ) : (
                                  <>
                                    <Star className='text-warning size-4 shrink-0 fill-current' />
                                    {formatNumber(contractor.rating, locale, { minimumFractionDigits: 1 })}/5
                                  </>
                                )}
                              </span>
                              <Button
                                size='sm'
                                variant='outline'
                                className='border-primary/50 text-primary-strong mt-2'
                                onClick={() => setProfileContractor(contractor)}
                              >
                                <FileText className='size-4' />
                                {tCommon('viewProfile')}
                              </Button>
                            </div>
                          </motion.div>
                        </motion.th>
                      ))}
                    </AnimatePresence>
                  </tr>
                </thead>

                <tbody>
                  {COMPARE_CRITERIA.map((criterion, rowIndex) => {
                    const betterId = highlightBetter ? betterIdByCriterion.get(criterion) : undefined
                    return (
                      <motion.tr
                        key={criterion}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: rowIndex * 0.04 }}
                        onMouseEnter={() => setHoveredRow(criterion)}
                        onMouseLeave={() => setHoveredRow((current) => (current === criterion ? null : current))}
                        className={cn('transition-colors', hoveredRow === criterion && 'bg-muted/40')}
                      >
                        <th className='bg-card sticky left-0 z-10 border-r p-3.5 text-left text-sm font-normal whitespace-nowrap'>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='cursor-help underline decoration-dotted underline-offset-4'>
                                {t(`criteria.${criterion}`)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{t(`criteriaHint.${criterion}`)}</TooltipContent>
                          </Tooltip>
                        </th>
                        <AnimatePresence initial={false}>
                          {rows.map((contractor) => {
                            const isBetter = betterId === contractor.id
                            return (
                              <motion.td
                                layout
                                key={contractor.id}
                                initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, scaleX: 0.72 }}
                                transition={{ duration: 0.28, ease: revealEase }}
                                className={cn(
                                  'relative border-l p-3.5 text-center transition-colors',
                                  hoveredColumn === contractor.id && 'bg-accent/20'
                                )}
                              >
                                <PickedFrame
                                  show={picked.includes(contractor.id)}
                                  last={contractor.id === rows[rows.length - 1]?.id}
                                />
                                <span className='relative inline-flex items-center gap-2 rounded-lg px-2 py-1'>
                                  <AnimatePresence>
                                    {isBetter ? (
                                      <motion.span
                                        aria-hidden
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, transition: { duration: 0.18, delay: 0 } }}
                                        transition={{ duration: 0.25, delay: 0.58 + rowIndex * 0.07 }}
                                        className='bg-accent/60 absolute inset-0 rounded-[inherit]'
                                      />
                                    ) : null}
                                  </AnimatePresence>
                                  <span className='relative z-1'>
                                    <CriterionValue criterion={criterion} contractor={contractor} locale={locale} />
                                  </span>
                                  <AnimatePresence>
                                    {isBetter ? (
                                      <motion.span
                                        initial={{ opacity: 0, scale: 0.7 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.18, delay: 0 } }}
                                        transition={{
                                          duration: 0.25,
                                          delay: highlightBetter ? 0.62 + rowIndex * 0.07 : 0
                                        }}
                                        className='bg-primary text-primary-foreground relative z-1 rounded-full px-1.5 py-0.5 max-md:text-xs text-[10px] font-semibold whitespace-nowrap'
                                      >
                                        {t('betterBadge')}
                                      </motion.span>
                                    ) : null}
                                  </AnimatePresence>
                                </span>
                              </motion.td>
                            )
                          })}
                        </AnimatePresence>
                      </motion.tr>
                    )
                  })}

                  <tr>
                    {/* Hai góc dưới cùng lý do với hai góc trên: tự bo vì khối
                        cha không clip nội dung theo viền cong của nó. */}
                    <th className='bg-card sticky left-0 z-10 rounded-bl-2xl border-r p-3.5 text-left text-sm font-normal whitespace-nowrap'>
                      {t('select')}
                    </th>
                    <AnimatePresence initial={false}>
                      {rows.map((contractor, index) => {
                        const isPicked = picked.includes(contractor.id)
                        return (
                          <motion.td
                            layout
                            key={contractor.id}
                            initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, scaleX: 0.72 }}
                            transition={{ duration: 0.28, ease: revealEase }}
                            className={cn(
                              'relative border-l p-3.5',
                              index === rows.length - 1 && 'rounded-br-2xl',
                              hoveredColumn === contractor.id && 'bg-accent/20'
                            )}
                          >
                            <PickedFrame show={isPicked} edge='bottom' last={index === rows.length - 1} />
                            {/* Vòng tròn rỗng / vòng tròn có dấu tick: nhìn là biết ô
                            nào đang được chọn mà không phải đọc chữ. Chọn vượt
                            lượt còn lại → rung + thông báo thay vì khoá cứng im
                            lặng (mục 5). */}
                            <motion.span
                              animate={exceedShakeId === contractor.id ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                              transition={{ duration: 0.4 }}
                              className='block'
                            >
                              <Button
                                variant={isPicked ? 'default' : 'outline'}
                                className={cn('h-11 w-full', !isPicked && 'border-primary/50 text-primary-strong')}
                                onClick={() => togglePick(contractor.id)}
                                disabled={isInvited(invitations ?? [], contractor.id)}
                                title={
                                  !isPicked && picked.length >= room ? t('exceedRoom', { count: room }) : undefined
                                }
                              >
                                {isPicked ? <SelectedCheckIcon /> : <Circle className='size-4' />}
                                {isPicked ? t('selected') : t('select')}
                              </Button>
                            </motion.span>
                            <AnimatePresence>
                              {exceedShakeId === contractor.id ? (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className='text-brand-orange mt-1.5 overflow-hidden text-xs'
                                >
                                  {t('exceedRoom', { count: room })}
                                </motion.p>
                              ) : null}
                            </AnimatePresence>
                          </motion.td>
                        )
                      })}
                    </AnimatePresence>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Công tắc làm nổi điểm tốt hơn — bên trên thanh hành động (mục 4). */}
          <div className='flex items-center justify-end gap-2.5 text-sm'>
            <label htmlFor='highlight-better' className='text-muted-foreground'>
              {t('highlightToggle')}
            </label>
            <Switch id='highlight-better' checked={highlightBetter} onCheckedChange={setHighlightBetter} />
          </div>

          {/* Thanh hành động cuối bảng — hai nút theo đúng S15. Trượt lên khi
              LƯỚT TỚI (mục 6), không phải khi trang vừa mount: bảng so sánh
              thường dài hơn khung nhìn nên thanh này còn ở dưới màn lúc trang
              tải xong — `animate` với delay cố định chạy xong trước khi khách
              cuộn tới, tới nơi thì thanh đã đứng yên sẵn, không ai thấy trượt. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, ease: revealEase }}
            className='bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4'
          >
            <div className='min-w-0 text-sm'>
              <p className='font-medium'>
                {t('footerHint', { max: Math.min(MAX_INVITATIONS, room), total: rows.length })}
              </p>
              <AnimatePresence mode='wait'>
                <motion.p
                  key={pickedNames.join(',')}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'mt-0.5 truncate text-xs',
                    pickedNames.length > 0 ? 'text-primary-strong' : 'text-muted-foreground'
                  )}
                >
                  {pickedNames.length > 0
                    ? t('footerSelected', { count: pickedNames.length, names: pickedNames.join(', ') })
                    : t('footerEmpty')}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button data-back-navigation variant='outline' onClick={goBack}>
                {t('back')}
              </Button>
              <motion.span
                animate={{ scale: inviteBreathe ? [1, 1.03, 1] : 1 }}
                transition={{ duration: 0.5 }}
                className='inline-block'
              >
                <Button onClick={invitePicked} disabled={picked.length === 0}>
                  {t('invite')}
                  <ArrowRight className='size-4' />
                </Button>
              </motion.span>
            </div>
          </motion.div>
        </>
      )}

      <Sheet open={Boolean(profileContractor)} onOpenChange={(open) => !open && setProfileContractor(null)}>
        <SheetContent className='w-[94vw] overflow-y-auto sm:max-w-lg'>
          {profileContractor ? (
            <>
              <SheetHeader className='pr-10'>
                <div className='flex items-center gap-3'>
                  <ContractorLogo contractor={profileContractor} className='size-14 shrink-0 rounded-xl' />
                  <div className='min-w-0'>
                    <SheetTitle className='flex items-center gap-1.5'>
                      <span className='truncate'>{profileContractor.name}</span>
                      {profileContractor.verified ? <BadgeCheck className='text-primary size-4 shrink-0' /> : null}
                    </SheetTitle>
                    <SheetDescription className='sr-only'>{profileContractor.name}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className='space-y-5 px-4 pb-6'>
                <dl className='grid grid-cols-2 gap-2 text-sm'>
                  <div className='bg-muted/40 rounded-xl p-3'>
                    <dt className='text-muted-foreground text-xs'>{t('criteria.rating')}</dt>
                    <dd className='mt-1 font-semibold'>
                      {compareNumber('rating', profileContractor) === null ? (
                        <span className='text-muted-foreground font-normal'>{t('notUpdated')}</span>
                      ) : (
                        <>{formatNumber(profileContractor.rating, locale, { minimumFractionDigits: 1 })}/5</>
                      )}
                    </dd>
                  </div>
                  <div className='bg-muted/40 rounded-xl p-3'>
                    <dt className='text-muted-foreground text-xs'>{t('criteria.similarProjects')}</dt>
                    <dd className='mt-1 font-semibold'>
                      {compareNumber('similarProjects', profileContractor) === null ? (
                        <span className='text-muted-foreground font-normal'>{t('notUpdated')}</span>
                      ) : (
                        profileContractor.similarProjects
                      )}
                    </dd>
                  </div>
                </dl>

                <section>
                  <h3 className='font-semibold'>{tFirm('introTitle')}</h3>
                  <p className='text-muted-foreground mt-2 text-sm leading-relaxed text-pretty'>
                    {profileContractor.intro || <span className='italic'>{t('notUpdated')}</span>}
                  </p>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {profileContractor.strengths.map((strength) => (
                      <span key={strength} className='bg-primary/10 text-primary-strong rounded-md px-2.5 py-1 text-xs'>
                        {strength}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className='font-semibold'>{tFirm('featured')}</h3>
                  <ul className='mt-2 space-y-2'>
                    {profileContractor.featuredProjects.map((project) => (
                      <li
                        key={project.id}
                        className='bg-muted/40 flex items-center justify-between gap-3 rounded-xl p-3'
                      >
                        <span className='text-sm font-medium text-pretty'>{project.name}</span>
                        <span className='text-muted-foreground shrink-0 text-xs'>{project.year}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {preview ? <ProjectPickerDialog /> : null}
    </motion.div>
  )
}

/** Một ô giá trị trong bảng so sánh — không tiêu chí nào liên quan tới giá (R2). */
function CriterionValue({
  criterion,
  contractor,
  locale
}: {
  criterion: (typeof COMPARE_CRITERIA)[number]
  contractor: Contractor
  locale: Locale
}) {
  const t = useTranslations('contractors.compare')
  const tCommon = useTranslations('contractors.common')

  // Nhà thầu chưa có dữ liệu cho tiêu chí nào thì ô hiện "Chưa cập nhật", không in số 0 như thể đã khai báo.
  const notUpdated = <span className='text-muted-foreground'>{t('notUpdated')}</span>

  switch (criterion) {
    case 'rating': {
      const value = compareNumber('rating', contractor)
      return value === null ? notUpdated : <span>{formatNumber(value, locale, { minimumFractionDigits: 1 })}/5</span>
    }
    case 'similarProjects': {
      const value = compareNumber('similarProjects', contractor)
      return value === null ? notUpdated : <span>{value}</span>
    }
    case 'distance': {
      const value = compareNumber('distance', contractor)
      return value === null ? (
        notUpdated
      ) : (
        <span>
          {tCommon('distanceShort', {
            km: formatNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          })}
        </span>
      )
    }
    case 'surveyTime': {
      const value = compareNumber('surveyTime', contractor)
      return value === null ? notUpdated : <span>{t('surveyValue', { hours: value })}</span>
    }
    case 'legal':
      return compareLegalVerified(contractor) ? <span>{t('legalVerified')}</span> : notUpdated
    case 'warranty': {
      const value = compareNumber('warranty', contractor)
      return value === null ? notUpdated : <span>{t('warrantyValue', { months: value })}</span>
    }
  }
}

/**
 * Viền xanh của cột được chọn, vẽ BÊN TRONG từng ô của cột (không phải khung
 * phủ lên bảng) nên đi theo cột khi cuộn ngang và bị cột "Tiêu chí" che. Cột
 * cuối tự bo góc phải theo viền cong của bảng.
 */
function PickedFrame({ show, edge, last }: { show: boolean; edge?: 'top' | 'bottom'; last: boolean }) {
  if (!show) return null
  return (
    <span
      aria-hidden
      className={cn(
        'border-primary pointer-events-none absolute -inset-px border-x-2',
        edge === 'top' && 'border-t-2',
        edge === 'bottom' && 'border-b-2',
        last && edge === 'top' && 'rounded-tr-2xl',
        last && edge === 'bottom' && 'rounded-br-2xl'
      )}
    />
  )
}
