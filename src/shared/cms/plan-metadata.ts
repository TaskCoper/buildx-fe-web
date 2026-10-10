import type { PlanCycle, PlanHighlightKey, SubscriptionPlan } from './cms.types'
import { isBenefitEnabled, levelDisplay, toggleDisplay } from './plans'

export interface PlanMetadataBenefit {
  id: string
  text: string
  visible: boolean
}

export interface SupervisionCardMetadata {
  displayOrder?: number | null
  tagline?: string | null
  fitLine?: string | null
  durationText?: string | null
  inspectionText?: string | null
  recommended: boolean
  recommendedLabel?: string | null
  buttonLabel?: string | null
}

export interface DesignCardMetadata {
  displayOrder?: number | null
  tagline?: string | null
  fitLine?: string | null
  featuresTitle?: string | null
  buttonLabel?: string | null
  giftTitle?: string | null
  giftExtraBody?: string | null
  giftConditionsShort?: string | null
  giftImageUrl?: string | null
  giftValue?: number | null
}

export interface PlanMetadata {
  displayBenefits: PlanMetadataBenefit[]
  supervisionCard?: SupervisionCardMetadata | null
  designCard?: DesignCardMetadata | null
}

export interface PlanQuota {
  code: string
  isUnlimited: boolean
  limit?: number | null
}

export interface PlanHighlightLabels {
  row: (key: PlanHighlightKey) => string
  level: (key: string) => string
  quota: (key: 'designCredits' | 'libraryCredits', count: number) => string
  unlimited: (key: 'designCredits' | 'libraryCredits') => string
}

const LEVEL_LABELS: Record<string, Record<string, string>> = {
  layout: { basic: 'layoutBasic', '2d3d': 'layout2d3d', '2d3dPlus': 'layout2d3dPlus' },
  interiorEstimate: { rough: 'estimateRough', detailed: 'estimateDetailed', optimized: 'estimateOptimized' },
  advisory: { online: 'advisoryOnline', priority: 'advisoryPriority', expert: 'advisoryExpert' }
}

/** API boundaries must reject corrupt configured metadata instead of restoring legacy text. */
export function readPlanMetadata(value: unknown): PlanMetadata | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid plan metadata')
  const root = value as Record<string, unknown>
  if (
    Object.keys(root).some((key) => !['displayBenefits', 'supervisionCard', 'designCard'].includes(key)) ||
    !Array.isArray(root.displayBenefits) ||
    root.displayBenefits.length > 20
  )
    throw new Error('Invalid plan metadata benefits')
  const ids = new Set<string>()
  const displayBenefits = root.displayBenefits.map((value): PlanMetadataBenefit => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid plan metadata benefit')
    const item = value as Record<string, unknown>
    if (
      Object.keys(item).some((key) => !['id', 'text', 'visible'].includes(key)) ||
      typeof item.id !== 'string' ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.id) ||
      item.id === '00000000-0000-0000-0000-000000000000' ||
      ids.has(item.id.toLowerCase()) ||
      typeof item.text !== 'string' ||
      item.text.trim().length < 1 ||
      item.text.trim().length > 1000 ||
      typeof item.visible !== 'boolean'
    )
      throw new Error('Invalid plan metadata benefit')
    ids.add(item.id.toLowerCase())
    return { id: item.id, text: item.text.trim(), visible: item.visible }
  })
  let supervisionCard: SupervisionCardMetadata | undefined
  if (root.supervisionCard != null) {
    if (typeof root.supervisionCard !== 'object' || Array.isArray(root.supervisionCard))
      throw new Error('Invalid supervision card metadata')
    const card = root.supervisionCard as Record<string, unknown>
    const textKeys = [
      'tagline',
      'fitLine',
      'durationText',
      'inspectionText',
      'recommendedLabel',
      'buttonLabel'
    ] as const
    if (
      Object.keys(card).some((key) => ![...textKeys, 'recommended', 'displayOrder'].includes(key)) ||
      (card.recommended !== undefined && typeof card.recommended !== 'boolean')
    )
      throw new Error('Invalid supervision card metadata')
    supervisionCard = { recommended: card.recommended === true }
    if (card.displayOrder != null) {
      if (
        typeof card.displayOrder !== 'number' ||
        !Number.isInteger(card.displayOrder) ||
        card.displayOrder < 1 ||
        card.displayOrder > 9999
      )
        throw new Error('Invalid supervision card display order')
      supervisionCard.displayOrder = card.displayOrder
    }
    for (const key of textKeys) {
      const value = card[key]
      if (value != null && (typeof value !== 'string' || value.trim().length > 1000))
        throw new Error('Invalid supervision card metadata text')
      supervisionCard[key] = typeof value === 'string' ? value.trim() : ''
    }
  }
  let designCard: DesignCardMetadata | undefined
  if (root.designCard != null) {
    if (typeof root.designCard !== 'object' || Array.isArray(root.designCard))
      throw new Error('Invalid design card metadata')
    const card = root.designCard as Record<string, unknown>
    const textKeys = [
      'tagline',
      'fitLine',
      'featuresTitle',
      'buttonLabel',
      'giftTitle',
      'giftExtraBody',
      'giftConditionsShort'
    ] as const
    if (Object.keys(card).some((key) => ![...textKeys, 'giftImageUrl', 'giftValue', 'displayOrder'].includes(key)))
      throw new Error('Invalid design card metadata')
    designCard = {}
    for (const key of textKeys) {
      const value = card[key]
      if (value != null && (typeof value !== 'string' || value.trim().length > 1000))
        throw new Error('Invalid design card metadata text')
      designCard[key] = typeof value === 'string' ? value.trim() : ''
    }
    for (const key of ['displayOrder', 'giftValue'] as const) {
      const value = card[key]
      if (value == null) continue
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < (key === 'displayOrder' ? 1 : 0) ||
        (key === 'displayOrder' && value > 9999)
      )
        throw new Error('Invalid design card metadata number')
      designCard[key] = value
    }
    if (card.giftImageUrl != null && typeof card.giftImageUrl !== 'string') throw new Error('Invalid design card image')
    const giftImageUrl = typeof card.giftImageUrl === 'string' ? card.giftImageUrl.trim() : ''
    if (giftImageUrl) {
      let url: URL
      try {
        url = new URL(giftImageUrl)
      } catch {
        throw new Error('Invalid design card image')
      }
      if (
        giftImageUrl.length > 2048 ||
        /\s/.test(giftImageUrl) ||
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.port ||
        !/^[a-z0-9.-]+$/i.test(url.hostname) ||
        /^\d+(?:\.\d+){3}$/.test(url.hostname)
      )
        throw new Error('Invalid design card image')
    }
    designCard.giftImageUrl = giftImageUrl
  }
  const result: PlanMetadata = {
    displayBenefits,
    ...(supervisionCard ? { supervisionCard } : {}),
    ...(designCard ? { designCard } : {})
  }
  if (new TextEncoder().encode(JSON.stringify(result)).length > 128 * 1024)
    throw new Error('Plan metadata is too large')
  return result
}

