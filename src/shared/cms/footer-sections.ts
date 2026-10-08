import { sectionText, type HomeSections } from './home-sections'

/**
 * Nội dung chân trang và các trang "Về BuildX" do admin biên tập: các khối của trang `footer` mà backend lưu
 * (GET /pages/footer/sections). Logic thuần, không import gì ngoài helper khối chữ, để server, client và script test
 * bằng node dùng chung. Khối hay trường nào admin chưa lưu thì giao diện dùng nội dung có sẵn trong ứng dụng.
 */

/** Khóa trang trên backend. */
export const FOOTER_PAGE_KEY = 'footer'

/** Khóa khối thông tin liên hệ và mạng xã hội. */
export const FOOTER_CONTACT_SECTION = 'contact'
export const FOOTER_SOCIAL_SECTION = 'social'

/** Năm trang pháp lý: khóa khối trên backend, theo khóa tài liệu pháp lý có sẵn (`LegalDocKey`). */
export const LEGAL_SECTION_KEYS = ['terms', 'privacy', 'aiTerms', 'ecommerce', 'payment'] as const
export type LegalSectionKey = (typeof LEGAL_SECTION_KEYS)[number]

export interface FooterContact {
  hotline?: string
  email?: string
  address?: string
}

export type SocialNetwork = 'facebook' | 'zalo' | 'youtube' | 'tiktok' | 'instagram'

/** Mạng xã hội theo thứ tự hiển thị; `field` là tên trường trong khối `social`. */
export const SOCIAL_NETWORKS: readonly { network: SocialNetwork; field: string }[] = [
  { network: 'facebook', field: 'facebookUrl' },
  { network: 'youtube', field: 'youtubeUrl' },
  { network: 'tiktok', field: 'tiktokUrl' },
  { network: 'zalo', field: 'zaloUrl' },
  { network: 'instagram', field: 'instagramUrl' }
]

/** Nội dung đã lưu của chân trang; mạng xã hội nào admin chưa nhập thì vắng mặt. */
export interface FooterContent {
  contact: FooterContact
  social: Partial<Record<SocialNetwork, string>>
}

export const EMPTY_FOOTER_CONTENT: FooterContent = Object.freeze({ contact: {}, social: {} })

/**
 * Địa chỉ liên kết an toàn cho mạng xã hội, hoặc `undefined` khi không dùng được.
 *
 * Backend lưu chuỗi tự do nên ở đây là chốt chặn cuối: chỉ nhận http/https (không `javascript:`, `data:`...). Admin hay
 * gõ thiếu giao thức (`zalo.me/abc`) nên bổ sung `https://` cho dạng "tên miền/đường dẫn".
 */
export function safeHref(value: string | undefined): string | undefined {
  const raw = value?.trim()
  if (!raw || /\s/.test(raw)) return undefined

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw)
  // Có giao thức khác http(s), hoặc bắt đầu bằng `/` (đường dẫn tương đối / `//host`): không dùng.
  if (!hasScheme && (raw.startsWith('/') || !raw.includes('.'))) return undefined

  try {
    const url = new URL(hasScheme ? raw : `https://${raw}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Thông tin liên hệ và mạng xã hội từ các khối đã lưu; trường chưa nhập, hoặc liên kết không an toàn, bị bỏ qua. */
export function footerContentOf(sections: HomeSections | undefined): FooterContent {
  if (!sections) return EMPTY_FOOTER_CONTENT

  const contact: FooterContact = {
    hotline: sectionText(sections, FOOTER_CONTACT_SECTION, 'hotline'),
    email: sectionText(sections, FOOTER_CONTACT_SECTION, 'email'),
    address: sectionText(sections, FOOTER_CONTACT_SECTION, 'address')
  }

  const social: Partial<Record<SocialNetwork, string>> = {}
  for (const { network, field } of SOCIAL_NETWORKS) {
    const href = safeHref(sectionText(sections, FOOTER_SOCIAL_SECTION, field))
    if (href) social[network] = href
  }
  return { contact, social }
}

/** Nội dung một trang pháp lý do admin soạn. */
export interface LegalPageContent {
  /** Tiêu đề tab trình duyệt; để trống thì dùng tiêu đề có sẵn. */
  title?: string
  /** HTML đã được backend làm sạch. */
  body: string
}

/** Trang pháp lý admin đã soạn; `undefined` khi chưa lưu hoặc nội dung rỗng, để trang dùng bản có sẵn. */
export function legalPageOf(sections: HomeSections | undefined, key: LegalSectionKey): LegalPageContent | undefined {
  if (!sections) return undefined
  const body = sectionText(sections, key, 'body')
  if (!body) return undefined
  return { title: sectionText(sections, key, 'title'), body }
}
