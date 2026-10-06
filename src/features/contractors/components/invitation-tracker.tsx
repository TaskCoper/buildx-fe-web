'use client'

import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  FileText,
  Headset,
  Info,
  Lock,
  Mail,
  Phone,
  Star,
  UserPlus,
  UsersRound
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { env } from '@/shared/config/env'
import { QuotationTracker } from './quotation-tracker'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { EmptyState, HotlineLink, ProjectManagementOptionsDialog, revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { contractorMatchesRoute } from '@/shared/constants/routes'
import { siteConfig } from '@/shared/config'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate, formatDisplayDateTime } from '@/shared/utils'
import { surveySlotLabel } from '@/shared/cms'
import { INVITATION_STEPS, INVITATIONS_ARRIVE_FORWARD_KEY, MAX_INVITATIONS } from '../constants/contractors.constants'
import { useBrief } from '../hooks/use-brief'
import { useConstructionScopes } from '../hooks/use-construction-scopes'
import { useContractors } from '../hooks/use-contractors'
import { useContractorReviews, useMockInvitations as useInvitations } from '../hooks/use-invitations'
import type { Contractor, ContractorReview, Invitation } from '../types/contractor.types'
import { ContractorReviewDialog } from './contractor-review-dialog'
import { ContractorLogo } from './contractor-logo'
import { ContractorProfileSheet } from './contractor-profile-sheet'
import { ContractorStats } from './contractor-stats'
import { ProjectContextBar } from './project-context-bar'

interface InvitationTrackerProps {
  projectId: string
}

/**
 * Lời mời báo giá — theo dõi lời mời đã gửi (S18).
 *
 * R4: khách CHỈ XEM. Không có nút đổi lịch, hủy lời mời hay nhập trạng thái —
 * mọi thay đổi đi qua đội hỗ trợ, nên màn này nói rõ điều đó thay vì bày ra
 * những nút không làm gì.
 *
 * R2/R3: không có số tiền, không có bảng so sánh báo giá. Bổ sung so với bản mô
 * tả: mỗi thẻ hiện luôn LỊCH KHẢO SÁT đã đặt — sau S17 thì đây là chỗ duy nhất
 * khách xem lại được mình đã hẹn nhà thầu lúc nào.
 */