export function legacyPlanHighlights(
  plan: SubscriptionPlan,
  labels: PlanHighlightLabels,
  includeQuotas = true
): string[] {
  return plan.highlights.flatMap((key) => {
    if (!isBenefitEnabled(plan, key)) return []
    if (key === 'designCredits' || key === 'libraryCredits') return includeQuotas ? [labels.quota(key, plan[key])] : []
    if (key === 'layout' || key === 'interiorEstimate' || key === 'advisory') {
      const display = levelDisplay(plan.benefits[key])
      if (display.kind === 'text') return [display.text]
      const level = display.kind === 'level' ? LEVEL_LABELS[key]?.[display.level] : undefined
      return [level ? `${labels.row(key)}: ${labels.level(level)}` : labels.row(key)]
    }
    const display = toggleDisplay(plan.benefits.toggles[key])
    return [display.kind === 'text' ? display.text : labels.row(key)]
  })
}

export function planHighlightLines(plan: SubscriptionPlan, cycle: PlanCycle, labels: PlanHighlightLabels): string[] {
  if (!plan.apiPlan) return legacyPlanHighlights(plan, labels)
  const quotas = plan.cycles?.[cycle]?.quotas ?? []
  const lines = (['design.generate', 'catalog.detail'] as const).flatMap((code) => {
    const quota = quotas.find((item) => item.code === code)
    if (!quota) return []
    const key = code === 'design.generate' ? 'designCredits' : 'libraryCredits'
    if (quota.isUnlimited) return [labels.unlimited(key)]
    return typeof quota.limit === 'number' && quota.limit > 0 ? [labels.quota(key, quota.limit)] : []
  })
  const metadata = readPlanMetadata(plan.metadata)
  return [...lines, ...(metadata?.displayBenefits.filter((item) => item.visible).map((item) => item.text) ?? [])]
}

/** First edit of a legacy revision only; opening the form never persists this seed. */
export function seedPlanMetadata(
  plan: SubscriptionPlan,
  consultationText: string | null | undefined,
  labels: PlanHighlightLabels
): PlanMetadata {
  const consultation = consultationText?.trim()
  const current = consultation
    ? { ...plan, benefits: { ...plan.benefits, advisory: { level: 'custom' as const, text: consultation } } }
    : plan
  return {
    displayBenefits: legacyPlanHighlights(current, labels, false).map((text) => ({
      id: crypto.randomUUID(),
      text,
      visible: true
    }))
  }
}
