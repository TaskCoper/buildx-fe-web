'use client'

import { create } from 'zustand'

/**
 * Trang chủ có nhiều nút "Tạo dự án mới" (hero, dải 5 bước, CTA cuối trang).
 * Vệt sáng lướt của CTA cuối chỉ chạy nếu khách CHƯA bấm nút nào trong số đó
 * (mục II.2, vùng 13) — cần một nơi chung ngoài từng component vì ba nút nằm
 * ở ba section khác nhau, không phải cha-con.
 *
 * Sống ở `app/` (không phải `shared/`) vì đây là state riêng của trang chủ,
 * không phải mối quan tâm xuyên-feature.
 */
interface HomePageState {
  createProjectClicked: boolean
  markCreateProjectClicked: () => void
}

export const useHomePageStore = create<HomePageState>()((set) => ({
  createProjectClicked: false,
  markCreateProjectClicked: () => set({ createProjectClicked: true })
}))
