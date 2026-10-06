import { ROUTES } from '@/shared/constants/routes'

/** Translation key under the `nav` namespace. */
export type NavLabelKey = 'design' | 'contractors' | 'handbook' | 'guide' | 'plans' | 'consult'

export interface SiteNavItem {
  labelKey: NavLabelKey
  href: string
}

/**
 * Thanh công cụ — mục II.1 của bản mô tả giao diện.
 * Thứ tự cố định: Home (logo) → Thiết kế & Dự toán → Tìm nhà thầu → Cẩm nang →
 * Hướng dẫn → Gói đăng ký → Tư vấn 1:1. Logo giữ vai trò mục Home nên không nằm
 * trong mảng này.
 *
 * "Tìm nhà thầu" (S09) đứng ngay sau "Thiết kế & Dự toán" vì đó là thứ tự thật
 * của hành trình: xong thiết kế thì đi tìm người thi công (ranh giới dịch vụ ở
 * S09). Bản mô tả v1.1 vẽ ba biến thể thanh menu khác nhau giữa các hình — lấy
 * MỘT bộ duy nhất này làm chuẩn cho cả khách và người đã đăng nhập.
 */
export const SITE_NAV: readonly SiteNavItem[] = [
  { labelKey: 'design', href: ROUTES.DESIGN },
  { labelKey: 'contractors', href: ROUTES.CONTRACTORS },
  { labelKey: 'handbook', href: ROUTES.HANDBOOK },
  { labelKey: 'guide', href: ROUTES.GUIDE },
  { labelKey: 'plans', href: ROUTES.PLANS },
  { labelKey: 'consult', href: ROUTES.CONSULT }
] as const
