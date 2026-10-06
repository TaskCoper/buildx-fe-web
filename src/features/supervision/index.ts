/**
 * Public API của feature `supervision` — GÓI GIÁM SÁT THI CÔNG (S19–S24).
 *
 * R5 xuyên suốt: 6 giai đoạn cố định, Giám sát xác nhận thì hồ sơ khóa, sau đó
 * chỉ đổi qua yêu cầu sửa đổi được bên kia duyệt.
 */
export { SupervisionDashboard } from './components/supervision-dashboard'
export { SupervisionPricing } from './components/supervision-pricing'
export { SupervisionGrantsCard } from './components/supervision-grants-card'

export { STAGE_KEYS, STAGE_COUNT } from './constants/supervision.constants'
export { useSupervisionProject } from './hooks/use-supervision'
export { useSupervisionPackageList, useSupervisionPackages } from './hooks/use-supervision-packages'
export type { SupervisionPackageView } from './api/supervision.merge'
export type { StageKey, SupervisionProject, SupervisionStage } from './types/supervision.types'
