import type {
  CmsGift,
  PlanBenefits,
  PlanGift,
  PlanHighlightKey,
  PlanToggleBenefitKey,
  SubscriptionPlan
} from './cms.types'

/**
 * Quy tắc dùng chung của gói thiết kế (epic DesignPackageManagement) — admin
 * cấu hình, trang Bảng giá và checkout đọc CÙNG các hàm này nên "tổng quan và
 * bảng so sánh dùng chung một nguồn" đúng theo nghĩa đen.
 */

/** Các nhóm quyền lợi bật/tắt, theo đúng thứ tự dòng của bảng so sánh công khai. */
export const PLAN_TOGGLE_GROUPS: readonly { group: 'design' | 'compare' | 'support'; keys: PlanToggleBenefitKey[] }[] =
  [
    {
      group: 'design',
      keys: [
        'uploadPhoto',
        'siteInfo',
        'buildingType',
        'style',
        'renderImages',
        'structureEstimate',
        'finishingEstimate',
        'materialList',
        'boq',
        'exportDossier',
        'contractorPack'
      ]
    },
    {
      group: 'compare',
      keys: ['compareOptions', 'compareCost', 'compareMaterial', 'optimizeBudget', 'costDelta', 'materialAlternatives']
    },
    { group: 'support', keys: ['render3d'] }
  ]

export const PLAN_TOGGLE_KEYS: readonly PlanToggleBenefitKey[] = PLAN_TOGGLE_GROUPS.flatMap((group) => group.keys)

/** Giới hạn độ dài nội dung tùy chọn của một quyền lợi. */
export const PLAN_BENEFIT_TEXT_MAX = 200

/**
 * Giá trị hiển thị của một quyền lợi trên bảng công khai:
 * `off` → gạch ngang, `check` → dấu tích, `text` → nội dung admin nhập,
 * `level` → nhãn cấp độ dịch sẵn (Cơ bản, 2D & 3D…).
 */
export type PlanBenefitDisplay =
  | { kind: 'off' }
  | { kind: 'check' }
  | { kind: 'text'; text: string }
  | { kind: 'level'; level: string }

export function toggleDisplay(benefit: PlanBenefits['toggles'][PlanToggleBenefitKey]): PlanBenefitDisplay {
  if (!benefit.enabled) return { kind: 'off' }
  const text = benefit.text?.trim()
  return text ? { kind: 'text', text } : { kind: 'check' }
}

export function levelDisplay(value: { level: string; text?: string }): PlanBenefitDisplay {
  if (value.level === 'none') return { kind: 'off' }
  if (value.level === 'custom') {
    const text = value.text?.trim()
    return text ? { kind: 'text', text } : { kind: 'check' }
  }
  return { kind: 'level', level: value.level }
}

/** Quyền lợi đang bật (dùng để chặn chọn nổi bật một quyền lợi đã tắt — §5). */
export function isBenefitEnabled(plan: Pick<SubscriptionPlan, 'benefits'>, key: PlanHighlightKey): boolean {
  if (key === 'designCredits' || key === 'libraryCredits') return true
  if (key === 'layout') return plan.benefits.layout.level !== 'none'
  if (key === 'interiorEstimate') return plan.benefits.interiorEstimate.level !== 'none'
  if (key === 'advisory') return plan.benefits.advisory.level !== 'none'
  return plan.benefits.toggles[key].enabled
}

/**
 * Quà tặng của gói ở dạng hiển thị. Quà được snapshot vào đơn khi tạo đơn; ở
 * trang Bảng giá thì tra thẳng danh mục — quà đã bị xóa khỏi danh mục thì thôi.
 */
export function resolvePlanGift(
  plan: Pick<SubscriptionPlan, 'giftId' | 'giftConditions'>,
  gifts: readonly CmsGift[]
): PlanGift | undefined {
  if (!plan.giftId) return undefined
  const gift = gifts.find((item) => item.id === plan.giftId)
  if (!gift) return undefined
  return {
    title: gift.title,
    description: gift.description,
    value: gift.value,
    extraBody: gift.extraOffer ?? '',
    conditions: plan.giftConditions ?? '',
    conditionsShort: plan.giftConditions ?? '',
    imageUrl: gift.imageUrl || undefined
  }
}
