/**
 * Kho nội dung (CMS) dùng chung.
 *
 * `features/admin` GHI, các feature công khai (handbook, guide, plans,
 * consultation, landing) ĐỌC. Đặt ở `shared/` vì hai feature không được import
 * lẫn nhau — xem docs/ARCHITECTURE.md §2.
 */
export {
  CMS_LOCALES,
  cmsDb,
  cmsDocumentSeedOf,
  cmsSeedOf,
  currentCmsLocale,
  isLocalizedCollection,
  isLocalizedDocument
} from './cms.db'
export type { CmsCollection, CmsCollectionMap, CmsDocument, CmsDocumentMap } from './cms.db'
export { cmsText, useCmsCollection, useCmsDocument } from './use-cms'
export { CmsMessagesProvider, applyStringOverrides, isOverridableMessageKey } from './cms-messages'
export { siteImage, useSiteImage } from './use-site-image'
export {
  RECEIVING_ACCOUNT,
  discountAmountOf,
  discountUsage,
  evaluateDiscount,
  normalizeDiscountCode,
  transferContentOf,
  transferInfoFor
} from './commerce'
export type { DiscountContext, DiscountRejection, DiscountResult } from './commerce'
export {
  isActiveSurvey,
  isSurveyDayClosed,
  isSurveySlotClosed,
  nextSurveySlotId,
  surveyBookableDays,
  surveyDateKey,
  surveySlotLabel,
  surveySlotRange
} from './survey'
export { isBriefSupported, isContractorEligible } from './contractor-matching'
export type { MatchingBrief } from './contractor-matching'
export {
  CONSULT_SESSION_TIMES,
  CONSULT_SLOT_MINUTES,
  bookingAt,
  consultSlotState,
  isSlotClosed,
  sessionOfTime
} from './consult'
export type { ConsultSlotState } from './consult'
export {
  PLAN_BENEFIT_TEXT_MAX,
  PLAN_TOGGLE_GROUPS,
  PLAN_TOGGLE_KEYS,
  isBenefitEnabled,
  levelDisplay,
  resolvePlanGift,
  toggleDisplay
} from './plans'
export type { PlanBenefitDisplay } from './plans'
/** Mọi kiểu bản ghi CMS — feature đọc/ghi lấy thẳng từ đây. */
export type * from './cms.types'
