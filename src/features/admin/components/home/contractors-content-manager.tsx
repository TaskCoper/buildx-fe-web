'use client'

import { useTranslations } from 'next-intl'

import { contractorsPageAdminApi } from '../../api/bmt/contractors-page.api'
import { CONTRACTORS_SECTIONS } from '../../services/home-sections.service'
import { PageContentManager, type ContentLocale } from './page-content-manager'

type PlainObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Chữ có sẵn của trang Tìm nhà thầu cho một ngôn ngữ: toàn bộ `messages`, nhưng câu trả lời trong khối câu hỏi được bỏ
 * thẻ `<mark>…</mark>` (chỉ dùng để tô "3 nhà thầu" bằng `t.rich`, không có hiệu ứng nhìn thấy). Ô nhập chữ thuần nên
 * không thể hiện thẻ đó; bỏ đi thì câu trả lời đã sửa và câu trả lời có sẵn so sánh được với nhau.
 */
async function loadContractorsDefaults(locale: ContentLocale): Promise<unknown> {
  const messages = await import(`../../../../../messages/${locale}.json`).then((module) => module.default as unknown)
  if (!isPlainObject(messages) || !isPlainObject(messages.contractors) || !isPlainObject(messages.contractors.landing))
    return messages

  const landing = messages.contractors.landing
  const faq = isPlainObject(landing.faq)
    ? Object.fromEntries(
        Object.entries(landing.faq).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.replace(/<\/?mark>/g, '') : value
        ])
      )
    : landing.faq

  return { ...messages, contractors: { ...messages.contractors, landing: { ...landing, faq } } }
}

/**
 * NỘI DUNG TRANG TÌM NHÀ THẦU. Sửa chữ, ảnh đầu trang và icon của năm khối: đầu trang, bốn cam kết, "An toàn & minh bạch",
 * câu hỏi thường gặp và dải kêu gọi cuối trang. Cách hoạt động chung của màn (một form, Lưu tất cả, sửa tại chỗ) nằm ở
 * `PageContentManager`.
 */
export function ContractorsContentManager() {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')

  return (
    <PageContentManager
      pageKey='contractors'
      sections={CONTRACTORS_SECTIONS}
      api={contractorsPageAdminApi}
      title={t('nav.contractorsContent')}
      description={tc('contractorsDescription')}
      loadDefaults={loadContractorsDefaults}
    />
  )
}
