import type { SupervisionPackage } from './cms.types'
import { readPlanMetadata, type PlanMetadata } from './plan-metadata'

/** Mỗi gói API tạo một thẻ. CMS chỉ giữ nội dung cho revision cũ chưa cấu hình metadata. */

export interface BmtSupervisionOfferView {
  offerKey: 'Month' | 'Year' | 'ConstructionSite'
  price?: number | null
}

/** Phần của `GET /plans?kind=Supervision` (PublishedPlanItem) mà việc ghép cần. */
export interface BmtSupervisionPlanItem {
  planId?: string
  code: string
  kind: 'Design' | 'Supervision'
  revision?: {
    name?: string | null
    coverImageUrl?: string | null
    offers?: BmtSupervisionOfferView[]
    metadata?: PlanMetadata | null
  }
}

/** Gói giám sát sau khi ghép. `offerKey` chỉ có khi gói đến từ API, để luồng mua gửi đúng. */
export type SupervisionPackageView = SupervisionPackage & {
  offerKey?: 'ConstructionSite'
  card?: PlanMetadata['supervisionCard']
  legacy?: boolean
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Only API plans create cards. CMS may supply presentation for the matching legacy revision. */
export function mergeApiIntoPackages(
  base: readonly SupervisionPackage[],
  items: readonly BmtSupervisionPlanItem[]
): SupervisionPackageView[] {
  return (
    items
      .filter((item) => item.kind === 'Supervision')
      .map<SupervisionPackageView>((item) => {
        const revision = item.revision
        const offer = revision?.offers?.find((entry) => entry.offerKey === 'ConstructionSite')
        if (
          !item.planId ||
          !revision ||
          typeof offer?.price !== 'number' ||
          !Number.isSafeInteger(offer.price) ||
          offer.price < 0 ||
          !text(revision.name)
        )
          throw new Error('Invalid published supervision plan')
        const legacy = base.find((pkg) => pkg.tier.toUpperCase() === item.code.toUpperCase())
        const metadata = readPlanMetadata(revision.metadata)
        const card = metadata?.supervisionCard
        return {
          id: item.planId,
          tier: legacy?.tier ?? (offer.price === 0 ? 'self' : card?.recommended ? 'control' : 'check'),
          name: text(revision.name)!,
          price: offer.price,
          durationMonths: legacy?.durationMonths ?? 0,
          inspections: legacy?.inspections ?? null,
          fitLine: card ? (card.fitLine ?? '') : (legacy?.fitLine ?? ''),
          benefits:
            metadata !== null
              ? metadata.displayBenefits.filter((line) => line.visible).map((line) => line.text)
              : (legacy?.benefits ?? []),
          recommended: card ? card.recommended : (legacy?.recommended ?? false),
          imageUrl: revision.coverImageUrl !== undefined ? text(revision.coverImageUrl) : legacy?.imageUrl,
          offerKey: 'ConstructionSite',
          card,
          legacy: Boolean(legacy)
        }
      })
      // Stable sort preserves API order for equal values and legacy plans without an order.
      .sort((a, b) => (a.card?.displayOrder ?? 10000) - (b.card?.displayOrder ?? 10000))
  )
}

/** Seed chỉ các dòng quyền lợi trên thẻ khi mở sửa revision legacy; không ghi dữ liệu. */
export function seedSupervisionPlanMetadata(pkg: Pick<SupervisionPackage, 'benefits'>): PlanMetadata {
  return { displayBenefits: pkg.benefits.map((text) => ({ id: crypto.randomUUID(), text, visible: true })) }
}
