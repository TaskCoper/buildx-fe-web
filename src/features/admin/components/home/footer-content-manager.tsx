'use client'

import { useTranslations } from 'next-intl'

import { siteConfig } from '@/shared/config/site'
import { footerAdminApi } from '../../api/bmt/footer.api'
import { FOOTER_LEGAL_KEYS, FOOTER_SECTIONS } from '../../services/home-sections.service'
import { PageContentManager, type ContentLocale } from './page-content-manager'

/**
 * Chữ có sẵn của chân trang cho một ngôn ngữ, là thứ khách đang thấy khi admin chưa sửa gì: toàn bộ `messages`, cộng
 * `siteDefaults` (liên hệ và mạng xã hội lấy từ cấu hình ứng dụng, đúng nguồn footer đang dùng) và `legalHtml` (năm trang
 * pháp lý có sẵn đổi sang HTML). Tài liệu pháp lý khá nặng nên chỉ nạp khi mở màn này; ngôn ngữ khác `en` dùng bản tiếng
 * Việt, giống `LegalPage`.
 */
async function loadFooterDefaults(locale: ContentLocale): Promise<unknown> {
  const [messages, { legalDocToHtml }, docs] = await Promise.all([
    import(`../../../../../messages/${locale}.json`).then((module) => module.default as Record<string, unknown>),
    import('@/shared/legal/legal-html'),
    locale === 'en'
      ? import('@/shared/legal/legal-docs.en').then((module) => module.LEGAL_DOCS_EN)
      : import('@/shared/legal/legal-docs').then((module) => module.LEGAL_DOCS)
  ])

  const { contact, social } = siteConfig
  const footer = messages.footer as { address?: string } | undefined

  return {
    ...messages,
    siteDefaults: {
      hotline: contact.hotline,
      email: contact.email,
      address: footer?.address ?? '',
      facebookUrl: social.facebookUrl,
      zaloUrl: social.zaloOaUrl,
      youtubeUrl: social.youtubeUrl,
      tiktokUrl: social.tiktokUrl,
      instagramUrl: social.instagramUrl
    },
    legalHtml: Object.fromEntries(FOOTER_LEGAL_KEYS.map((key) => [key, legalDocToHtml(docs[key])]))
  }
}

/**
 * CHÂN TRANG & VỀ BUILDX. Sửa thông tin liên hệ, liên kết mạng xã hội ở chân trang và nội dung năm trang "Về BuildX"
 * (Điều khoản sử dụng, Quyền riêng tư, Điều khoản AI, TMĐT & Đối tác, Thanh toán & Hoàn tiền) bằng rich text. Cách hoạt
 * động chung của màn (một form, Lưu tất cả, sửa tại chỗ) nằm ở `PageContentManager`.
 */
export function FooterContentManager() {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')

  return (
    <PageContentManager
      pageKey='footer'
      sections={FOOTER_SECTIONS}
      api={footerAdminApi}
      title={t('nav.footerContent')}
      description={tc('footerDescription')}
      loadDefaults={loadFooterDefaults}
    />
  )
}
