import type { SupervisionPackage } from '@/shared/cms'

/**
 * Ghép dữ liệu BMT API vào các gói giám sát mock, THEO TỪNG FIELD — cùng luật với
 * trang gói thiết kế (`features/plans/api/plans.merge.ts`): field nào API có trả thì
 * hiện API, field nào API không có thì GIỮ NGUYÊN mock.
 *
 * Gói giám sát trên BE rất gọn (TDD-SUB-001): tên, mô tả dịch vụ tự do và MỘT lựa
 * chọn giá `ConstructionSite`; không quyền lợi, hạn mức, nhãn nổi bật hay quà. Nên
 * API chỉ ghi đè được `name` và `price` (cộng `id` để luồng mua chạy thật); còn thời
 * hạn, số lượt kiểm tra, câu "phù hợp khi…", các dòng lợi ích, badge khuyến nghị và
 * ảnh đều là của mock. Mô tả dịch vụ của API là một khối chữ tự do, không có chỗ
 * tương ứng trên thẻ (thẻ dựng từ danh sách dòng) nên không ghép.
 *
 * Khớp gói theo mã: `CHECK` ↔ tier `check`, `CONTROL` ↔ tier `control`. Gói `self`
 * (0đ, tự quản lý) không thể có trên BE vì giá công bố phải > 0 nên luôn là mock.
 *
 * Hàm thuần (không gọi mạng, không đọc kho) để kiểm được không cần backend.
 */

export interface BmtSupervisionOfferView {
  offerKey: 'Month' | 'Year' | 'ConstructionSite'
  price?: number | null
}

/** Phần của `GET /plans?kind=Supervision` (PublishedPlanItem) mà việc ghép cần. */
export interface BmtSupervisionPlanItem {
  planId?: string
  code: string
  kind: 'Design' | 'Supervision'
  revision?: { name?: string | null; offers?: BmtSupervisionOfferView[] }
}

/** Gói giám sát sau khi ghép. `offerKey` chỉ có khi gói đến từ API, để luồng mua gửi đúng. */
export type SupervisionPackageView = SupervisionPackage & { offerKey?: 'ConstructionSite' }

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function mergePackage(pkg: SupervisionPackageView, item: BmtSupervisionPlanItem): SupervisionPackageView {
  const revision = item.revision
  if (!revision) return pkg

  const name = text(revision.name)
  const price = revision.offers?.find(
    (offer) => offer.offerKey === 'ConstructionSite' && typeof offer.price === 'number' && offer.price > 0
  )?.price

  return {
    ...pkg,
    ...(name ? { name } : {}),
    ...(price ? { price } : {}),
    // Checkout chọn nhánh mua THEO DẠNG ID (UUID → đơn thật, còn lại → mock). Chỉ đổi
    // sang `planId` khi gói có giá để bán trên API; thiếu thì đơn thật bị BE từ chối,
    // nên để id mock cho an toàn.
    ...(item.planId && price ? { id: item.planId, offerKey: 'ConstructionSite' as const } : {})
  }
}

export function mergeApiIntoPackages(
  base: readonly SupervisionPackage[],
  items: readonly BmtSupervisionPlanItem[]
): SupervisionPackageView[] {
  const byCode = new Map(
    items.filter((item) => item.kind === 'Supervision').map((item) => [item.code.toUpperCase(), item])
  )

  return base.map((pkg) => {
    const item = byCode.get(pkg.tier.toUpperCase())
    return item ? mergePackage(pkg, item) : pkg
  })
}
