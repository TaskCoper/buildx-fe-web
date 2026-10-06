'use client'

import { useEffect, useId } from 'react'

import { useDirtyStore } from '../store/dirty.store'

/**
 * Báo rằng form này đang có thay đổi chưa lưu, và chặn rời trang.
 *
 * Hai việc, vì có hai đường làm mất dữ liệu:
 *   · đóng tab / tải lại / mở link ra ngoài → `beforeunload` chặn được;
 *   · đổi công tắc "Nội dung VI/EN" trên thanh trên → không phải điều hướng nên
 *     `beforeunload` không thấy; thanh trên tự hỏi lại bằng cách đọc store.
 *
 * App Router chưa có API chặn điều hướng nội bộ, nên `resource-manager` còn tự
 * hỏi lại bằng `Modal.confirm` ở chỗ nó tự đóng ngăn kéo.
 */
export function useUnsavedGuard(dirty: boolean): void {
  const id = useId()
  const setDirty = useDirtyStore((state) => state.setDirty)

  useEffect(() => {
    setDirty(id, dirty)
    // Form bị gỡ (đổi tab, rời trang) thì bỏ đánh dấu, nếu không cờ treo mãi.
    return () => setDirty(id, false)
  }, [id, dirty, setDirty])

  useEffect(() => {
    if (!dirty) return

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      // Trình duyệt hiện chuỗi cảnh báo của riêng nó; gán để bản cũ cũng chặn.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}
