'use client'

import { useTranslations } from 'next-intl'

import type { CmsOrderKind, PlanTier, SupervisionTier } from '@/shared/cms'

const PLAN_TIERS: readonly PlanTier[] = ['basic', 'advanced', 'pro']
const SUPERVISION_TIERS: readonly SupervisionTier[] = ['self', 'check', 'control']

function isPlanTier(id: string): id is PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(id)
}

function isSupervisionTier(id: string): id is SupervisionTier {
  return (SUPERVISION_TIERS as readonly string[]).includes(id)
}

/**
 * Nhãn của một gói theo loại: gói thiết kế đọc `admin.planTier`, gói giám sát
 * đọc `supervision.tierAlias` — đúng tên khách thấy trên bảng điều khiển
 * ("Gói An Tâm" / "Gói Toàn Diện"), để vận hành và khách gọi cùng một tên.
 * Mã gói do admin tự tạo (không thuộc ba bậc gốc) thì hiện nguyên mã.
 */
export function useProductLabel() {
  const tPlan = useTranslations('admin.planTier')
  const tSupervision = useTranslations('supervision.tierAlias')

  return (kind: CmsOrderKind, id: string): string => {
    if (kind === 'supervision') return isSupervisionTier(id) ? tSupervision(id) : id
    return isPlanTier(id) ? tPlan(id) : id
  }
}
