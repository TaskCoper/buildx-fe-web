'use client'

import { ArrowRight, Crown, Lightbulb, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useAccountPlan } from '@/features/account'
import { useBriefs, useCreateBrief } from '@/features/contractors'
import { useDesignStore, useProjects } from '@/features/design'
import { useRouter } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { useChatContextStore } from '@/shared/chat-context'
import { useCmsCollection } from '@/shared/cms'
import { TurnkeyRequestDialog } from '@/shared/components/common'
import { env } from '@/shared/config/env'
import { HOME_REMINDER_WAKE_EVENT, JOURNEY_POPUP_TEST_MODE } from '@/shared/constants'
import { ROUTES, contractorMatchesRoute, supervisionPlansRoute, supervisionRoute } from '@/shared/constants/routes'

type ReminderState = 'S1' | 'S2' | 'S3' | 'S4' | 'S5'
type ReminderStageKey = 'legal' | 'foundation' | 'structure' | 'mep' | 'finishing' | 'handover'

interface ReminderSnapshot {
  state: ReminderState
  projectId?: string
  projectName?: string
  contractorName?: string
  remaining?: number
  stageIndex?: number
  stageTotal?: number
  stageKey?: ReminderStageKey
}

interface ReminderMemory {
  lastShownAt: number
  lastDismissedAt?: number
  count: number
}

interface ReminderPolicy {
  delayMs: number
  cadenceMs: number
  maxShows?: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const AUTO_COLLAPSE_MS = 12_000
const ASSISTANT_FALLBACK_INSET = 178
const ASSISTANT_GAP = 14
const MARKETING_WINDOW_MS = 7 * DAY_MS
const MARKETING_MAX_PER_WEEK = 2
const MOCK_BRIEF_IDS = new Set(['SVC-2026-0001', 'SVC-2026-0002', 'SVC-2026-0003', 'SVC-2026-0004'])

const POLICY: Record<ReminderState, ReminderPolicy> = {
  S1: { delayMs: 8_000, cadenceMs: 3 * DAY_MS },
  S2: { delayMs: 2_000, cadenceMs: DAY_MS },
  S3: { delayMs: 2_000, cadenceMs: DAY_MS, maxShows: 3 },
  S4: { delayMs: 2_000, cadenceMs: 3 * DAY_MS, maxShows: 2 },
  S5: { delayMs: 450, cadenceMs: DAY_MS }
}

function reminderStorageKey(email: string, state: ReminderState): string {
  return `savico.home-reminder.${email.toLowerCase()}.${state}`
}

function marketingStorageKey(email: string): string {
  return `savico.home-reminder.${email.toLowerCase()}.marketing-week`
}

function readMarketingHistory(email: string): number[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(marketingStorageKey(email)) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    const cutoff = Date.now() - MARKETING_WINDOW_MS
    return parsed.filter((value): value is number => typeof value === 'number' && value >= cutoff)
  } catch {
    return []
  }
}

function readMemory(email: string, state: ReminderState): ReminderMemory {
  if (typeof window === 'undefined') return { lastShownAt: 0, count: 0 }
  try {
    const raw = window.localStorage.getItem(reminderStorageKey(email, state))
    if (!raw) return { lastShownAt: 0, count: 0 }
    const parsed = JSON.parse(raw) as Partial<ReminderMemory>
    return {
      lastShownAt: typeof parsed.lastShownAt === 'number' ? parsed.lastShownAt : 0,
      lastDismissedAt: typeof parsed.lastDismissedAt === 'number' ? parsed.lastDismissedAt : undefined,
      count: typeof parsed.count === 'number' ? parsed.count : 0
    }
  } catch {
    return { lastShownAt: 0, count: 0 }
  }
}

function writeShown(email: string, state: ReminderState): void {
  if (typeof window === 'undefined' || JOURNEY_POPUP_TEST_MODE) return
  const current = readMemory(email, state)
  window.localStorage.setItem(
    reminderStorageKey(email, state),
    JSON.stringify({ ...current, lastShownAt: Date.now(), count: current.count + 1 } satisfies ReminderMemory)
  )
  if (state !== 'S5') {
    window.localStorage.setItem(
      marketingStorageKey(email),
      JSON.stringify([...readMarketingHistory(email), Date.now()])
    )
  }
}

