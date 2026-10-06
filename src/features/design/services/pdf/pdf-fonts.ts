import { Font } from '@react-pdf/renderer'

/**
 * Font mặc định của @react-pdf/renderer không có dấu tiếng Việt, nên phải đăng
 * ký một font Unicode trước khi render. Tải từ CDN lúc chạy — chỉ xảy ra khi
 * người dùng bấm tải hồ sơ.
 */
const FONT_BASE = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro'

export const PDF_FONT_FAMILY = 'Be Vietnam Pro'

let registered = false

export function registerPdfFonts(): void {
  if (registered) return
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: `${FONT_BASE}/BeVietnamPro-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_BASE}/BeVietnamPro-Medium.ttf`, fontWeight: 500 },
      { src: `${FONT_BASE}/BeVietnamPro-SemiBold.ttf`, fontWeight: 600 },
      { src: `${FONT_BASE}/BeVietnamPro-Bold.ttf`, fontWeight: 700 }
    ]
  })
  registered = true
}
