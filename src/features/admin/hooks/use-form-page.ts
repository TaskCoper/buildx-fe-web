'use client'

import { useSearchParams } from 'next/navigation'

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
      router.push(href)
    },
    close() {
      // Hủy, quay lại và Lưu đều về danh sách, kể cả lịch sử có nhiều lượt mở cùng form.
      const url = new URL(window.location.href)
      url.searchParams.delete(ACT)
      url.searchParams.delete(RID)
      // Next.js đồng bộ useSearchParams qua History API; không chờ tải route từ server.
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }
}