function writeDismissed(email: string, state: ReminderState): void {
  try {
    window.localStorage.setItem(
      reminderStorageKey(email, state),
      JSON.stringify({ ...readMemory(email, state), lastDismissedAt: Date.now() } satisfies ReminderMemory)
    )
  } catch {
    // The in-memory guard still prevents reopening during this visit.
  }
}

function canShowByFrequency(email: string, state: ReminderState): boolean {
  const memory = readMemory(email, state)
  if (memory.lastDismissedAt !== undefined && Date.now() - memory.lastDismissedAt < DAY_MS) return false
  if (JOURNEY_POPUP_TEST_MODE) return true
  const policy = POLICY[state]
  if (policy.maxShows !== undefined && memory.count >= policy.maxShows) return false
  return Date.now() - memory.lastShownAt >= policy.cadenceMs
}

function canShowMarketing(email: string, state: ReminderState): boolean {
  if (JOURNEY_POPUP_TEST_MODE || state === 'S5') return true
  return readMarketingHistory(email).length < MARKETING_MAX_PER_WEEK
}

function stageMessageKey(
  stageKey: ReminderStageKey
): 'stages.legal' | 'stages.foundation' | 'stages.structure' | 'stages.mep' | 'stages.finishing' | 'stages.handover' {
  return `stages.${stageKey}`
}

function interactionIsBusy(panelOpen: boolean): boolean {
  if (panelOpen) return true
  if (document.querySelector('[role="dialog"][data-state="open"]')) return true

  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return false
  if (active.matches('input, textarea, select, [contenteditable="true"]')) return true
  return false
}

