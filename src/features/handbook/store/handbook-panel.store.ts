'use client'

import { create } from 'zustand'

import type { HandbookPanelTab } from '../types/handbook.types'

interface HandbookPanelStore {
  /** Panel đang thu nhỏ thành nút nổi ở góc màn hình. */
  minimized: boolean
  /** Mục đang xem trên thanh công cụ dọc của panel. */
  tab: HandbookPanelTab
  setMinimized: (minimized: boolean) => void
  setTab: (tab: HandbookPanelTab) => void
}

/**
 * Trạng thái bảng "Cẩm nang cá nhân hóa" (mục III.3a).
 *
 * Nằm ở store chứ không phải state cục bộ vì spec yêu cầu trạng thái thu nhỏ /
 * mở GIỮ NGUYÊN: panel đi cùng người dùng từ màn chờ sang màn kết quả Bước 2 và
 * sang màn chờ render Bước 3, không reset mỗi lần đổi màn.
 */
export const useHandbookPanelStore = create<HandbookPanelStore>()((set) => ({
  minimized: false,
  tab: 'templates',
  setMinimized: (minimized) => set({ minimized }),
  setTab: (tab) => set({ tab })
}))
