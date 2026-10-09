import { footerContentOf, FOOTER_PAGE_KEY } from '@/shared/cms/footer-sections'
import { fetchPageSections } from '@/shared/cms/page-sections.server'
import { SiteFooter } from './site-footer'

/**
 * Footer kèm thông tin liên hệ và mạng xã hội admin đã sửa (màn "Chân trang & Về BuildX").
 *
 * Lấy ở server để HTML đầu tiên đã có đúng hotline, email, địa chỉ và liên kết, không nhấp nháy từ bản có sẵn sang bản
 * mới. Không lấy được (backend sập, chậm) thì footer dùng nội dung có sẵn. Import thẳng file này, không qua barrel
 * `@/shared/layouts`, vì barrel còn chứa các client component.
 */
export async function SiteFooterWithContent({ locale }: { locale: string }) {
  const content = footerContentOf(await fetchPageSections(FOOTER_PAGE_KEY, locale))
  return <SiteFooter content={content} />
}
