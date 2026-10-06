'use client'

import {
  BadgeCheck,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Copy,
  Headset,
  Lock,
  MapPin,
  MessageSquare,
  Send
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { type MouseEvent, useEffect, useRef, useState } from 'react'

import { env } from '@/shared/config/env'
import { QuotationTracker } from './quotation-tracker'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ProjectManagementOptionsDialog, revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { contractorInvitationsRoute, contractorMatchesRoute } from '@/shared/constants/routes'
import { canShowManagementPopup } from '@/shared/lib'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate, formatDisplayDateTime } from '@/shared/utils'
import { surveySlotLabel } from '@/shared/cms'
import {
  INVITATIONS_ARRIVE_FORWARD_KEY,
  INVITE_SENT_INTRO_KEY,
  MATCHES_INVITE_RETURN_KEY
} from '../constants/contractors.constants'
import { useBrief } from '../hooks/use-brief'
import { useContractors } from '../hooks/use-contractors'
import { useMockInvitations as useInvitations, useSurveyRequest } from '../hooks/use-invitations'
import { fullAddress } from '../services/brief.service'
import { remainingInvites } from '../services/contractor-list.service'
import { ContractorLogo } from './contractor-logo'
import { ProjectContextBar } from './project-context-bar'

interface InviteSentProps {
  projectId: string
  requestId: string
}

/** "slot-3" → "11:00 – 12:00" theo Lịch khảo sát do admin cấu hình. */
function slotLabel(slotId: string): string {
  return surveySlotLabel(slotId)
}

/** Góc (độ) của sáu chấm xanh bung ra từ mép vòng tròn — tinh tế, không pháo hoa (mục 1). */
const SPARK_ANGLES = [-90, -30, 30, 90, 150, 210] as const

/** Dòng nhà thầu đầu tiên hiện sau khi thẻ "Chi tiết yêu cầu" (bắt đầu ở 0.85s) đã trượt lên. */
const ROWS_DELAY = 1
const ROW_STAGGER = 0.12

/**
 * Dòng nhà thầu hiện lần lượt (mục 3). `delayChildren` phải nằm TRONG variant:
 * motion ưu tiên transition của variant, còn prop `transition` trên thẻ chỉ là
 * dự phòng — đặt ở prop thì bị bỏ qua và các dòng chạy xong khi thẻ còn ẩn.
 */
const rowListVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: ROWS_DELAY, staggerChildren: ROW_STAGGER } }
}

/** Mỗi dòng trượt lên, rồi nhãn "Đã gửi" → ngày → giờ theo sau. */
const rowVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: revealEase, delayChildren: 0.12, staggerChildren: 0.08 }
  }
}

/** Nhãn "Đã gửi" phóng nhẹ. */
const sentBadgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', bounce: 0.5, duration: 0.35 } }
}

/** Ngày & giờ hiện chéo: hai lần mờ-hiện gối lên nhau. */
const crossFadeVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } }
}

/**
 * Đã gửi lời mời & đăng ký khảo sát (S17).
 *
 * Thanh ngữ cảnh dự án chạy hết bề ngang trang, còn phần xác nhận nằm trong một
 * CỘT HẸP canh giữa (~59% bề ngang, đo từ ảnh S17): đây là màn đọc một lần rồi
 * đi, dàn ngang hết màn thì mắt phải quét quá xa cho vài dòng chữ.
 *
 * Khối "Chi tiết yêu cầu" liệt kê TẤT CẢ nhà thầu của lượt mời này (≤ 3, R1) —
 * mời ba nhà thầu thì đây là ba dòng, không phải ba màn xác nhận rời nhau.
 */
