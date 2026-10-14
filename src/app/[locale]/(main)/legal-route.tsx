import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { LegalHtmlPage, LegalPage } from '@/features/landing'
import type { Locale } from '@/i18n/routing'
import { FOOTER_PAGE_KEY, legalPageOf, type LegalSectionKey } from '@/shared/cms/footer-sections'
import { fetchPageSections } from '@/shared/cms/page-sections.server'

/**
 * Ghép nội dung admin soạn (backend) với trang pháp lý có sẵn cho năm trang "Về BuildX". Hai feature không import lẫn
 * nhau nên phần ghép nằm ở tầng app, như các section của trang chủ.
 *
 * Trang nào admin chưa soạn (hoặc không lấy được từ backend) thì hiện bản có sẵn trong ứng dụng, nên các trang này
 * không bao giờ trống vì CMS.
 */

/** Tiêu đề tab trình duyệt: tiêu đề admin đặt, không có thì tiêu đề có sẵn. */
export async function legalMetadata(locale: Locale, doc: LegalSectionKey): Promise<Metadata> {
  const [t, sections] = await Promise.all([
    getTranslations({ locale, namespace: `legal.${doc}` }),
    fetchPageSections(FOOTER_PAGE_KEY, locale)
  ])
  return { title: legalPageOf(sections, doc)?.title ?? t('title') }
}

export async function LegalRoute({ locale, doc }: { locale: Locale; doc: LegalSectionKey }) {
  setRequestLocale(locale)

  // Chỉ nội dung quyết định có dùng bản admin soạn hay không; tên tab do `legalMetadata` lo riêng.
  const body = legalPageOf(await fetchPageSections(FOOTER_PAGE_KEY, locale), doc)?.body
  return body ? <LegalHtmlPage html={body} /> : <LegalPage doc={doc} />
}
