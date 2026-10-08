'use client'

import { useSearchParams } from 'next/navigation'
import { useRef } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'

export type FormPageMode = 'new' | 'edit' | 'view'

const MODES: readonly FormPageMode[] = ['new', 'edit', 'view']
const ACT = 'act'
const RID = 'rid'

/**
 * Trạng thái "đang mở trang Thêm / Sửa / Xem" của một màn danh sách, giữ TRONG URL
 * (`?act=new|edit|view&rid=<khóa dòng>`) để mỗi form là một trang thật: có nút Back của
 * trình duyệt, tải lại vẫn ở đúng form, và gửi link được.
 *
 * Dùng tham số `act` / `rid` chứ không phải `id` / `q`: hai tham số sau đã được các màn khác dùng
 * để mở sẵn một dòng và điền sẵn ô tìm kiếm.
 *
 * Hook gọi `useSearchParams` nên component dùng nó phải nằm trong ranh giới `Suspense`.
 */
export function useFormPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Trang form do CHÍNH màn này đẩy vào lịch sử (khác với mở thẳng từ link / tải lại): đóng thì lùi
  // một bước, nếu không thì thay URL để Back không kẹt lại ở form.
  const pushed = useRef(false)

  const act = searchParams.get(ACT)
  const mode = MODES.find((value) => value === act) ?? null
  const id = searchParams.get(RID)

  const hrefFor = (next: { mode: FormPageMode; id?: string } | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(ACT)
    params.delete(RID)
    if (next) {
      params.set(ACT, next.mode)
      if (next.id) params.set(RID, next.id)
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return {
    mode,
    id,
    /** Khóa của trang đang mở; đổi khóa là sang một trang form khác. `null` khi đang ở danh sách. */
    key: mode ? `${mode}:${id ?? ''}` : null,
    open(next: FormPageMode, rowId?: string, options?: { replace?: boolean }) {
      const href = hrefFor({ mode: next, id: rowId })
      if (options?.replace) return router.replace(href)
      pushed.current = true
      router.push(href)
    },
    close() {
      if (pushed.current) {
        pushed.current = false
        router.back()
      } else {
        router.replace(hrefFor(null))
      }
    }
  }
}
