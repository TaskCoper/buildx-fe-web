'use client'

import { useAuthStore } from '@/shared/auth'
import type { CmsContractor, CmsContractorHistoryEntry } from '@/shared/cms'

import { todayKey } from '../services/admin.service'
import { derivePublicFields, withHistory } from '../services/contractor.service'
import { useSaveAdminItem } from './use-admin-data'

type HistoryInput = Omit<CmsContractorHistoryEntry, 'id' | 'at' | 'by'>

/**
 * Lưu một nhà thầu theo đúng quy tắc của epic: luôn suy lại các trường trang
 * công khai đang đọc (`derivePublicFields`) và ghi một dòng lịch sử quản trị
 * kèm tên admin thực hiện (§13) khi thao tác có ý nghĩa nghiệp vụ.
 */
export function useContractorSave() {
  const save = useSaveAdminItem('contractors')
  const admin = useAuthStore((state) => state.user?.name ?? 'Admin')

  const commit = (next: CmsContractor, entry?: HistoryInput) =>
    save.mutateAsync(derivePublicFields(entry ? withHistory(next, { ...entry, by: admin }) : next, todayKey()))

  return { commit, admin, isPending: save.isPending }
}
