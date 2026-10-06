'use client'

import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl'
import { useMemo, type ReactNode } from 'react'

import type { CmsUiStrings } from './cms.types'
import { useCmsDocument } from './use-cms'

/**
 * Hoà chữ admin soạn vào catalog dịch của next-intl.
 *
 * Các bảng nội dung (mẫu, bài viết, gói, KTS…) admin sửa được từ trước; phần
 * CÒN LẠI của site — tiêu đề trang, nhãn nút, chữ trạng thái rỗng — nằm trong
 * `messages/{locale}.json` và trước đây phải sửa code mới đổi được. Lớp này ghi
 * đè chúng ngay lúc chạy nên toàn bộ chữ trên site đều biên tập được.
 *
 * CƠ CHẾ: đọc `uiStrings` (khóa dịch phẳng → chữ mới) rồi dựng lại catalog và
 * cấp qua một `NextIntlClientProvider` lồng bên trong. Component gọi `useTranslations`
 * không đổi một dòng nào.
 *
 * KHÔNG NHẤP NHÁY: `useCmsDocument` trả object rỗng ở phía máy chủ, nên HTML
 * dựng sẵn và lần render đầu ở trình duyệt giống hệt nhau; chữ đã ghi đè chỉ
 * hiện sau khi hydrate xong.
 */

/**
 * Catalog dịch lồng nhau của next-intl.
 *
 * Giá trị để `unknown` vì catalog còn chứa mảng (`legal.terms.sections`) chứ
 * không chỉ chuỗi với nhánh con; phần ghi đè tự kiểm kiểu ở từng nút.
 */
type MessageTree = { [key: string]: unknown }

/**
 * Nhánh `admin.*` cố ý KHÔNG cho ghi đè.
 *
 * Chữ của chính bảng điều khiển mà sửa được từ trong bảng điều khiển thì một
 * lần dán nhầm là tự khoá mình ra ngoài — nhãn nút "Lưu" biến mất, không còn
 * đường sửa lại.
 */
const LOCKED_NAMESPACE = 'admin'

/** Khóa này có được phép ghi đè không. */
export function isOverridableMessageKey(key: string): boolean {
  return key !== LOCKED_NAMESPACE && !key.startsWith(`${LOCKED_NAMESPACE}.`)
}

/**
 * Dựng catalog mới với các khóa đã ghi đè.
 *
 * Chỉ nhân bản đúng những nhánh nằm trên đường đi tới khóa bị sửa — các nhánh
 * còn lại giữ nguyên tham chiếu cũ, nên sửa một chuỗi không tạo lại cả cây
 * ~1.100 khóa.
 */
export function applyStringOverrides(base: MessageTree, overrides: CmsUiStrings): MessageTree {
  const entries = Object.entries(overrides).filter(([key, value]) => isOverridableMessageKey(key) && value.trim())
  if (entries.length === 0) return base

  const next: MessageTree = { ...base }

  for (const [key, value] of entries) {
    const path = key.split('.')
    let node = next

    for (let index = 0; index < path.length - 1; index += 1) {
      const segment = path[index]!
      const child = node[segment]
      // Khóa trỏ vào chỗ không phải nhánh (hoặc không tồn tại) — bỏ qua thay vì
      // dựng nhánh mới, để một khóa gõ sai không đẻ ra namespace ma.
      if (typeof child !== 'object' || child === null) {
        node = {}
        break
      }
      const copy: MessageTree = { ...child }
      node[segment] = copy
      node = copy
    }

    const leaf = path[path.length - 1]!
    if (typeof node[leaf] === 'string') node[leaf] = value
  }

  return next
}

export function CmsMessagesProvider({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const base = useMessages() as MessageTree
  const overrides = useCmsDocument('uiStrings')

  const messages = useMemo(() => applyStringOverrides(base, overrides), [base, overrides])

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
