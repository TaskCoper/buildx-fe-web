import { create } from 'zustand'

interface DirtyState {
  /** Id của các form đang có thay đổi chưa lưu. */
  ids: ReadonlySet<string>
  setDirty: (id: string, dirty: boolean) => void
}

/**
 * Form nào trong khu quản trị đang có thay đổi chưa lưu.
 *
 * Cần một chỗ dùng chung vì thứ có thể LÀM MẤT thay đổi lại nằm ngoài form:
 * công tắc "Nội dung VI/EN" trên thanh trên. Đổi ngôn ngữ là tải bản dịch khác
 * về, form nạp lại từ đầu — gõ nửa trang Điều khoản rồi lỡ bấm sang EN là mất
 * trắng, không một lời hỏi lại. Thanh trên đọc store này để hỏi trước.
 */
export const useDirtyStore = create<DirtyState>((set) => ({
  ids: new Set<string>(),
  setDirty: (id, dirty) =>
    set((state) => {
      if (state.ids.has(id) === dirty) return state
      const ids = new Set(state.ids)
      if (dirty) ids.add(id)
      else ids.delete(id)
      return { ids }
    })
}))

/** Có form nào đang dở dang không. */
export function useHasUnsavedChanges(): boolean {
  return useDirtyStore((state) => state.ids.size > 0)
}