function MockInvitationTracker({ projectId }: InvitationTrackerProps) {
  const t = useTranslations('contractors.invitations')
  const tStatus = useTranslations('contractors.status')
  const router = useRouter()
  const { data: brief } = useBrief(projectId)
  const { data: contractors } = useContractors(projectId)
  const { data: invitations, isPending } = useInvitations(projectId, { live: true })
  const { data: reviews } = useContractorReviews(projectId)
  const reduceMotion = useReducedMotion()

  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [profileContractor, setProfileContractor] = useState<Contractor | null>(null)
  const [dossierOpen, setDossierOpen] = useState(false)
  const [hoveredStep, setHoveredStep] = useState<Invitation['status'] | null>(null)
  const [newInvitationIds, setNewInvitationIds] = useState<Set<string>>(new Set())
  const [liveUpdateId, setLiveUpdateId] = useState<string | null>(null)
  const [leavingBack, setLeavingBack] = useState(false)
  const [managementOpen, setManagementOpen] = useState(false)
  const [introMode, setIntroMode] = useState<'checking' | 'play' | 'skip'>('checking')
  const previousStatusesRef = useRef<Map<string, Invitation['status']> | null>(null)

  const sent = useMemo(
    () => [...(invitations ?? [])].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [invitations]
  )
  useEffect(() => {
    try {
      const key = `savico.m10-intro.${projectId}`
      const seen = window.sessionStorage.getItem(key) === '1'
      if (!seen) window.sessionStorage.setItem(key, '1')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resolves a one-time session animation preference after hydration
      setIntroMode(seen ? 'skip' : 'play')
    } catch {
      setIntroMode('play')
    }
  }, [projectId])

  /**
   * Vừa bấm "Theo dõi yêu cầu" ở M09 → cả trang trượt vào từ bên phải (đi tới).
   * Khung hình đầu để ẩn tới khi đọc xong cờ, cùng cách `introMode` giữ các thẻ.
   * Updater giữ 'forward' khi StrictMode chạy effect lần hai (lúc đó cờ đã xoá).
   */
  const [entry, setEntry] = useState<'pending' | 'forward' | 'static'>('pending')
  useEffect(() => {
    let forward = false
    try {
      forward = window.sessionStorage.getItem(INVITATIONS_ARRIVE_FORWARD_KEY) === projectId
      if (forward) window.sessionStorage.removeItem(INVITATIONS_ARRIVE_FORWARD_KEY)
    } catch {
      // Không đọc được cờ → hiện thẳng.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc cờ chuyển trang một lần sau hydrate
    setEntry((current) => (forward ? 'forward' : current === 'pending' ? 'static' : current))
  }, [projectId])

  useEffect(() => {
    if (!invitations) return

    const current = new Map(invitations.map((invitation) => [invitation.id, invitation.status]))
    const previous = previousStatusesRef.current
    const acknowledgementKey = `savico.m10-ack.${projectId}`

    if (!previous) {
      try {
        const raw = window.localStorage.getItem(acknowledgementKey)
        const acknowledged = raw ? (JSON.parse(raw) as Record<string, string>) : {}
        if (raw) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time snapshot comparison against persisted acknowledgement state
          setNewInvitationIds(
            new Set(
              invitations
                .filter(
                  (invitation) => acknowledged[invitation.id] && acknowledged[invitation.id] !== invitation.updatedAt
                )
                .map((invitation) => invitation.id)
            )
          )
        } else {
          window.localStorage.setItem(
            acknowledgementKey,
            JSON.stringify(Object.fromEntries(invitations.map((invitation) => [invitation.id, invitation.updatedAt])))
          )
        }
      } catch {
        // Storage can be unavailable; live updates still work during this mount.
      }
      previousStatusesRef.current = current
      return
    }

    const changed = invitations.find(
      (invitation) => !previous.has(invitation.id) || previous.get(invitation.id) !== invitation.status
    )
    if (changed) {
      setLiveUpdateId(changed.id)
      setNewInvitationIds((ids) => new Set(ids).add(changed.id))
      toast.success(t('updateToast', { name: changed.contractorName, status: tStatus(changed.status) }))
      const timer = window.setTimeout(() => setLiveUpdateId(null), 1800)
      previousStatusesRef.current = current
      return () => window.clearTimeout(timer)
    }

    previousStatusesRef.current = current
  }, [invitations, projectId, t, tStatus])

  const dismissNew = (invitation: Invitation) => {
    if (!newInvitationIds.has(invitation.id)) return
    setNewInvitationIds((ids) => {
      const next = new Set(ids)
      next.delete(invitation.id)
      return next
    })
    try {
      const key = `savico.m10-ack.${projectId}`
      const raw = window.localStorage.getItem(key)
      const acknowledged = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      window.localStorage.setItem(key, JSON.stringify({ ...acknowledged, [invitation.id]: invitation.updatedAt }))
    } catch {
      // The badge can still be dismissed for this mount.
    }
  }

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
      initial={false}
      animate={leavingBack || (entry === 'pending' && !reduceMotion) ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
      transition={
        leavingBack
          ? { duration: 0.18, ease: revealEase }
          : entry === 'forward'
            ? { duration: 0.35, ease: revealEase }
            : { duration: 0 }
      }
      className='mx-auto w-full max-w-[90rem] px-4 lg:px-8 space-y-5 py-5'
    >
      <ProjectContextBar brief={brief} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <button
          type='button'
          onClick={goBack}
          className='text-primary-strong inline-flex items-center gap-1.5 text-sm font-medium'
        >
          {/* Bản mô tả S18 gọi đúng tên liên kết này là "Quay lại danh sách nhà
              thầu" — khác với nhãn của trạng thái rỗng ở dưới. */}
          <ChevronLeft className='size-4' />
          {t('back')}
        </button>
      </motion.div>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className='flex flex-wrap items-center justify-between gap-3'
      >
        <div className='min-w-0'>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('title')}</h1>
          {/* Chưa mời ai thì chỉ còn khối trống bên dưới — không ghi "đã gửi đến 0 nhà thầu". */}
          {sent.length > 0 ? (
            <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('subtitle', { count: sent.length })}</p>
          ) : null}
        </div>
        {sent.length > 0 ? (
          <div className='flex flex-wrap items-center gap-3'>
            <motion.span
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
              className='bg-card inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm'
            >
              <UsersRound className='text-primary size-4' />
              <AnimatePresence mode='popLayout' initial={false}>
                <motion.span
                  key={sent.length}
                  initial={{ opacity: 0, y: -6, rotateX: -75 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: 6, rotateX: 75 }}
                  transition={{ duration: 0.25 }}
                  className='inline-block'
                >
                  {t.rich('counter', {
                    used: sent.length,
                    max: MAX_INVITATIONS,
                    b: (chunks) => <b className='font-semibold'>{chunks}</b>
                  })}
                </motion.span>
              </AnimatePresence>
            </motion.span>
            {/* Còn lượt → mời thêm ngay tại đây, về đúng trang Đề xuất của dự án này. */}
            {sent.length < MAX_INVITATIONS ? (
              <Button asChild>
                <Link href={contractorMatchesRoute(projectId)}>
                  <UserPlus className='size-4' />
                  {t('inviteMore', { left: MAX_INVITATIONS - sent.length })}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </motion.header>

      {isPending ? (
        <Skeleton className='h-72 rounded-2xl' />
      ) : sent.length === 0 ? (
        <EmptyState
          title={t('empty')}
          action={
            <Button asChild>
              <Link href={contractorMatchesRoute(projectId)}>{t('emptyAction')}</Link>
            </Button>
          }
        />
      ) : (
        <div className='grid gap-x-[1.6%] gap-y-5 lg:grid-cols-[70.5%_minmax(0,1fr)]'>
          <div className='min-w-0 space-y-4'>
            {sent.map((invitation, index) => (
              <motion.div
                layout
                key={invitation.id}
                initial={false}
                animate={introMode === 'checking' && !reduceMotion ? { opacity: 0, y: 24 } : { opacity: 1, y: 0 }}
                transition={
                  introMode === 'play' && !reduceMotion
                    ? { duration: 0.55, delay: 0.16 + index * 0.1, ease: revealEase }
                    : { duration: 0 }
                }
              >
                <InvitationCard
                  invitation={invitation}
                  contractor={contractors?.find((c) => c.id === invitation.contractorId)}
                  projectId={projectId}
                  review={reviews?.find((item) => item.invitationId === invitation.id)}
                  index={index}
                  playIntro={introMode === 'play' && !reduceMotion}
                  isLiveUpdate={liveUpdateId === invitation.id}
                  isNew={newInvitationIds.has(invitation.id)}
                  onHoverStep={setHoveredStep}
                  onDismissNew={() => dismissNew(invitation)}
                  onViewProfile={setProfileContractor}
                  onChooseManagement={() => setManagementOpen(true)}
                />
              </motion.div>
            ))}

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + sent.length * 0.1 }}
              className='text-muted-foreground bg-muted/50 flex items-start gap-2.5 rounded-xl p-4 text-sm'
            >
              <Info className='mt-0.5 size-4 shrink-0' />
              <span className='text-pretty'>{t('footerNote')}</span>
            </motion.p>
          </div>

          <motion.aside
            initial={reduceMotion ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: revealEase }}
            className='space-y-4 lg:sticky lg:top-24 lg:self-start'
          >
            <StatusLegend
              currentStatus={sent[0]?.status ?? null}
              hoveredStep={hoveredStep}
              onHoverStep={setHoveredStep}
            />
            <SentDossier
              projectId={projectId}
              version={sent[0]?.dossierVersion ?? 'v1'}
              onView={() => setDossierOpen(true)}
            />

            {/* Khối cuối của cột phải — hiện SAU "Ý nghĩa trạng thái" (bốn dòng
                đến lượt lúc ~1.07s) và "Hồ sơ đã gửi", không phải cùng lúc với
                cả cột như trước (mục "Đội hỗ trợ BuildX" của S18). */}
            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.1, ease: revealEase }}
              className='bg-accent/40 flex gap-3 rounded-2xl p-4'
            >
              <Headset className='text-primary mt-0.5 size-5 shrink-0' />
              <div className='min-w-0'>
                <h2 className='text-primary-strong font-semibold'>{t('supportTitle')}</h2>
                <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('supportBody')}</p>
                <button
                  type='button'
                  onClick={() => setContactDialogOpen(true)}
                  className='text-primary-strong mt-2 text-sm font-medium underline underline-offset-4'
                >
                  {t('supportAction')}
                </button>
              </div>
            </motion.section>
          </motion.aside>
        </div>
      )}

      <ContractorProfileSheet
        contractor={profileContractor}
        onOpenChange={(open) => !open && setProfileContractor(null)}
      />
      <DossierSheet
        open={dossierOpen}
        onOpenChange={setDossierOpen}
        projectId={projectId}
        version={sent[0]?.dossierVersion ?? 'v1'}
      />

      <ProjectManagementOptionsDialog open={managementOpen} onOpenChange={setManagementOpen} projectId={projectId} />

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('contactDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-2.5 text-sm'>
            <HotlineLink className='hover:bg-accent flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors'>
              <Phone className='text-primary size-4 shrink-0' />
              {siteConfig.contact.hotline}
            </HotlineLink>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className='hover:bg-accent flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors'
            >
              <Mail className='text-primary size-4 shrink-0' />
              {siteConfig.contact.email}
            </a>
          </div>
          <DialogFooter>
            <Button asChild className='w-full'>
              <HotlineLink>{t('contactDialogCall')}</HotlineLink>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

/** Giá trị in đậm trong các chuỗi "Mã lời mời <b>…</b>" của hàng siêu dữ liệu. */
const strong = (chunks: React.ReactNode) => <b className='text-foreground font-medium'>{chunks}</b>

const slotLabel = (slotId: string) => {
  // Khung giờ lấy theo Lịch khảo sát do admin cấu hình; mã giờ dạng `slot-HHmm` của bản cũ tự dựng nhãn.
  const configured = surveySlotLabel(slotId)
  if (configured !== slotId) return configured
  const clock = /^slot-(\d{2})(\d{2})$/.exec(slotId)
  if (!clock) return slotId
  const hour = Number(clock[1])
  return `${clock[1]}:${clock[2]} – ${String(hour + 1).padStart(2, '0')}:${clock[2]}`
}

/** Một thẻ lời mời: thông tin nhà thầu, mốc hồ sơ và thanh 4 nấc trạng thái. */
function InvitationCard({
  invitation,
  contractor,
  projectId,
  review,
  index,
  playIntro,
  isLiveUpdate,
  isNew,
  onHoverStep,
  onDismissNew,
  onViewProfile,
  onChooseManagement
}: {
  invitation: Invitation
  contractor?: Contractor
  projectId: string
  /** Đánh giá đã gửi cho chính lời mời này, nếu có. */
  review?: ContractorReview
  index: number
  /** Đang ở lần chạy hiệu ứng vào trang đầu tiên (mục "Thanh thông tin" của S18). */
  playIntro: boolean
  isLiveUpdate: boolean
  isNew: boolean
  onHoverStep: (status: Invitation['status'] | null) => void
  onDismissNew: () => void
  onViewProfile: (contractor: Contractor) => void
  onChooseManagement: () => void
}) {
  const t = useTranslations('contractors.invitations')
  const tCommon = useTranslations('contractors.common')
  const tStatus = useTranslations('contractors.status')
  const tRating = useTranslations('contractors.rating')
  const locale = useLocale() as Locale

  const [reviewOpen, setReviewOpen] = useState(false)

  const currentIndex = INVITATION_STEPS.indexOf(invitation.status)
  const stampOf = (status: string) => invitation.steps.find((step) => step.status === status)?.at
  const isDone = invitation.status === 'done'

  // Mốc thời gian theo MỘT kiểu chung của site (góp ý mục 38): "10:42 - 26/08/2026".
  const sentStamp = formatDisplayDateTime(invitation.sentAt, locale)
  const stepStamp = (at: string) => formatDisplayDateTime(at, locale)

  return (
    <motion.article
      animate={
        isLiveUpdate || isNew
          ? {
              borderColor: ['var(--border)', 'var(--primary)', 'var(--border)'],
              boxShadow: [
                '0 0 0 0 transparent',
                '0 0 0 3px color-mix(in oklab, var(--primary) 15%, transparent)',
                '0 0 0 0 transparent'
              ]
            }
          : undefined
      }
      transition={{ duration: 0.9, delay: isLiveUpdate ? 0 : 0.2 + index * 0.08 }}
      onMouseEnter={onDismissNew}
      onClick={onDismissNew}
      className={cn('bg-card relative space-y-4 overflow-hidden rounded-2xl border p-4 sm:p-5', isDone && 'pt-5')}
    >
      {/* "Hoàn tất" → dải trên xanh (mục 6). */}
      {isDone ? <span aria-hidden className='bg-primary absolute inset-x-0 top-0 h-1' /> : null}

      <div className='flex flex-wrap items-start gap-4'>
        {contractor ? <ContractorLogo contractor={contractor} className='size-14 rounded-lg' /> : null}

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='font-semibold'>{contractor?.name ?? invitation.contractorId}</h2>
            {contractor?.verified ? <BadgeCheck className='text-primary size-4' /> : null}
          </div>
          {contractor ? (
            <>
              <p className='text-muted-foreground mt-0.5 text-sm'>
                {contractor.kind} · {contractor.officeAddress}
              </p>
              <ContractorStats contractor={contractor} dense className='mt-1.5' />
            </>
          ) : null}
        </div>

        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          {/* Nấc chờ nhà thầu tô CAM chứ không xanh: đây là nấc duy nhất bóng
              đang ở phía nhà thầu, khách nhìn màu là biết chưa xong. Chấm nhấp
              chậm khi còn đang chờ, đứng yên khi đã hoàn tất (mục 5). */}
          <motion.span
            key={invitation.status}
            initial={isLiveUpdate ? { opacity: 0, y: -8, rotateX: -40 } : false}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.35, ease: revealEase }}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
              invitation.status === 'rejected'
                ? 'bg-destructive/10 text-destructive'
                : invitation.status === 'received'
                  ? 'bg-warning/15 text-warning-strong'
                  : 'bg-primary/10 text-primary-strong'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full',
                invitation.status === 'rejected'
                  ? 'bg-destructive'
                  : invitation.status === 'received'
                    ? 'bg-warning-strong'
                    : 'bg-primary',
                !isDone && invitation.status !== 'rejected' && 'animate-pulse'
              )}
            />
            {invitation.status === 'received' ? tStatus('receivedWaiting') : tStatus(invitation.status)}
            <AnimatePresence>
              {isNew ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className='bg-destructive text-destructive-foreground ml-0.5 rounded-full px-1.5 py-0.5 max-md:text-xs text-[9px] font-semibold'
                >
                  {t('newUpdateBadge')}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.span>
          {contractor ? (
            <Button variant='outline' size='sm' onClick={() => onViewProfile(contractor)}>
              <FileText className='size-4' />
              {tCommon('viewProfile')}
            </Button>
          ) : null}

          {/* S09 hứa "chỉ khách đã làm việc qua SAVICO mới được đánh giá" — nên
              nút chỉ hiện khi lời mời đã ở nấc cuối, và biến mất sau khi đánh
              giá xong (mỗi lời mời một lần). */}
          {invitation.status === 'done' && contractor ? (
            review ? (
              <span className='text-warning-strong inline-flex items-center gap-1.5 text-xs font-medium'>
                <Star className='fill-warning text-warning size-3.5' />
                {tRating('done', { rating: review.rating })}
              </span>
            ) : (
              <Button variant='outline' size='sm' onClick={() => setReviewOpen(true)}>
                <Star className='size-4' />
                {tRating('action')}
              </Button>
            )
          ) : null}
        </div>
      </div>

      {/* Thanh thông tin (mã, gửi lúc, hồ sơ) hiện dần SAU khi thẻ đã hiện xong —
          không chạy song song với thẻ. Thẻ (wrapper ở component cha) hiện xong
          lúc `0.71 + index*0.1`; thanh này bắt đầu ngay sau đó. Đã xem qua rồi
          (`!playIntro`) → hiện thẳng, không phát lại mỗi lần quay lại trang. */}
      <motion.div
        initial={playIntro ? 'hidden' : false}
        animate='show'
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: playIntro ? 0.75 + index * 0.1 : 0 } }
        }}
        className='text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t pt-3 text-sm'
      >
        {[
          t.rich('code', { code: invitation.id, b: strong }),
          t.rich('sentAt', { time: sentStamp, b: strong }),
          t.rich('dossier', { version: invitation.dossierVersion, count: invitation.fileCount, b: strong })
        ].map((content, itemIndex) => (
          <motion.span key={itemIndex} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
            {content}
          </motion.span>
        ))}
        <motion.span
          key={invitation.updatedAt}
          initial={isLiveUpdate ? { opacity: 0, y: -6, rotateX: -35 } : false}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          className='sm:ml-auto'
        >
          {t('updatedBy', { time: formatDisplayDate(invitation.updatedAt, locale) })}
        </motion.span>
      </motion.div>

      <p className='text-muted-foreground flex items-center gap-2 text-sm'>
        <CalendarDays className='text-primary size-4 shrink-0' />
        {t('surveyAt', {
          date: formatDisplayDate(invitation.survey.date, locale, { weekday: true }),
          slot: slotLabel(invitation.survey.slotId)
        })}
      </p>
      {invitation.status === 'rejected' ? (
        <p className='text-destructive text-sm'>{t('rejectedLine', { reason: invitation.rejectReason ?? '-' })}</p>
      ) : null}

      {/* Thanh 4 nấc: nấc đã qua tô đặc, nấc hiện tại viền đậm, nấc chưa tới mờ. */}
      {/* `overflow-x-auto` — cần để cuộn ngang trên màn hẹp — kéo theo overflow-y
          bị tính lại thành `auto` luôn (CSS không cho phép chỉ một trục cuộn),
          nên chấm tròn phóng to khi hover bị cắt ngay ở mép trên. Thêm đệm trên
          rồi kéo ngược bằng margin âm cùng giá trị: có chỗ cho hiệu ứng phóng to
          mà vị trí chấm/đường nối lúc đứng yên không xê dịch một pixel nào. */}
      <ol className='flex items-start overflow-x-auto pt-3 pb-1 -mt-3'>
        {INVITATION_STEPS.map((status, index) => {
          const done = index < currentIndex || (isDone && index === currentIndex)
          const active = index === currentIndex && !isDone
          const at = stampOf(status)

          return (
            // `TooltipTrigger` bọc ĐÚNG chấm tròn, không bọc cả `li` — Radix canh
            // hộp thoại theo tâm phần tử trigger; bọc cả `li` (rộng hết chiều
            // ngang một nấc) làm hộp thoại lệch phải so với chấm.
            <Tooltip key={status}>
              <motion.li
                key={status}
                onHoverStart={() => onHoverStep(status)}
                onHoverEnd={() => onHoverStep(null)}
                className='relative flex min-w-36 flex-1 flex-col gap-2 rounded-lg sm:min-w-0'
              >
                {/* Đường nối do nấc SAU vẽ, kéo từ tâm nấc trước sang tâm nấc này.
                Để nó là phần tử anh em `flex-1` như trước thì nấc cuối — nấc
                duy nhất không có đường nối — rộng hơn hẳn ba nấc kia. */}
                {/* Đường nối kéo từ tâm nấc trước tới tâm nấc này. Nhãn canh
                TRÁI dưới từng chấm, đúng ảnh S18. */}
                {index > 0 ? (
                  <span
                    aria-hidden
                    className='bg-border absolute top-3 right-full left-0 h-0.5 -translate-y-1/2 overflow-hidden rounded-full'
                    style={{ left: 'calc(-100% + 1.5rem)', right: 'calc(100% - 0.75rem)' }}
                  >
                    <motion.span
                      className='bg-primary block size-full origin-left'
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: done || active ? 1 : 0 }}
                      transition={{ duration: 0.55, delay: 0.22 + index * 0.12, ease: revealEase }}
                    />
                  </span>
                ) : null}

                <TooltipTrigger asChild>
                  <motion.span
                    // Zoom khi hover CHỈ áp cho chấm tròn — đặt trực tiếp trên chấm thay vì
                    // trên cả `li` cha, vì đường nối cũng là con của `li` đó và bị zoom theo.
                    whileHover={{ scale: 1.2 }}
                    animate={isLiveUpdate && index === currentIndex ? { scale: [0.72, 1.15, 1] } : { scale: 1 }}
                    // Ba keyframe không chạy được bằng spring — motion ném lỗi và vòng lặp
                    // khung hình chết cho cả trang; độ nảy đã nằm trong keyframe nên dùng tween.
                    transition={
                      isLiveUpdate && index === currentIndex
                        ? { duration: 0.45, ease: 'easeOut' }
                        : { type: 'spring', stiffness: 360, damping: 22 }
                    }
                    className={cn(
                      'relative z-10 flex size-6 items-center justify-center rounded-full border-2',
                      done && 'border-primary bg-primary text-primary-foreground',
                      active && 'border-primary bg-card',
                      !done && !active && 'border-border bg-card'
                    )}
                  >
                    {/* Quầng "thở" hai nhịp rồi đứng yên ở nấc hiện tại (mục 6). */}
                    {active ? (
                      <motion.span
                        aria-hidden
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.8 }}
                        transition={{ duration: 0.9, repeat: 1, repeatType: 'loop' }}
                        className='border-primary absolute inset-0 -z-10 rounded-full border-2'
                      />
                    ) : null}
                    {done ? (
                      <motion.svg viewBox='0 0 16 16' className='size-3.5' initial='hidden' animate='show'>
                        <motion.path
                          d='m3 8.5 3 3 7-7'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1 } }}
                          transition={{ duration: 0.35, delay: 0.28 + index * 0.12 }}
                        />
                      </motion.svg>
                    ) : null}
                    {active ? <span aria-hidden className='bg-primary size-2 rounded-full' /> : null}
                  </motion.span>
                </TooltipTrigger>

                <div className='min-w-0'>
                  <p
                    className={cn(
                      'text-sm leading-tight',
                      done && 'font-medium',
                      active && 'text-primary-strong font-medium',
                      !done && !active && 'text-muted-foreground'
                    )}
                  >
                    {tStatus(status)}
                  </p>
                  {/* Nấc chưa tới KHÔNG in gạch ngang: mốc chưa xảy ra thì để
                  trống, vẽ "—" chỉ làm cột thời gian trông như bị lỗi. */}
                  {at ? <p className='text-muted-foreground mt-0.5 text-sm'>{stepStamp(at)}</p> : null}
                </div>
              </motion.li>
              <TooltipContent>{at ? stepStamp(at) : t('statusPending')}</TooltipContent>
            </Tooltip>
          )
        })}
      </ol>

      {/* Hoàn tất → gợi ý "Chọn cách quản lý thi công", trượt lên + một nhịp
          thở rồi im (mục 6). */}
      {isDone ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, scale: [1, 1.015, 1] }}
          transition={{ opacity: { duration: 0.4 }, y: { duration: 0.4 }, scale: { duration: 0.5, delay: 0.4 } }}
          className='bg-accent/40 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3.5 text-sm'
        >
          <span className='text-primary-strong font-medium'>{t('supervisionSuggestion')}</span>
          <Button type='button' size='sm' variant='outline' onClick={onChooseManagement}>
            {t('supervisionAction')}
          </Button>
        </motion.div>
      ) : null}

      {contractor ? (
        <ContractorReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          projectId={projectId}
          invitationId={invitation.id}
          contractorName={contractor.name}
        />
      ) : null}
    </motion.article>
  )
}

