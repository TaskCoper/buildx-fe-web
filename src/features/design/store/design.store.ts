'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { DESIGN_DRAFT_STORAGE_KEY } from '../constants/design.constants'
import { applyBuildingTypeChange, emptyDesignInput } from '../services/design-input.service'
import type { BuildingType, DesignInput } from '../types/design.types'

interface DialogOrigin {
  x: number
  y: number
}

interface DesignStore {
  /** Bản nháp Bước 1 theo từng dự án — thoát ra vào lại vẫn còn nguyên. */
  drafts: Record<string, DesignInput>
  /** Modal Tạo dự án (mục III.1) — mở từ nút trên thanh công cụ hoặc trang chủ. */
  isCreateDialogOpen: boolean
  /** Viewport delta from the triggering control to the modal centre (M02). */
  createDialogOrigin: DialogOrigin

  getDraft: (projectId: string) => DesignInput
  patchDraft: (projectId: string, patch: Partial<DesignInput>) => void
  setBuildingType: (projectId: string, buildingType: BuildingType) => void
  clearDraft: (projectId: string) => void
  openCreateDialog: () => void
  closeCreateDialog: () => void
}

/** Bù trường thiếu cho một bản nháp đọc từ storage (kể cả `addressDetail` lồng). */
function hydrateDraft(draft: Partial<DesignInput> | undefined): DesignInput {
  const empty = emptyDesignInput()
  return {
    ...empty,
    ...draft,
    addressDetail: { ...empty.addressDetail, ...draft?.addressDetail }
  }
}

/** Feature-scoped client state for the 3-step design flow. */
export const useDesignStore = create<DesignStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      isCreateDialogOpen: false,
      createDialogOrigin: { x: 0, y: 0 },

      getDraft: (projectId) => hydrateDraft(get().drafts[projectId]),

      patchDraft: (projectId, patch) =>
        set((state) => {
          const current = hydrateDraft(state.drafts[projectId])
          return { drafts: { ...state.drafts, [projectId]: { ...current, ...patch } } }
        }),

      // Đổi loại công trình: xóa giá trị của các trường không còn áp dụng.
      setBuildingType: (projectId, buildingType) =>
        set((state) => {
          const current = hydrateDraft(state.drafts[projectId])
          return { drafts: { ...state.drafts, [projectId]: applyBuildingTypeChange(current, buildingType) } }
        }),

      clearDraft: (projectId) =>
        set((state) => {
          const next = { ...state.drafts }
          delete next[projectId]
          return { drafts: next }
        }),

      openCreateDialog: () => {
        const trigger = typeof document === 'undefined' ? null : document.activeElement
        const rect = trigger instanceof HTMLElement ? trigger.getBoundingClientRect() : null
        set({
          isCreateDialogOpen: true,
          createDialogOrigin: rect
            ? {
                x: rect.left + rect.width / 2 - window.innerWidth / 2,
                y: rect.top + rect.height / 2 - window.innerHeight / 2
              }
            : { x: 0, y: 0 }
        })
      },
      closeCreateDialog: () => set({ isCreateDialogOpen: false })
    }),
    {
      name: DESIGN_DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Dialog visibility is per-session, never restored from storage.
      partialize: (state) => ({ drafts: state.drafts }),
      /**
       * Bản nháp nằm trong localStorage của người dùng từ trước, có thể được ghi
       * bằng phiên bản cũ của `DesignInput` và thiếu trường mới. Lấp đầy bằng
       * giá trị mặc định ngay lúc khôi phục để phần còn lại của feature luôn
       * nhận đúng kiểu — nếu không, một trường thiếu sẽ làm vỡ màn Bước 1.
       */
      merge: (persisted, current) => {
        const drafts = (persisted as { drafts?: Record<string, Partial<DesignInput>> } | undefined)?.drafts ?? {}
        return {
          ...current,
          drafts: Object.fromEntries(
            Object.entries(drafts).map(([projectId, draft]) => [projectId, hydrateDraft(draft)])
          )
        }
      }
    }
  )
)