function MockInviteSent({ projectId, requestId }: InviteSentProps) {
  const t = useTranslations('contractors.sent')
  const tCommon = useTranslations('contractors.common')
  const locale = useLocale() as Locale
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const { data: brief } = useBrief(projectId)
  const { data: contractors } = useContractors(projectId)
  const { data, isPending } = useSurveyRequest(requestId)
  const { data: invitations, isPending: invitationsPending } = useInvitations(projectId)

  /**
   * Chuỗi vào trang chạy MỘT lần cho mỗi mã yêu cầu; tải lại trang → hiện thẳng
   * (mục 1). Lúc còn 'checking' thì giữ khung xương, để nội dung không kịp vẽ
   * một khung hình rồi mới nhảy về trạng thái ẩn. Ref chặn lần chạy effect thứ
   * hai của StrictMode — lần đó đọc thấy cờ vừa ghi và sẽ tắt mất hiệu ứng.
   */
  const [intro, setIntro] = useState<'checking' | 'play' | 'skip'>('checking')
  const introResolvedFor = useRef<string | null>(null)
  const managementShownRef = useRef(false)
  const [managementOpen, setManagementOpen] = useState(false)
  useEffect(() => {
    if (introResolvedFor.current === requestId) return
    introResolvedFor.current = requestId
    let seen = false
    try {
      const key = `${INVITE_SENT_INTRO_KEY}.${requestId}`
      seen = window.sessionStorage.getItem(key) === '1'
      if (!seen) window.sessionStorage.setItem(key, '1')
    } catch {
      // Không đọc được sessionStorage → cứ chạy hiệu ứng.
    }
    setIntro(seen ? 'skip' : 'play')
  }, [requestId])
  const instant = intro === 'skip' || Boolean(reduceMotion)
  const ready = intro !== 'checking' && Boolean(data)

  /**
   * Journey Popup 3/3 thuộc đúng milestone S17 trong sơ đồ:
   * màn "Đã gửi lời mời & đăng ký khảo sát" hiện thành công → chờ 1,5 giây.
   *
   * Ref chỉ được đánh dấu KHI timer thực sự chạy để React StrictMode có thể
   * cleanup/setup effect mà không vô tình nuốt lần mở popup ở development.
   */
  useEffect(() => {
    if (!ready || invitationsPending || managementShownRef.current) return
    if (!canShowManagementPopup(projectId)) return

    const timer = window.setTimeout(() => {
      managementShownRef.current = true
      setManagementOpen(true)
    }, 1_500)

    return () => window.clearTimeout(timer)
  }, [invitationsPending, projectId, ready, requestId])

  /** Sao chép mã → "Đã sao chép" hiện chéo chỗ nút rồi tự tắt; bấm lại thì đếm lại từ đầu (mục 2). */
  const [copiedAt, setCopiedAt] = useState(0)
  const copied = copiedAt > 0
  useEffect(() => {
    if (!copiedAt) return
    const timer = window.setTimeout(() => setCopiedAt(0), 1800)
    return () => window.clearTimeout(timer)
  }, [copiedAt])
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      return
    }
    setCopiedAt(Date.now())
  }

  /** Còn lượt mời → gợi ý mời thêm hiện dần sau vài giây kể từ khi nội dung hiện (mục 4). */
  const [hintDelayDone, setHintDelayDone] = useState(false)
  useEffect(() => {
    if (!ready || instant) return
    const timer = window.setTimeout(() => setHintDelayDone(true), 3000)
    return () => window.clearTimeout(timer)
  }, [ready, instant])

  /** Rời trang có hướng như M08/M10: "Theo dõi" đi tới (trượt trái), "Quay lại" lùi (trượt phải). */
  const [leaving, setLeaving] = useState<'forward' | 'back' | null>(null)
  const leaveTo = (event: MouseEvent<HTMLAnchorElement>, href: string, direction: 'forward' | 'back') => {
    // Ctrl/⌘/giữa chuột → mở tab mới như liên kết thường.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (reduceMotion) return
    event.preventDefault()
    if (direction === 'forward') window.sessionStorage.setItem(INVITATIONS_ARRIVE_FORWARD_KEY, projectId)
    setLeaving(direction)
    window.setTimeout(() => router.push(href), 180)
  }

  // Chờ cả danh sách lời mời: tải lại trang thì dòng "còn lượt" cũng phải hiện thẳng cùng
  // khung hình với phần còn lại, không nhú ra sau một nhịp (mục 1, mục 4).
  if (isPending || !data || intro === 'checking' || invitationsPending) {
    return (
      <div className='mx-auto w-full max-w-[90rem] px-4 lg:px-8 py-5'>
        <Skeleton className='mx-auto h-96 max-w-[54rem] rounded-2xl' />
      </div>
    )
  }

  const contractorOf = (contractorId: string) => contractors?.find((c) => c.id === contractorId)
  const names = data.invitations
    .map((invitation) => contractorOf(invitation.contractorId)?.name ?? invitation.contractorId)
    .join(', ')
  // Chưa tải xong danh sách lời mời thì chưa biết còn lượt — không đoán là còn đủ 3.
  const invitesLeft = invitations === undefined ? 0 : remainingInvites(invitations)
  const showMoreHint = invitesLeft > 0 && (instant || hintDelayDone)
  const markInviteReturn = () =>
    window.sessionStorage.setItem(
      MATCHES_INVITE_RETURN_KEY,
      JSON.stringify({
        projectId,
        contractorIds: data.invitations.map((invitation) => invitation.contractorId)
      })
    )
  const backToList = (event: MouseEvent<HTMLAnchorElement>) => {
    markInviteReturn()
    leaveTo(event, contractorMatchesRoute(projectId), 'back')
  }

  /** Nhịp các khối sau thẻ chi tiết lùi theo số dòng nhà thầu, để thứ tự "lần lượt" không gối nhau. */
  const supportDelay = ROWS_DELAY + (data.invitations.length - 1) * ROW_STAGGER + 0.1
  const actionsDelay = supportDelay + 0.3
  const privacyDelay = actionsDelay + 0.5

  return (
    <motion.div
      animate={leaving ? { opacity: 0, x: leaving === 'forward' ? -20 : 20 } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: revealEase }}
      className='mx-auto w-full max-w-[90rem] px-4 lg:px-8 py-5'
    >
      {/* Bản mô tả S17 vẫn giữ thanh ngữ cảnh dự án ở đầu trang như S15–S18. */}
      <ProjectContextBar brief={brief} />

      <div className='mx-auto mt-8 w-full max-w-[54rem] space-y-6'>
        <header className='space-y-3 text-center'>
          {/* Vòng tròn minh họa: máy bay giấy + lịch đã xác nhận, đúng ảnh S17.
              Chạy một lần khi vào trang (mục 1). */}
          <motion.span
            initial={instant ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.5 }}
            className='bg-accent/70 text-primary relative mx-auto flex size-32 items-center justify-center rounded-full'
          >
            {instant
              ? null
              : SPARK_ANGLES.map((angle) => {
                  const rad = (angle * Math.PI) / 180
                  return (
                    <motion.span
                      key={angle}
                      aria-hidden
                      initial={{ x: Math.cos(rad) * 50, y: Math.sin(rad) * 50, opacity: 0, scale: 0.6 }}
                      animate={{
                        x: Math.cos(rad) * 84,
                        y: Math.sin(rad) * 84,
                        opacity: [0, 1, 0],
                        scale: [0.6, 1, 0.4]
                      }}
                      transition={{ duration: 0.7, delay: 0.35, ease: revealEase }}
                      className='bg-primary/50 pointer-events-none absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full'
                    />
                  )
                })}
            <motion.span
              initial={instant ? false : { x: -40, y: 20, opacity: 0 }}
              animate={{ x: -6, y: -6, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: revealEase }}
            >
              <Send className='size-14' strokeWidth={1.25} />
            </motion.span>
            <motion.span
              initial={instant ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.6, duration: 0.4, delay: 0.5 }}
              className='bg-accent/70 absolute right-8 bottom-8 size-8 translate-x-1/2 translate-y-1/2 rounded'
            >
              <CalendarDays className='size-8' strokeWidth={1.5} />
            </motion.span>
            {/* Anh em của khối lịch (không lồng vào trong) để giữ đúng toạ độ neo
                gốc: cùng right-8 bottom-8 trên vòng tròn ngoài, chỉ khác độ dịch. */}
            <motion.span
              initial={instant ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.6, duration: 0.3, delay: 0.75 }}
              className='absolute right-8 bottom-8 translate-x-3/4 translate-y-3/4'
            >
              {/* Đúng hình lucide `CircleCheck` (vòng r=10 + nét tick), dựng tay để
                  nét tick được VẼ sau khi huy hiệu phóng vào (mục 1). */}
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden
                className='fill-primary text-primary-foreground size-4'
              >
                <circle cx='12' cy='12' r='10' />
                <motion.path
                  d='m9 12 2 2 4-4'
                  fill='none'
                  initial={instant ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { duration: 0.35, delay: 0.9, ease: revealEase },
                    // Nét dài 0 với đầu tròn vẫn để lại một chấm — ẩn tới lúc bắt đầu vẽ.
                    opacity: { duration: 0.01, delay: 0.9 }
                  }}
                />
              </svg>
            </motion.span>
          </motion.span>

          <motion.h1
            initial={instant ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.5 }}
            className='text-primary-strong text-2xl font-semibold tracking-tight sm:text-3xl'
          >
            {data.invitations.length > 1 ? t('titleMultiple', { count: data.invitations.length }) : t('title')}
          </motion.h1>
          <motion.p
            initial={instant ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.6 }}
            className='text-muted-foreground text-pretty'
          >
            {t('subtitle', { names })}
          </motion.p>
          <motion.p
            initial={instant ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.7 }}
            className='text-muted-foreground inline-flex items-center gap-1.5 text-sm'
          >
            {/* Một mục flex duy nhất: chữ trong dòng cách nhau bằng dấu cách thường
                như bản cũ, không bị `gap` của flex chen vào. */}
            <span>
              <span className='group/code'>
                {/* Một lần mời dùng một mã (góp ý BuildX): hiện mã lời mời INV-… — đúng mã
                    trang Lời mời hiển thị — chứ không phải mã yêu cầu nội bộ. */}
                {t.rich('requestCode', {
                  code: data.invitations.map((invitation) => invitation.id).join(', ') || data.request.id,
                  accent: (chunks) => <span className='text-primary-strong'>{chunks}</span>
                })}{' '}
                {/* Rê mã → nút sao chép hiện chéo ĐÚNG chỗ dấu "·" ngay sau mã, nên
                    không đẩy chữ nào; bấm → "Đã sao chép" hiện dưới nút rồi tự tắt (mục 2). */}
                <span className='relative'>
                  <span
                    aria-hidden
                    className={cn(
                      'transition-opacity group-hover/code:opacity-0 group-has-[:focus-visible]/code:opacity-0',
                      copied && 'opacity-0'
                    )}
                  >
                    ·
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      copyCode(data.invitations.map((invitation) => invitation.id).join(', ') || data.request.id)
                    }
                    aria-label={t('copyCode')}
                    className={cn(
                      'text-muted-foreground hover:text-foreground absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100',
                      copied && 'opacity-100'
                    )}
                  >
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={copied ? 'copied' : 'copy'}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className='col-start-1 row-start-1 flex'
                      >
                        {copied ? <Check className='text-primary size-3.5' /> : <Copy className='size-3.5' />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                  <AnimatePresence>
                    {copied ? (
                      <motion.span
                        role='status'
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className='text-primary-strong pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 whitespace-nowrap'
                      >
                        {t('copied')}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              </span>{' '}
              {t('sentAt', {
                time: formatDisplayDateTime(data.request.createdAt, locale)
              })}
            </span>
          </motion.p>
        </header>

        <motion.section
          initial={instant ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.85, ease: revealEase }}
          className='bg-card rounded-2xl border p-5'
        >
          <h2 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>{t('detailTitle')}</h2>

          <motion.ul
            variants={rowListVariants}
            initial={instant ? false : 'hidden'}
            animate='show'
            className='mt-3 divide-y'
          >
            {data.invitations.map((invitation) => {
              const contractor = contractorOf(invitation.contractorId)
              return (
                <motion.li
                  variants={rowVariants}
                  key={invitation.id}
                  className='flex flex-wrap items-center gap-x-5 gap-y-2 py-3'
                >
                  {contractor ? (
                    <ContractorLogo contractor={contractor} className='size-10 shrink-0 rounded-lg' />
                  ) : null}

                  <span className='flex min-w-0 flex-1 items-center gap-1.5 font-medium'>
                    <span className='truncate'>{contractor?.name ?? invitation.contractorId}</span>
                    {contractor?.verified ? <BadgeCheck className='text-primary size-4 shrink-0' /> : null}
                  </span>

                  <motion.span
                    variants={sentBadgeVariants}
                    className='bg-primary/10 text-primary-strong inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium'
                  >
                    <CircleCheck className='size-3.5' />
                    {t('statusSent')}
                  </motion.span>

                  <motion.span variants={crossFadeVariants} className='flex shrink-0 items-center gap-2 text-sm'>
                    <CalendarDays aria-hidden className='text-primary size-4' />
                    {formatDisplayDate(invitation.survey.date, locale, { weekday: true })}
                  </motion.span>

                  <motion.span variants={crossFadeVariants} className='flex shrink-0 items-center gap-2 text-sm'>
                    <Clock aria-hidden className='text-primary size-4' />
                    {slotLabel(invitation.survey.slotId)}
                  </motion.span>
                </motion.li>
              )
            })}
          </motion.ul>

          {/* Địa điểm và ghi chú nằm trong MỘT ô nền mờ, không phải hai cột trần
              ngăn bằng vạch — đúng ảnh S17. */}
          <dl className='bg-muted/40 mt-3 grid gap-4 rounded-xl p-4 sm:grid-cols-2'>
            <div className='flex items-start gap-2.5'>
              <MapPin aria-hidden className='text-primary mt-0.5 size-4 shrink-0' />
              <div className='min-w-0'>
                <dt className='text-muted-foreground text-xs'>{t('location')}</dt>
                <dd className='mt-0.5 text-sm font-medium text-pretty'>{brief ? fullAddress(brief) : ''}</dd>
              </div>
            </div>
            <div className='flex items-start gap-2.5'>
              <MessageSquare aria-hidden className='text-primary mt-0.5 size-4 shrink-0' />
              <div className='min-w-0'>
                <dt className='text-muted-foreground text-xs'>{t('note')}</dt>
                <dd className='text-muted-foreground mt-0.5 text-sm text-pretty'>
                  {data.invitations[0]?.survey.note || t('noNote')}
                </dd>
              </div>
            </div>
          </dl>
        </motion.section>

        <motion.section
          initial={instant ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: supportDelay, ease: revealEase }}
          className='bg-accent/40 flex flex-wrap items-start gap-4 rounded-2xl p-5'
        >
          <motion.span
            initial={{ rotate: 0 }}
            animate={instant ? { rotate: 0 } : { rotate: [0, -12, 12, -8, 8, 0] }}
            transition={{ duration: 0.6, delay: supportDelay + 0.25 }}
            className='bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-full'
          >
            <Headset className='size-6' />
          </motion.span>
          <div className='min-w-0 flex-1'>
            <h2 className='text-primary-strong font-semibold'>{t('supportTitle')}</h2>
            <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('supportBody')}</p>
            <p className='text-muted-foreground mt-2 flex items-center gap-2 text-sm'>
              <Clock aria-hidden className='size-4 shrink-0' />
              {t('supportTime')}
            </p>
            {/* Còn lượt mời → gợi ý mời thêm, hiện sau vài giây; hết lượt → không hiện (mục 4). */}
            <AnimatePresence>
              {showMoreHint ? (
                <motion.p
                  initial={instant ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className='mt-2 text-sm'
                >
                  <Link
                    href={contractorMatchesRoute(projectId)}
                    onClick={backToList}
                    className='text-primary-strong font-medium underline underline-offset-4'
                  >
                    {t('remainingInvites', { count: remainingInvites(invitations ?? []) })}
                  </Link>
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Hai nút hiện sau cùng (mục 5). */}
        <motion.div
          initial={instant ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: actionsDelay }}
          className='flex flex-wrap justify-center gap-3'
        >
          <motion.span
            animate={instant ? { scale: 1 } : { scale: [1, 1.03, 1] }}
            transition={{ duration: 0.6, delay: actionsDelay + 0.35 }}
            className='inline-block'
          >
            <Button asChild className='min-w-52'>
              <Link
                href={contractorInvitationsRoute(projectId)}
                onClick={(event) => leaveTo(event, contractorInvitationsRoute(projectId), 'forward')}
              >
                {t('track')}
              </Link>
            </Button>
          </motion.span>
          {/* Còn lượt mời → nút thứ hai là "Mời thêm nhà thầu (còn x)", hiện ngay cùng nút
              chính (góp ý NT35: dòng gợi ý nhỏ bên trên dễ bị lỡ). Hết lượt → "Quay lại danh sách". */}
          <Button asChild variant='outline' className='border-primary/50 text-primary-strong min-w-52'>
            <Link href={contractorMatchesRoute(projectId)} onClick={backToList}>
              {invitesLeft > 0 ? t('inviteMore', { left: invitesLeft }) : tCommon('backToList')}
            </Link>
          </Button>
        </motion.div>

        {/* Dòng khoá hiện cuối cùng, sau cả nhịp thở của nút "Theo dõi yêu cầu". */}
        <motion.p
          initial={instant ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: privacyDelay }}
          className='text-muted-foreground flex items-center justify-center gap-2 text-sm'
        >
          <Lock className='size-3.5' />
          {t('privacy')}
        </motion.p>
      </div>

      <ProjectManagementOptionsDialog open={managementOpen} onOpenChange={setManagementOpen} projectId={projectId} />
    </motion.div>
  )
}

export function InviteSent(props: InviteSentProps) {
  return env.NEXT_PUBLIC_USE_MOCK_API ? <MockInviteSent {...props} /> : <QuotationTracker {...props} />
}