/**
 * Cột phải: giải thích 4 trạng thái (S18).
 *
 * Dòng ứng với trạng thái hiện tại nền xanh nhạt (mục 8) — chỉ khi TẤT CẢ lời
 * mời đang ở cùng một trạng thái; nhiều lời mời ở nhiều trạng thái khác nhau
 * thì không tô dòng nào để khỏi ngầm chỉ sai một trạng thái.
 */
function StatusLegend({
  currentStatus,
  hoveredStep,
  onHoverStep
}: {
  currentStatus: Invitation['status'] | null
  hoveredStep: Invitation['status'] | null
  onHoverStep: (status: Invitation['status'] | null) => void
}) {
  const t = useTranslations('contractors.invitations')
  const tStatus = useTranslations('contractors.status')
  const tMeaning = useTranslations('contractors.statusMeaning')

  return (
    <section className='bg-card rounded-2xl border p-4'>
      <h2 className='font-semibold'>{t('meaningTitle')}</h2>
      <dl className='mt-3 space-y-2.5 text-sm'>
        {INVITATION_STEPS.map((status, index) => (
          <motion.div
            key={status}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.48 + index * 0.08 }}
            onHoverStart={() => onHoverStep(status)}
            onHoverEnd={() => onHoverStep(null)}
            className='relative isolate flex gap-2.5 rounded-lg'
          >
            {/* Nền xanh nhạt của dòng hiện tại — overlay riêng, không đổi đệm
                hay lề của hàng ở trạng thái nghỉ (mục 8). */}
            {status === currentStatus || status === hoveredStep ? (
              <motion.span
                layoutId={status === currentStatus ? 'm10-current-status' : undefined}
                aria-hidden
                className='bg-accent/60 absolute -inset-x-1.5 -inset-y-0.5 -z-10 rounded-lg'
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                'mt-2 size-1.5 shrink-0 rounded-full',
                status === currentStatus || status === hoveredStep ? 'bg-primary' : 'bg-muted-foreground/40'
              )}
            />
            <div className='text-muted-foreground min-w-0 text-pretty'>
              <dt className='text-foreground inline font-semibold'>{tStatus(status)}</dt>
              <dd className='inline'> – {tMeaning(status)}</dd>
            </div>
          </motion.div>
        ))}
      </dl>
    </section>
  )
}

