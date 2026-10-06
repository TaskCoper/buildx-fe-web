/**
 * Gói giám sát của khách (BE `GET /me/supervision-grants`). Khác với mock cũ: gói gắn vào CÔNG TRÌNH (`ConstructionSite`),
 * không phải vào dự án dự toán; BE chưa có tiến độ 6 giai đoạn nên chỉ hiện trạng thái gói.
 */

export type SupervisionGrantState = 'Unassigned' | 'Assigned' | 'CanceledByStaff' | 'Completed'

/** `ExpiredUnassigned` = chưa gán và đã quá hạn gán nên không gán được nữa (chỉ có ở `effectiveState`). */
export type SupervisionGrantEffectiveState = SupervisionGrantState | 'ExpiredUnassigned'

export interface SupervisionGrantItem {
  grantId: string
  /** Công trình đang gắn; null khi gói chưa gán (chưa từng gán hoặc đã bị gỡ). */
  constructionSiteId?: string | null
  constructionSiteName?: string | null
  state: SupervisionGrantState
  effectiveState: SupervisionGrantEffectiveState
  grantedAtUtc: string
  assignmentDeadlineUtc: string
  assignedAtUtc?: string | null
}

/** Nhóm hiển thị của một gói: mỗi nhóm có câu giải thích riêng. */
export type SupervisionGrantStatus = 'assignable' | 'assigned' | 'completed' | 'canceled' | 'expired'

export function grantStatusOf(grant: Pick<SupervisionGrantItem, 'effectiveState'>): SupervisionGrantStatus {
  switch (grant.effectiveState) {
    case 'Assigned':
      return 'assigned'
    case 'Completed':
      return 'completed'
    case 'CanceledByStaff':
      return 'canceled'
    case 'ExpiredUnassigned':
      return 'expired'
    default:
      return 'assignable'
  }
}

/** Gói còn hiệu lực với khách: đang chờ gán hoặc đã gán (hoàn thành/huỷ/quá hạn chỉ là lịch sử). */
export const isActiveGrant = (grant: Pick<SupervisionGrantItem, 'effectiveState'>): boolean => {
  const status = grantStatusOf(grant)
  return status === 'assignable' || status === 'assigned'
}

/** Gói đang dùng lên trước, rồi mới nhất trước. */
export function sortGrants(grants: readonly SupervisionGrantItem[]): SupervisionGrantItem[] {
  return [...grants].sort((a, b) => {
    const active = Number(isActiveGrant(b)) - Number(isActiveGrant(a))
    return active !== 0 ? active : Date.parse(b.grantedAtUtc) - Date.parse(a.grantedAtUtc)
  })
}
