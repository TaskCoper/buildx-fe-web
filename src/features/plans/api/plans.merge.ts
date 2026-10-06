import type { PlanView } from '../types/plan.types'

/**
 * Ghép dữ liệu BMT API vào ba gói mock, THEO TỪNG FIELD.
 *
 * Quy tắc (chốt với người dùng): field nào API có trả thì hiện API; field nào API
 * không có thì GIỮ NGUYÊN mock — không bỏ mock. Mock là nền đầy đủ của thẻ gói
 * (đối tượng phù hợp, nhãn nút, quyền lợi nổi bật, mức bố cục / dự toán, quà tặng
 * có giá trị…), API chỉ ghi đè những gì nó thật sự mô tả được.
 *
 * Hai con số hạn mức lấy từ API theo mã quyền lợi (đã đối chiếu với
 * `GET /admin/benefit-definitions`, cả hai đều kiểu Quota):
 *   - `design.generate` → "Số phương án thiết kế mới"  → `designCredits`
 *   - `catalog.detail`  → "Tra cứu thư viện mẫu"        → `libraryCredits`
 *
 * Khớp gói theo mã (BASIC / PLUS / PRO). Gói chỉ có ở mock thì giữ nguyên; gói chỉ
 * có ở API (mã lạ) bị bỏ qua vì trang chỉ có ba hạng.
 *
 * Hàm thuần (không gọi mạng, không đọc kho) để kiểm được không cần backend.
 */

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

const DESIGN_QUOTA = 'design.generate'
const LIBRARY_QUOTA = 'catalog.detail'

/** Chuỗi có nội dung thật, hoặc `undefined` — API hay trả "" / null cho field chưa nhập. */
function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Offer `Month` trước vì đó là chu kỳ trang Bảng giá đang hiển thị. */
function ordered(offers: BmtOfferView[]): BmtOfferView[] {
  return [...offers].sort((a, b) => Number(b.offerKey === 'Month') - Number(a.offerKey === 'Month'))
}

/**
 * Hạn mức của một mã. `undefined` khi không có dữ liệu dùng được: mã không có, hoặc
 * gói để "không giới hạn" / thiếu `limit` — giao diện chỉ in được một con số, in `0`
 * cho gói không giới hạn là nói sai, nên những trường hợp đó giữ số của mock.
 */
function quotaOf(offers: BmtOfferView[], code: string): number | undefined {
  for (const offer of ordered(offers)) {
    const quota = offer.quotas?.find((item) => item.code.toLowerCase() === code)
    if (quota && !quota.isUnlimited && typeof quota.limit === 'number') return quota.limit
  }
  return undefined
}

/** Hạn mức của một mã TRONG một offer cụ thể (khác `quotaOf` — lấy offer Month trước). */
function quotaInOffer(offer: BmtOfferView, code: string): number | undefined {
  const quota = offer.quotas?.find((item) => item.code.toLowerCase() === code)
  return quota && !quota.isUnlimited && typeof quota.limit === 'number' ? quota.limit : undefined
}

/** Giá + hạn mức của từng chu kỳ (Tháng / Năm) có giá hợp lệ trong các offer của API. */
function cyclesOf(offers: BmtOfferView[]): NonNullable<PlanView['cycles']> {
  const cycles: NonNullable<PlanView['cycles']> = {}
  for (const offer of offers) {
    if (offer.offerKey !== 'Month' && offer.offerKey !== 'Year') continue
    if (typeof offer.price !== 'number' || offer.price <= 0) continue
    const design = quotaInOffer(offer, DESIGN_QUOTA)
    const library = quotaInOffer(offer, LIBRARY_QUOTA)
    cycles[offer.offerKey] = {
      price: offer.price,
      ...(design !== undefined ? { designCredits: design } : {}),
      ...(library !== undefined ? { libraryCredits: library } : {})
    }
  }
  return cycles
}