/**
 * Cột phải: hồ sơ đã gửi kèm lời mời.
 *
 * Ngân sách khách nhập ở Bước 1 KHÔNG nằm trong danh sách này — bản mô tả nói rõ
 * hồ sơ gửi đi không chứa thông tin giá, nên chỗ này liệt kê đúng những trường
 * nhà thầu nhận được, kèm dòng ghi chú để khách biết ngân sách của mình không bị
 * chuyển đi.
 */
function SentDossier({ projectId, version, onView }: { projectId: string; version: string; onView: () => void }) {
  const t = useTranslations('contractors.invitations')
  const scopes = useConstructionScopes()
  const tScale = useTranslations('contractors.scale')
  const { data: brief } = useBrief(projectId)
  const reduceMotion = useReducedMotion()

  if (!brief) return null

  const rows = [
    { label: t('dossierType'), value: brief.buildingType },
    { label: t('dossierScale'), value: `${tScale(brief.scale)} · ${brief.landArea} m²` },
    { label: t('dossierScope'), value: scopes.label(brief.scope, brief.scopeName) },
    { label: t('dossierFiles'), value: t('dossierFileCount', { count: brief.documents.length }) }
  ]

  return (
    <section className='bg-card rounded-2xl border p-4'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='font-semibold'>{t('dossierTitle')}</h2>
        {/* Nhãn phiên bản phóng nhẹ — trễ tới lúc cả khối bên phải đã hiện xong
            (aside cha hiện xong ở ~0.9s); không trễ thì spring chạy xong ngay
            lúc mới mount, ẩn dưới lớp mờ dần của khối cha, không ai thấy. */}
        <motion.span
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: reduceMotion ? 0 : 0.9 }}
          className='border-primary/40 text-primary-strong rounded-md border px-1.5 py-0.5 max-md:text-xs text-[10px] font-medium'
        >
          {version}
        </motion.span>
      </div>

      <dl className='mt-3 space-y-2.5 text-sm'>
        {rows.map((row) => (
          <div key={row.label} className='flex items-start justify-between gap-3'>
            <dt className='text-muted-foreground'>{row.label}</dt>
            <dd className='text-right font-medium'>{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* Doc S18: cột phải có link mở lại đúng hồ sơ đã gửi kèm lời mời. */}
      <button
        type='button'
        onClick={onView}
        className='text-primary-strong mt-3 inline-block text-sm font-medium underline underline-offset-4'
      >
        {t('dossierView')}
      </button>

      <p className='text-muted-foreground bg-muted/50 mt-3 flex items-start gap-2 rounded-lg p-3 text-sm'>
        <Lock className='mt-0.5 size-3.5 shrink-0' />
        <span>{t('dossierNoBudget')}</span>
      </p>
    </section>
  )
}

function DossierSheet({
  open,
  onOpenChange,
  projectId,
  version
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  version: string
}) {
  const t = useTranslations('contractors.invitations')
  const scopes = useConstructionScopes()
  const tScale = useTranslations('contractors.scale')
  const { data: brief } = useBrief(projectId)

  const rows = brief
    ? [
        { label: t('dossierType'), value: brief.buildingType },
        { label: t('dossierScale'), value: `${tScale(brief.scale)} · ${brief.landArea} m²` },
        { label: t('dossierScope'), value: scopes.label(brief.scope, brief.scopeName) },
        { label: t('dossierFiles'), value: t('dossierFileCount', { count: brief.documents.length }) }
      ]
    : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-[94vw] overflow-y-auto sm:max-w-md'>
        <SheetHeader className='border-b pr-10'>
          <div className='flex items-center gap-2'>
            <SheetTitle>{t('dossierTitle')}</SheetTitle>
            <span className='border-primary/40 text-primary-strong rounded-md border px-1.5 py-0.5 max-md:text-xs text-[10px] font-medium'>
              {version}
            </span>
          </div>
          <SheetDescription>{t('dossierPanelDescription')}</SheetDescription>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: revealEase }}
          className='space-y-4 px-4 pb-6'
        >
          <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium'>
            <Lock className='size-3.5' />
            {t('noPriceBadge')}
          </span>
          <dl className='divide-y rounded-xl border px-4 text-sm'>
            {rows.map((row) => (
              <div key={row.label} className='flex items-start justify-between gap-4 py-3'>
                <dt className='text-muted-foreground'>{row.label}</dt>
                <dd className='text-right font-medium'>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className='text-muted-foreground bg-muted/50 flex items-start gap-2 rounded-xl p-3 text-sm'>
            <Lock className='mt-0.5 size-3.5 shrink-0' />
            {t('dossierNoBudget')}
          </p>
        </motion.div>
      </SheetContent>
    </Sheet>
  )
}

export function InvitationTracker(props: InvitationTrackerProps) {
  return env.NEXT_PUBLIC_USE_MOCK_API ? <MockInvitationTracker {...props} /> : <QuotationTracker {...props} />
}
