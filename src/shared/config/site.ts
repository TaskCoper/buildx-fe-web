import { env } from './env'

/**
 * Static, app-wide metadata. Keep marketing / SEO copy out of this file —
 * user-facing text lives in translation messages (next-intl).
 */
export const siteConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  url: env.NEXT_PUBLIC_APP_URL,
  // Default theme handed to next-themes.
  defaultTheme: 'system' as const,
  /**
   * Contact & social channels — hotline, địa chỉ và mạng xã hội thật (sheet góp ý
   * BuildX, PC11/PC12). Zalo đi theo số hotline.
   */
  contact: {
    hotline: '0934 888 881',
    email: 'hello@savico.ai',
    zaloUrl: 'https://zalo.me/0934888881',
    messengerUrl: 'https://m.me/savico'
  },
  /** Mạng xã hội ở cột thương hiệu của footer (sheet góp ý BuildX, PC12). */
  social: {
    facebookUrl: 'https://www.facebook.com/share/19SsMDmzW9/?mibextid=wwXIfr',
    zaloOaUrl: 'https://zalo.me/0934888881',
    youtubeUrl: 'https://www.youtube.com/@Savico.construction',
    tiktokUrl: 'https://www.tiktok.com/@ai.construction_?is_from_webapp=1&sender_device=pc',
    instagramUrl: 'https://www.instagram.com/aiconstruction01/?utm_source=ig_web_button_share_sheet'
  },
  /**
   * Thông tin pháp lý ở hàng đáy footer (mục II.2). Placeholder — Bên A chốt
   * tên công ty và MST.
   */
  legal: {
    taxCode: '0000000000'
  }
} as const

export type SiteConfig = typeof siteConfig
