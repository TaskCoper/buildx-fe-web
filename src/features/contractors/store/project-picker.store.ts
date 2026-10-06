'use client'

import { create } from 'zustand'

/**
 * Hộp thoại "Chọn dự án để tìm nhà thầu" — mở từ nhiều chỗ trong cùng luồng:
 * dải "Bạn đang xem thử" ở S12, nút "Đổi dự án" trên thẻ dự án, và các nút mời
 * ở S13 / S15 khi đang xem thử.
 *
 * Để ở store thay vì truyền `onOpen` xuống từng cấp: thẻ nhà thầu nằm sâu hai
 * cấp dưới màn hình, mà cùng một hộp thoại lại phải bật được từ ba màn khác
 * nhau — chuyền prop qua hết các cấp đó là dây dẫn dài mà không thêm thông tin
 * gì. Cùng lý do với `shared/auth/auth-dialog.store`.
 */
interface ProjectPickerState {
  open: boolean
  openPicker: () => void
  closePicker: () => void
}

export const useProjectPickerStore = create<ProjectPickerState>()((set) => ({
  open: false,
  openPicker: () => set({ open: true }),
  closePicker: () => set({ open: false })
}))
