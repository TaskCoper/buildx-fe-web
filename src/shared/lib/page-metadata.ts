import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'

/** Khóa tiêu đề trang dưới namespace `meta` của messages. */
export type PageMetaKey =
  | 'home'
  | 'design'
  | 'designInput'
  | 'designEstimate'
  | 'designDossier'
  | 'contractors'
  | 'contractorMatches'
  | 'contractorFirm'
  | 'contractorCompare'
  | 'contractorInvite'
  | 'contractorSent'
  | 'contractorInvitations'
  | 'contractorBrief'
  | 'contractorReview'
  | 'handbook'
  | 'handbookArticle'
  | 'handbookTemplate'
  | 'guide'
  | 'plans'
  | 'plansSupervision'
  | 'consult'
  | 'consultDetail'
  | 'account'
  | 'accountProjects'
  | 'accountFavorites'
  | 'accountDossiers'
  | 'accountPurchases'
  | 'accountConsultations'
  | 'supervision'
  | 'checkoutConfirm'
  | 'checkoutPayment'
  | 'checkoutVerifying'
  | 'checkoutDone'
  | 'checkoutFailed'
  | 'share'
  | 'googleCallback'

/**
 * `generateMetadata` cho một trang: tiêu đề riêng theo mẫu "Chủ đề trang | BuildX"
 * (góp ý BuildX, PC19). Phần "| BuildX" do `title.template` của layout gắn; trang
 * chủ dùng tiêu đề tuyệt đối vì câu của nó đã có sẵn thương hiệu.
 *
 * Dùng: `export const generateMetadata = pageMetadata('guide')`.
 */
export function pageMetadata(key: PageMetaKey) {
  return async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale: locale as Locale, namespace: 'meta' })
    return key === 'home' ? { title: { absolute: t('home') } } : { title: t(key) }
  }
}
