'use client'

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

import { useAuthStore } from '@/shared/auth'
import { MAX_INVITATIONS } from '../constants/contractors.constants'
import type { SurveyBooking } from '../types/contractor.types'

/**
 * State phía client của luồng Tìm nhà thầu — những thứ sống qua nhiều màn nhưng
 * không thuộc về server:
 *
 * - `compareIds`: các nhà thầu đang tick "So sánh" ở S12, đọc lại ở bảng S15.
 * - `inviteQueue` + `pendingBookings`: khi mời nhiều nhà thầu một lượt từ S15,
 *   mỗi nhà thầu phải chọn MỘT lịch khảo sát riêng (S16). Hàng đợi giữ thứ tự
 *   đó, còn `pendingBookings` giữ các lịch đã chọn để gửi một lần ở cuối — S17
 *   mới hiện đúng một mã yêu cầu cho cả lượt.
 *
 * Lưu ở `sessionStorage`: đặt lịch cho ba nhà thầu là một chuỗi thao tác dài,
 * F5 hay bấm back giữa chừng mà mất hàng đợi thì khách gửi đi MỘT lời mời trong
 * khi tưởng mình gửi ba. Hết tab thì bỏ — đây là trạng thái của một lượt làm,
 * không phải dữ liệu cần giữ lâu.
 */
interface ContractorsState {
  compareIds: string[]
  queueProjectId?: string
  queueUserId?: string
  inviteQueue: string[]
  queueIndex: number
  pendingBookings: SurveyBooking[]

  toggleCompare: (contractorId: string) => void
  clearCompare: () => void
  startInviteQueue: (contractorIds: string[], projectId?: string) => void
  addBooking: (booking: SurveyBooking) => void
  advanceQueue: () => void
  clearQueue: () => void
}

/**
 * Component này vẫn được render trên server (client component ≠ chỉ chạy ở
 * trình duyệt), mà ở đó `sessionStorage` không tồn tại. Trả về kho rỗng khi
 * chưa có `window` — chạm thẳng vào `sessionStorage` sẽ ném lỗi ngay lúc tạo
 * store và cả màn hình đứng ở khung chờ.
 */
const sessionStore = (): StateStorage => {
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
  }
  return window.sessionStorage
}

export const useContractorsStore = create<ContractorsState>()(
  persist(
    (set) => ({
      compareIds: [],
      inviteQueue: [],
      queueIndex: 0,
      pendingBookings: [],

      toggleCompare: (contractorId) =>
        set((state) => {
          if (state.compareIds.includes(contractorId)) {
            return { compareIds: state.compareIds.filter((id) => id !== contractorId) }
          }
          // Bảng so sánh chỉ có 3 cột (S15) và R1 cũng chỉ cho mời 3 — chặn ngay
          // ở ô tick thay vì để người dùng chọn 5 rồi mới báo lỗi.
          if (state.compareIds.length >= MAX_INVITATIONS) return state
          return { compareIds: [...state.compareIds, contractorId] }
        }),

      clearCompare: () => set({ compareIds: [] }),

      startInviteQueue: (contractorIds, projectId) =>
        set({
          queueProjectId: projectId,
          queueUserId: useAuthStore.getState().user?.id,
          inviteQueue: contractorIds.slice(0, MAX_INVITATIONS),
          queueIndex: 0,
          pendingBookings: []
        }),

      addBooking: (booking) =>
        set((state) => ({
          pendingBookings: [
            ...state.pendingBookings.filter((item) => item.contractorId !== booking.contractorId),
            booking
          ]
        })),

      advanceQueue: () => set((state) => ({ queueIndex: state.queueIndex + 1 })),

      clearQueue: () =>
        set({ queueProjectId: undefined, queueUserId: undefined, inviteQueue: [], queueIndex: 0, pendingBookings: [] })
    }),
    {
      name: 'savico.contractors-session',
      storage: createJSONStorage(sessionStore)
    }
  )
)
