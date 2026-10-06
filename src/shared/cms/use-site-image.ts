'use client'

import { SITE_IMAGE, type SiteImageKey } from '@/shared/lib/imagery'
import { useCmsDocument } from './use-cms'

/**
 * Ảnh minh họa của giao diện, ưu tiên bản admin đã thay.
 *
 * Cùng nguyên tắc với `cmsText`: kho chỉ GHI ĐÈ, khóa nào admin chưa đụng thì
 * dùng ảnh seed trong `shared/lib/imagery` — site không bao giờ trống ảnh dù
 * kho nội dung rỗng.
 */
export function useSiteImage(key: SiteImageKey): string {
  const overrides = useCmsDocument('uiAssets')
  const override = overrides[key]?.trim()
  return override ? override : SITE_IMAGE[key]
}

/**
 * Bản không-hook, dùng trong hàm thuần (ví dụ dựng danh mục Bước 1 từ dữ liệu
 * đã lấy về). Bên gọi tự truyền bảng ghi đè đọc được từ `useCmsDocument`.
 */
export function siteImage(overrides: Record<string, string>, key: SiteImageKey): string {
  const override = overrides[key]?.trim()
  return override ? override : SITE_IMAGE[key]
}
