import { ROUTES } from '@/shared/constants/routes'

/**
 * Ba cot lien ket cua footer (San pham - Ho tro - Ve SAVICO).
 *
 * `href: null` = man hinh chua dung (Thi cong tron goi la hop thoai chu khong
 * phai trang; Cau hoi thuong gap va Gioi thieu chua co route). Muc do van hien
 * nhung lam mo va khong bam duoc, de footer phan anh dung cau truc khach duyet
 * ma khong tao link chet. Co route roi thi thay `null` bang route do.
 */

/** Khoa dich duoi namespace `footer.links`. */
export type FooterLinkKey =
  | 'design'
  | 'services'
  | 'contractors'
  | 'supervision'
  | 'turnkey'
  | 'guide'
  | 'handbook'
  | 'consult'
  | 'faq'
  | 'terms'
  | 'privacy'
  | 'aiTerms'
  | 'ecommerce'
  | 'paymentPolicy'

export interface FooterLink {
  labelKey: FooterLinkKey
  href: string | null
  /** Mục không phải trang mà mở hộp thoại (Thi công trọn gói → form Đăng ký triển khai). */
  action?: 'turnkey'
}

/** Cot "San pham". */
export const FOOTER_PRODUCT_LINKS: readonly FooterLink[] = [
  { labelKey: 'design', href: ROUTES.DESIGN },
  { labelKey: 'services', href: ROUTES.PLANS },
  { labelKey: 'contractors', href: ROUTES.CONTRACTORS },
  { labelKey: 'supervision', href: ROUTES.PLANS_SUPERVISION },
  { labelKey: 'turnkey', href: null, action: 'turnkey' }
] as const

/** Cot "Ho tro". */
export const FOOTER_SUPPORT_LINKS: readonly FooterLink[] = [
  { labelKey: 'guide', href: ROUTES.GUIDE },
  { labelKey: 'handbook', href: ROUTES.HANDBOOK },
  { labelKey: 'consult', href: ROUTES.CONSULT },
  // FAQ nằm ở trang Tìm nhà thầu (section #faq), không phải trang Hướng dẫn.
  { labelKey: 'faq', href: `${ROUTES.CONTRACTORS}#faq` }
] as const

/** Cot "Ve SAVICO". */
export const FOOTER_ABOUT_LINKS: readonly FooterLink[] = [
  { labelKey: 'terms', href: ROUTES.TERMS },
  { labelKey: 'privacy', href: ROUTES.PRIVACY },
  { labelKey: 'aiTerms', href: ROUTES.AI_TERMS },
  { labelKey: 'ecommerce', href: ROUTES.ECOMMERCE_PARTNERS },
  { labelKey: 'paymentPolicy', href: ROUTES.PAYMENT_POLICY }
] as const
