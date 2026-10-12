import type { PlanGift, SubscriptionPlan } from './cms.types'
import { PLAN_TOGGLE_KEYS } from './plans'
import { readPlanMetadata, type PlanMetadata } from './plan-metadata'

export type PlanView = SubscriptionPlan & { gift?: PlanGift }

/** Published API plans are the only source of design cards. */

export interface BmtQuotaView {
  code: string
  label?: string
  isUnlimited: boolean
  limit?: number | null
}

export interface BmtOfferView {
  offerKey: 'Month' | 'Year' | 'ConstructionSite'
  price?: number | null
  quotas?: BmtQuotaView[]
}

export interface BmtDisplayBenefitView {
  code: string
  enabled: boolean
  displayText?: string | null
}

export interface BmtRevisionView {
  metadata?: PlanMetadata | null
  name?: string | null
  consultationText?: string | null
  coverImageUrl?: string | null
  isHighlighted?: boolean
  highlightLabel?: string | null
  giftDescription?: string | null
  giftConditions?: string | null
  offers?: BmtOfferView[]
  displayBenefits?: BmtDisplayBenefitView[]
}

/** Phần của `GET /plans` (PublishedPlanItem) mà việc ghép cần. */
export interface BmtPublishedPlanItem {
  planId?: string
  code: string
  kind: 'Design' | 'Supervision'
  revision?: BmtRevisionView
}

const TIERS = ['basic', 'advanced', 'pro'] as const

/** CMS input is ignored; retained in the signature for callers of the previous mapper. */
export function mergeApiIntoPlans(_base: readonly PlanView[], items: readonly BmtPublishedPlanItem[]): PlanView[] {
  return (
    items
      .filter((item) => item.kind === 'Design')
      .map<PlanView>((item) => {
        const revision = item.revision
        if (
          !item.planId ||
          !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.planId) ||
          item.planId === '00000000-0000-0000-0000-000000000000' ||
          !revision ||
          !revision.name?.trim()
        )
          throw new Error('Invalid published design plan')
        const metadata = readPlanMetadata(revision.metadata)
        if (metadata?.supervisionCard) throw new Error('Invalid design plan metadata kind')
        const card = metadata?.designCard
        const cycles: NonNullable<PlanView['cycles']> = {}
        for (const offer of revision.offers ?? []) {
          if (offer.offerKey !== 'Month' && offer.offerKey !== 'Year') continue
          if (
            typeof offer.price !== 'number' ||
            !Number.isSafeInteger(offer.price) ||
            offer.price <= 0 ||
            !Array.isArray(offer.quotas)
          )
            throw new Error('Invalid published design offer')
          for (const quota of offer.quotas) {
            if (
              !quota ||
              !['design.generate', 'catalog.detail'].includes(quota.code) ||
              typeof quota.isUnlimited !== 'boolean' ||
              (!quota.isUnlimited &&
                (typeof quota.limit !== 'number' || !Number.isSafeInteger(quota.limit) || quota.limit <= 0))
            )
              throw new Error('Invalid published design quota')
          }
          if (cycles[offer.offerKey]) throw new Error('Duplicate published design offer')
          cycles[offer.offerKey] = { price: offer.price, quotas: offer.quotas }
        }
        if (!Object.keys(cycles).length) throw new Error('Missing published design offer')
        const giftTitle = card ? card.giftTitle?.trim() : revision.giftDescription?.trim()
        const giftConditions = card ? (card.giftConditionsShort ?? '') : (revision.giftConditions?.trim() ?? '')
        return {
          id: item.planId,
          code: item.code,
          tier: 'basic',
          name: revision.name.trim(),
          apiPlan: true,
          metadata,
          cycles,
          price: cycles.Month?.price ?? cycles.Year?.price ?? 0,
          imageUrl: revision.coverImageUrl?.trim() ?? '',
          shortLabel: revision.highlightLabel?.trim() ?? '',
          popular: revision.isHighlighted === true,
          fitLine: card?.fitLine ?? '',
          ctaLabel: card?.buttonLabel ?? '',
          status: 'selling',
          designCredits:
            cycles.Month?.quotas?.find((quota) => quota.code === 'design.generate' && !quota.isUnlimited)?.limit ?? 0,
          libraryCredits:
            cycles.Month?.quotas?.find((quota) => quota.code === 'catalog.detail' && !quota.isUnlimited)?.limit ?? 0,
          benefits: {
            layout: { level: 'none' },
            interiorEstimate: { level: 'none' },
            advisory: { level: 'none' },
            toggles: Object.fromEntries(
              PLAN_TOGGLE_KEYS.map((key) => [key, { enabled: false }])
            ) as PlanView['benefits']['toggles']
          },
          highlights: [],
          giftId: null,
          giftConditions,
          ...(giftTitle
            ? {
                gift: {
                  title: giftTitle,
                  description: card ? '' : (revision.giftDescription?.trim() ?? ''),
                  value: card?.giftValue ?? 0,
                  extraBody: card?.giftExtraBody ?? '',
                  conditionsShort: giftConditions,
                  conditions: giftConditions,
                  imageUrl: card?.giftImageUrl?.trim() || undefined
                }
              }
            : {})
        }
      })
      .sort((a, b) => (a.metadata?.designCard?.displayOrder ?? 10000) - (b.metadata?.designCard?.displayOrder ?? 10000))
      // Slots only support the existing comparison/animation layout; they never select content or permissions.
      .map((plan, index) => ({ ...plan, tier: TIERS[index] ?? 'basic' }))
  )
}