export function HomeReminderHost() {
  const t = useTranslations('landing.homeReminder')
  const locale = useLocale()
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const { isAuthenticated, isInitialized, user } = useAuth()
  const isCustomer =
    isAuthenticated &&
    isInitialized &&
    user?.accountKind === 'Customer' &&
    !user.mustChangePassword &&
    user.emailVerified !== false
  const accountPlan = useAccountPlan(isCustomer)
  const projectsQuery = useProjects(isCustomer)
  const briefsQuery = useBriefs(isCustomer)

  const plans = useCmsCollection('plans')
  const invitations = useCmsCollection('contractorInvitations')
  const supervisionProjects = useCmsCollection('supervisionProjects')

  const openCreateProject = useDesignStore((state) => state.openCreateDialog)
  const createUploadBrief = useCreateBrief({ focus: 'documents' })

  const panelOpen = useChatContextStore((state) => state.panelOpen)
  const setDockSuppressed = useChatContextStore((state) => state.setDockSuppressed)

  const [snapshot, setSnapshot] = useState<ReminderSnapshot | null | undefined>(undefined)
  const [visible, setVisible] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [collapseCycle, setCollapseCycle] = useState(0)
  const [turnkeyOpen, setTurnkeyOpen] = useState(false)
  const [wakeVersion, setWakeVersion] = useState(0)
  const [assistantInset, setAssistantInset] = useState(ASSISTANT_FALLBACK_INSET)
  const snapshotTakenRef = useRef(false)
  const snapshotIdentityRef = useRef<string | null>(null)
  const eligibleAtRef = useRef(0)
  const dismissedRef = useRef(false)
  const reminderStateRef = useRef<ReminderState | null>(null)

  const advancedPlan = useMemo(() => plans.find((plan) => plan.tier === 'advanced'), [plans])

  useEffect(() => {
    const wake = () => {
      if (JOURNEY_POPUP_TEST_MODE && isAuthenticated) {
        setSnapshot((current) => current ?? { state: 'S1' })
      }
      setWakeVersion((value) => value + 1)
    }

    window.addEventListener(HOME_REMINDER_WAKE_EVENT, wake)
    return () => window.removeEventListener(HOME_REMINDER_WAKE_EVENT, wake)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isInitialized) return

    const identity = isAuthenticated && user?.email ? user.email.toLowerCase() : '__guest__'
    if (snapshotIdentityRef.current !== identity) {
      snapshotIdentityRef.current = identity
      snapshotTakenRef.current = false
    }

    if (snapshotTakenRef.current) return

    const commitSnapshot = (next: ReminderSnapshot | null) => {
      snapshotTakenRef.current = true
      queueMicrotask(() => setSnapshot(next))
    }

    if (!isAuthenticated || !user?.email) {
      commitSnapshot(null)
      return
    }

    if (!accountPlan.isFetched || !projectsQuery.isFetched || !briefsQuery.isFetched) return

    const projects = projectsQuery.data ?? []
    const projectIds = new Set(projects.map((project) => project.id))
    const allBriefs = briefsQuery.data ?? []
    const briefs = env.NEXT_PUBLIC_USE_MOCK_API
      ? allBriefs.filter((brief) => !MOCK_BRIEF_IDS.has(brief.id) || projectIds.has(brief.id))
      : allBriefs
    const briefIds = new Set(briefs.map((brief) => brief.id))
    const ownedIds = new Set([...projectIds, ...briefIds])

    const email = user.email.toLowerCase()
    const matchingSupervisionProjects = [...supervisionProjects]
      .filter((project) => project.customer?.email?.toLowerCase() === email || ownedIds.has(project.id))
      .sort((a, b) => b.activatedAt.localeCompare(a.activatedAt))

    // Phase hiện tại chưa có rule chọn dự án khi khách có nhiều dự án giám sát.
    // Khi đó chỉ bỏ qua reminder S5; các reminder hợp lệ khác vẫn được xét tiếp.
    const supervision = matchingSupervisionProjects.length === 1 ? matchingSupervisionProjects[0] : undefined

    if (supervision) {
      const pendingStage =
        supervision.stages.find(
          (stage) => stage.status === 'inProgress' && !stage.files.some((file) => file.by === 'KH')
        ) ?? null

      commitSnapshot(
        pendingStage
          ? {
              state: 'S5',
              projectId: supervision.id,
              projectName: supervision.projectName,
              stageIndex: pendingStage.index,
              stageTotal: supervision.stages.length,
              stageKey: pendingStage.key
            }
          : null
      )
      return
    }

    const relatedInvitations = [...invitations]
      .filter(
        (invitation) =>
          briefIds.has(invitation.projectId) &&
          invitation.status === 'accepted' &&
          invitation.survey.status === 'confirmed'
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    const latestInvitation = relatedInvitations[0]
    if (latestInvitation) {
      commitSnapshot({
        state: 'S4',
        projectId: latestInvitation.projectId,
        projectName: latestInvitation.projectName,
        contractorName: latestInvitation.contractorName
      })
      return
    }

    const readyBrief = [...briefs]
      .filter((brief) => brief.status === 'ready')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

    if (readyBrief) {
      commitSnapshot({ state: 'S3', projectId: readyBrief.id, projectName: readyBrief.name })
      return
    }

    const planActive = Boolean(
      accountPlan.data &&
      (!accountPlan.data.expiresAt ||
        Number.isNaN(Date.parse(accountPlan.data.expiresAt)) ||
        Date.parse(accountPlan.data.expiresAt) > Date.now())
    )

    if (planActive && projects.length === 0 && briefs.length === 0) {
      commitSnapshot({ state: 'S2', remaining: accountPlan.data?.design.remaining ?? 0 })
      return
    }

    if (!planActive) {
      commitSnapshot({ state: 'S1' })
      return
    }

    commitSnapshot(null)
  }, [
    accountPlan.data,
    accountPlan.isFetched,
    briefsQuery.data,
    briefsQuery.isFetched,
    invitations,
    isAuthenticated,
    isInitialized,
    projectsQuery.data,
    projectsQuery.isFetched,
    supervisionProjects,
    user?.email
  ])

  useEffect(() => {
    if (!snapshot) {
      eligibleAtRef.current = 0
      reminderStateRef.current = null
      return
    }

    if (reminderStateRef.current !== snapshot.state) {
      reminderStateRef.current = snapshot.state
      dismissedRef.current = false
    }

    eligibleAtRef.current = Date.now() + POLICY[snapshot.state].delayMs
  }, [snapshot])

  useEffect(() => {
    if (
      !snapshot ||
      !user?.email ||
      visible ||
      dismissedRef.current ||
      !canShowByFrequency(user.email, snapshot.state) ||
      !canShowMarketing(user.email, snapshot.state)
    ) {
      return
    }

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const attemptShow = () => {
      if (cancelled || !canShowByFrequency(user.email, snapshot.state)) return
      if (interactionIsBusy(panelOpen)) {
        retryTimer = setTimeout(attemptShow, 450)
        return
      }

      writeShown(user.email, snapshot.state)
      setVisible(true)
      setCollapsed(false)
      setCollapseCycle((value) => value + 1)
    }

    const remainingDelay =
      eligibleAtRef.current > 0 ? Math.max(0, eligibleAtRef.current - Date.now()) : POLICY[snapshot.state].delayMs
    const dueTimer = setTimeout(attemptShow, remainingDelay)
    return () => {
      cancelled = true
      clearTimeout(dueTimer)
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [panelOpen, snapshot, user?.email, visible, wakeVersion])

  useEffect(() => {
    if (!visible || collapsed) return
    const timer = setTimeout(() => setCollapsed(true), AUTO_COLLAPSE_MS)
    return () => clearTimeout(timer)
  }, [collapseCycle, collapsed, visible])

  useEffect(() => {
    setDockSuppressed(visible && !collapsed)
    return () => setDockSuppressed(false)
  }, [collapsed, setDockSuppressed, visible])

  useEffect(() => {
    if (!visible || !collapsed) return

    const updateInset = () => {
      const assistant = document.querySelector<HTMLElement>('[data-assistant-fab]')
      if (!assistant) {
        setAssistantInset(ASSISTANT_FALLBACK_INSET)
        return
      }

      const mobile = window.matchMedia('(max-width: 899px)').matches
      const measuredTarget = mobile
        ? (document.querySelector<HTMLElement>('[data-assistant-fab-core]') ?? assistant)
        : assistant
      const rect = measuredTarget.getBoundingClientRect()
      const rightInset = Math.max(24, window.innerWidth - rect.right)
      setAssistantInset(Math.ceil(rightInset + rect.width + ASSISTANT_GAP))
    }

    const frame = window.requestAnimationFrame(updateInset)
    const observer = new ResizeObserver(updateInset)
    const assistant = document.querySelector<HTMLElement>('[data-assistant-fab]')
    const assistantCore = document.querySelector<HTMLElement>('[data-assistant-fab-core]')
    if (assistant) observer.observe(assistant)
    if (assistantCore) observer.observe(assistantCore)
    window.addEventListener('resize', updateInset)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', updateInset)
    }
  }, [collapsed, visible])

  const closeReminder = () => {
    if (snapshot && user?.email) writeDismissed(user.email, snapshot.state)
    dismissedRef.current = true
    setVisible(false)
  }

  const handlePrimary = () => {
    if (!snapshot) return
    closeReminder()

    switch (snapshot.state) {
      case 'S1':
        router.push(ROUTES.PLANS)
        break
      case 'S2':
        openCreateProject()
        break
      case 'S3':
        if (snapshot.projectId) router.push(contractorMatchesRoute(snapshot.projectId))
        break
      case 'S4':
        if (snapshot.projectId) router.push(supervisionPlansRoute(snapshot.projectId))
        break
      case 'S5':
        if (snapshot.projectId) router.push(supervisionRoute(snapshot.projectId, snapshot.stageIndex))
        break
    }
  }

  const handleSecondary = () => {
    if (!snapshot) return
    closeReminder()

    switch (snapshot.state) {
      case 'S1':
        createUploadBrief.mutate()
        break
      case 'S2':
        router.push(`${ROUTES.HANDBOOK}?tab=library`)
        break
      case 'S3':
        setTurnkeyOpen(true)
        break
      default:
        break
    }
  }

  const priceFormatter = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US')
  const plusCredits = advancedPlan?.designCredits ?? 10
  const plusPrice = priceFormatter.format(advancedPlan?.price ?? 1_490_000)

  const title = snapshot
    ? snapshot.state === 'S1'
      ? t('S1.title')
      : snapshot.state === 'S2'
        ? t('S2.title', { remaining: snapshot.remaining ?? 0 })
        : snapshot.state === 'S3'
          ? t('S3.title', { project: snapshot.projectName ?? '' })
          : snapshot.state === 'S4'
            ? t('S4.title', { contractor: snapshot.contractorName ?? '' })
            : t('S5.title')
    : ''

  const body = snapshot
    ? snapshot.state === 'S1'
      ? t('S1.body', { credits: plusCredits, edits: plusCredits, price: plusPrice })
      : snapshot.state === 'S2'
        ? t('S2.body')
        : snapshot.state === 'S3'
          ? t('S3.body')
          : snapshot.state === 'S4'
            ? t('S4.body')
            : t('S5.body', {
                project: snapshot.projectName ?? '',
                stage: snapshot.stageIndex ?? 1,
                total: snapshot.stageTotal ?? 6,
                stageName: snapshot.stageKey ? t(stageMessageKey(snapshot.stageKey)) : ''
              })
    : ''

  const primaryLabel = snapshot ? t(`${snapshot.state}.primary`) : ''
  const secondaryLabel =
    snapshot && (snapshot.state === 'S1' || snapshot.state === 'S2' || snapshot.state === 'S3')
      ? t(`${snapshot.state}.secondary`)
      : null

  return (
    <>
      <AnimatePresence mode='wait'>
        {visible && snapshot ? (
          collapsed ? (
            <motion.button
              key='collapsed'
              type='button'
              data-home-reminder-pill
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => {
                setCollapsed(false)
                setCollapseCycle((value) => value + 1)
              }}
              style={{ '--home-reminder-right': `${assistantInset}px` } as React.CSSProperties}
              className='fixed right-[var(--home-reminder-right)] bottom-6 z-[55] inline-flex h-[48px] items-center gap-2.5 rounded-full brand-green-button px-4 pr-5 text-[14px] font-bold text-white shadow-[0_14px_32px_-14px_rgba(42,117,63,.55)] transition-[right,background-color,box-shadow] duration-200 ease-out hover:shadow-[0_16px_36px_-14px_rgba(42,117,63,.62)] max-[899px]:!right-0 max-[899px]:left-0 max-[899px]:mx-auto max-[899px]:w-fit'
            >
              <span className='flex size-6 items-center justify-center rounded-full bg-[#f36a16] text-xs font-extrabold text-white'>
                1
              </span>
              {t('collapsed')}
            </motion.button>
          ) : (
            <motion.aside
              key='expanded'
              data-home-reminder-card
              initial={reduceMotion ? false : { opacity: 0, x: 18, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, y: 8, scale: 0.99 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              className='fixed right-3 bottom-3 z-[55] w-[calc(100vw-24px)] max-w-[570px] overflow-hidden rounded-[22px] border border-accent bg-white text-[#202623] shadow-[0_22px_55px_-25px_rgba(42,117,63,.36)] sm:right-6 sm:bottom-6'
            >
              <div className='relative px-7 pt-5 pb-5 max-sm:px-5'>
                <button
                  type='button'
                  aria-label={t('collapse')}
                  onClick={closeReminder}
                  className='absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-[#f3f5f3] text-[#303734] transition-colors duration-150 hover:bg-[#eaeeeb]'
                >
                  <X className='size-4.5' />
                </button>

                <div className='pr-14'>
                  <p className='flex items-center gap-2 max-md:text-xs text-[11px] font-extrabold tracking-[0.18em] text-primary-strong uppercase'>
                    <span className='size-2 rounded-full bg-primary-strong' />
                    {t('eyebrow')}
                  </p>
                  <h3 className='mt-2 max-w-[440px] text-[20px] leading-[1.18] font-extrabold tracking-[-0.02em]'>
                    {title}
                  </h3>
                  <p className='mt-2 max-w-[470px] text-[14px] leading-[1.55] text-[#7a847d]'>{body}</p>
                </div>

                <motion.button
                  type='button'
                  onClick={handlePrimary}
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className='mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(to_top,var(--brand-gradient-from)_0%,var(--brand-gradient-to)_100%)] px-4 text-[15px] font-extrabold text-white shadow-[0_8px_18px_-10px_rgba(42,117,63,.42)] transition-[filter,box-shadow] duration-180 hover:brightness-[1.015] hover:shadow-[0_10px_20px_-10px_rgba(42,117,63,.46)]'
                >
                  {snapshot.state === 'S1' ? <Crown className='size-4' /> : <Lightbulb className='size-4' />}
                  {primaryLabel}
                  <ArrowRight className='size-4' />
                </motion.button>

                {secondaryLabel ? (
                  <button
                    type='button'
                    onClick={handleSecondary}
                    className='mx-auto mt-4 block text-[13px] font-bold text-primary-strong transition-colors duration-150 hover:text-primary-strong'
                  >
                    {secondaryLabel}
                  </button>
                ) : null}
              </div>

              <span aria-hidden className='absolute right-0 bottom-0 left-0 h-[4px] bg-accent' />
              <motion.span
                key={collapseCycle}
                aria-hidden
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_COLLAPSE_MS / 1000, ease: 'linear' }}
                className='absolute right-0 bottom-0 left-0 h-[4px] origin-left bg-primary-strong'
              />
            </motion.aside>
          )
        ) : null}
      </AnimatePresence>

      <TurnkeyRequestDialog open={turnkeyOpen} onOpenChange={setTurnkeyOpen} />
    </>
  )
}