function mergeToggles(
  base: PlanView['benefits']['toggles'],
  benefits: BmtDisplayBenefitView[]
): PlanView['benefits']['toggles'] {
  const next = { ...base }
  const keys = Object.keys(base) as (keyof typeof base)[]
  for (const benefit of benefits) {
    // Mã API dạng "design.render3d" — khớp theo đoạn cuối với khóa của bảng so sánh.
    const leaf = benefit.code.split('.').pop()?.toLowerCase()
    const key = keys.find((candidate) => candidate.toLowerCase() === leaf)
    if (!key) continue
    const note = text(benefit.displayText)
    next[key] = benefit.enabled ? (note ? { enabled: true, text: note } : { enabled: true }) : { enabled: false }
  }
  return next
}

function mergePlan(plan: PlanView, item: BmtPublishedPlanItem): PlanView {
  const revision = item.revision
  if (!revision) return plan

  const offers = revision.offers ?? []
  const price = ordered(offers).find((offer) => typeof offer.price === 'number' && offer.price > 0)?.price
  const cycles = cyclesOf(offers)
  // Checkout chọn nhánh mua THEO DẠNG ID: UUID → `POST /payment-orders` thật, còn lại →
  // đơn mock. Nên gói đã có bản bán trên API phải mang `planId` làm `id`, nếu không thẻ hiện
  // số liệu của API mà bấm mua lại chạy bằng mock. Chỉ đổi khi có ít nhất một chu kỳ có giá để
  // bán; thiếu thì đơn thật sẽ bị BE từ chối, để lại id mock an toàn hơn. Trang khoá nút mua
  // ở chu kỳ mà gói không có offer, nên đơn không bao giờ xin một offer không tồn tại.
  const purchasable = Object.keys(cycles).length > 0
  const name = text(revision.name)
  const shortLabel = text(revision.highlightLabel)
  const imageUrl = text(revision.coverImageUrl)
  const consultation = text(revision.consultationText)
  const giftConditions = text(revision.giftConditions)
  const giftDescription = text(revision.giftDescription)

  return {
    ...plan,
    ...(item.planId && purchasable ? { id: item.planId } : {}),
    ...(purchasable ? { cycles } : {}),
    ...(name ? { name } : {}),
    ...(shortLabel ? { shortLabel } : {}),
    ...(typeof revision.isHighlighted === 'boolean' ? { popular: revision.isHighlighted } : {}),
    ...(price ? { price } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    designCredits: quotaOf(offers, DESIGN_QUOTA) ?? plan.designCredits,
    libraryCredits: quotaOf(offers, LIBRARY_QUOTA) ?? plan.libraryCredits,
    benefits: {
      ...plan.benefits,
      toggles: mergeToggles(plan.benefits.toggles, revision.displayBenefits ?? []),
      // "Hình thức tư vấn": API có câu chữ thì hiện đúng câu đó (level `custom`),
      // không có thì giữ mức cấp độ của mock.
      ...(consultation ? { advisory: { level: 'custom' as const, text: consultation } } : {})
    },
    ...(giftConditions ? { giftConditions } : {}),
    // Quà tặng của mock có giá trị quy đổi còn API thì không → chỉ ghi đè chữ, và
    // chỉ khi mock đã có quà (API không đủ dữ liệu để tự dựng một khối quà).
    ...(plan.gift && (giftConditions || giftDescription)
      ? {
          gift: {
            ...plan.gift,
            ...(giftConditions ? { conditions: giftConditions } : {}),
            ...(giftDescription ? { description: giftDescription } : {})
          }
        }
      : {})
  }
}

export function mergeApiIntoPlans(base: PlanView[], items: BmtPublishedPlanItem[]): PlanView[] {
  const byCode = new Map(items.filter((item) => item.kind === 'Design').map((item) => [item.code.toUpperCase(), item]))

  return base.map((plan) => {
    const item = plan.code ? byCode.get(plan.code.toUpperCase()) : undefined
    return item ? mergePlan(plan, item) : plan
  })
}
