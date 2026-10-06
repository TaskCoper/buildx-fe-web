import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing'
import type {
  CmsBooking,
  CmsBuildingTypeOption,
  CmsFloorOption,
  CmsGift,
  CmsPlanSettings,
  CmsContractorMatching,
  CmsSurveySchedule,
  CmsSupervisionStageDef,
  CmsArticleLabel,
  CmsCostGroup,
  CmsCostItem,
  CmsMaterialPrice,
  CmsEstimateAdvice,
  CmsContractor,
  CmsContractorInvitation,
  CmsDiscountCode,
  CmsOrder,
  CmsCustomer,
  CmsCustomerPackage,
  CmsQuotaEvent,
  CmsDesignProject,
  CmsConsultPackage,
  CmsPackageReview,
  CmsQuotas,
  CmsReport,
  CmsRescheduleRequest,
  CmsSiteSettings,
  CmsSubscription,
  CmsTestimonial,
  CmsSupervisionProject,
  CmsTransaction,
  CmsStaticPage,
  CmsStyleOption,
  CmsUiAssets,
  CmsUiStrings,
  Consultant,
  GuideArticle,
  GuideVideo,
  HandbookArticle,
  HandbookStage,
  HandbookTemplate,
  SubscriptionPlan,
  SupervisionPackage
} from './cms.types'
import {
  BOOKINGS_SEED,
  BUILDING_TYPES_SEED,
  FLOOR_OPTIONS_SEED,
  GIFTS_SEED,
  PLAN_SETTINGS_SEED,
  CONTRACTOR_MATCHING_SEED,
  SURVEY_SCHEDULE_SEED,
  SUPERVISION_STAGES_SEED,
  ARTICLE_LABELS_SEED,
  COST_GROUPS_SEED,
  COST_ITEMS_SEED,
  MATERIAL_PRICES_SEED,
  ESTIMATE_ADVICE_SEED,
  CONSULT_PACKAGES_SEED,
  CONTRACTOR_INVITATIONS_SEED,
  CONTRACTORS_SEED,
  DISCOUNT_CODES_SEED,
  ORDERS_SEED,
  PACKAGE_REVIEWS_SEED,
  REPORTS_SEED,
  RESCHEDULE_REQUESTS_SEED,
  SUBSCRIPTIONS_SEED,
  TRANSACTIONS_SEED,
  CONSULTANTS_SEED,
  CUSTOMERS_SEED,
  CUSTOMER_PACKAGES_SEED,
  QUOTA_EVENTS_SEED,
  DESIGN_PROJECTS_SEED,
  GUIDE_ARTICLES_SEED,
  GUIDE_VIDEOS_SEED,
  HANDBOOK_ARTICLES_SEED,
  HANDBOOK_STAGES_SEED,
  HANDBOOK_TEMPLATES_SEED,
  PLANS_SEED,
  SUPERVISION_PACKAGES_SEED,
  PRIVACY_PAGE_SEED,
  QUOTAS_SEED,
  SITE_SETTINGS_SEED,
  STYLE_OPTIONS_SEED,
  TERMS_PAGE_SEED,
  TESTIMONIALS_SEED
} from './seeds'

/**
 * KHO NỘI DUNG dùng chung giữa trang quản trị (ghi) và site công khai (đọc).
 *
 * Chưa có backend nên bản ghi nằm ở `localStorage`: admin sửa gói cước là trang
 * Gói đăng ký đổi theo ngay, sửa bài Cẩm nang là trang Cẩm nang đổi theo. Khi
 * API .NET sẵn sàng, thay phần thân của `cmsDb` bằng lời gọi HTTP — chữ ký hàm
 * và mọi nơi gọi giữ nguyên.
 *
 * ĐA NGÔN NGỮ — mỗi nội dung có một bản cho mỗi ngôn ngữ. Chuỗi lấy theo chuỗi
 * dự phòng ba nấc:
 *
 *   bản của ngôn ngữ đang xem → bản của ngôn ngữ mặc định (vi) → seed
 *
 * Nhờ vậy admin dịch dần cũng không làm site tiếng Anh trống: chưa có bản EN thì
 * hiện bản VI mới nhất chứ không rơi về nội dung cũ trong code.
 *
 * Dữ liệu VẬN HÀNH (lịch hẹn, người dùng, dự án) không có bản dịch — nó là dữ
 * liệu backend sinh ra, nên nằm chung một ngăn `shared`.
 */

/** Các bảng (nhiều bản ghi, có `id`). */
export interface CmsCollectionMap {
  handbookTemplates: HandbookTemplate
  handbookArticles: HandbookArticle
  handbookStages: HandbookStage
  /** Nhãn bài viết (BR-136). */
  articleLabels: CmsArticleLabel
  /** Lời nhận xét khách hàng ở trang chủ. */
  testimonials: CmsTestimonial
  guideVideos: GuideVideo
  guideArticles: GuideArticle
  plans: SubscriptionPlan
  /** Danh mục quà tặng — gói chọn một quà Đang hoạt động (GiftManagement). */
  gifts: CmsGift
  /** Ba lựa chọn quản lý thi công của trang Gói giám sát (S19). */
  supervisionPackages: SupervisionPackage
  /** Danh mục giai đoạn giám sát (spec admin #15). */
  supervisionStages: CmsSupervisionStageDef
  consultants: Consultant
  bookings: CmsBooking
  customers: CmsCustomer
  /** Gói khách đã mua, theo snapshot đơn — admin chỉ xem (UserAccountManagement §3). */
  customerPackages: CmsCustomerPackage
  /** Lịch sử giữ / trừ / hoàn lượt — chỉ đọc (UserAccountManagement §6). */
  quotaEvents: CmsQuotaEvent
  designProjects: CmsDesignProject
  buildingTypes: CmsBuildingTypeOption
  /** Phương án Số tầng dùng chung — loại công trình chọn ra phương án nó cho phép. */
  floorOptions: CmsFloorOption
  styleOptions: CmsStyleOption
  /** Cấu hình dự toán (spec admin #3). */
  costGroups: CmsCostGroup
  costItems: CmsCostItem
  materialPrices: CmsMaterialPrice
  subscriptions: CmsSubscription
  transactions: CmsTransaction
  rescheduleRequests: CmsRescheduleRequest
  consultPackages: CmsConsultPackage
  packageReviews: CmsPackageReview
  reports: CmsReport
  /** Lời mời báo giá — khách chỉ xem, vận hành đẩy trạng thái (S18, R4). */
  contractorInvitations: CmsContractorInvitation
  /** Dự án đang được giám sát — Giám sát xác nhận từng giai đoạn (S20, R5). */
  supervisionProjects: CmsSupervisionProject
  /** Danh bạ nhà thầu — vận hành nhập và xác minh, luồng Tìm nhà thầu đọc (S12–S15). */
  contractors: CmsContractor
  /** Đơn mua gói — vận hành xác nhận tiền đã về, trang khách đọc trạng thái (S04–S08, R10). */
  orders: CmsOrder
  /** Mã giảm giá — ô nhập mã ở S03 đọc bảng này. */
  discountCodes: CmsDiscountCode
}

export type CmsCollection = keyof CmsCollectionMap

/** Các tài liệu đơn (chỉ có MỘT bản cho mỗi ngôn ngữ). */
export interface CmsDocumentMap {
  settings: CmsSiteSettings
  termsPage: CmsStaticPage
  privacyPage: CmsStaticPage
  /** Hạn mức miễn phí & theo ngày — con số, không có bản dịch riêng. */
  quotas: CmsQuotas
  /** Chu kỳ sử dụng chung của gói thiết kế (DesignPackageManagement §4). */
  planSettings: CmsPlanSettings
  /** Quy tắc đề xuất nhà thầu (spec admin #12). */
  contractorMatching: CmsContractorMatching
  /** Nội dung tư vấn SAVICO dưới bảng dự toán (spec admin #3). */
  estimateAdvice: CmsEstimateAdvice
  /** Lịch khảo sát nhà thầu (spec admin #13). */
  surveySchedule: CmsSurveySchedule
  /** Ghi đè chuỗi giao diện — phủ nốt chữ không nằm trong các bảng trên. */
  uiStrings: CmsUiStrings
  /** Ghi đè ảnh minh họa dùng chung của giao diện. */
  uiAssets: CmsUiAssets
}

export type CmsDocument = keyof CmsDocumentMap

/**
 * Bảng KHÔNG có bản dịch — dữ liệu vận hành do backend sinh, tên khách và ghi
 * chú của nhân viên không dịch theo giao diện.
 */
const SHARED_COLLECTIONS: readonly CmsCollection[] = [
  'bookings',
  'customers',
  'customerPackages',
  'quotaEvents',
  'designProjects',
  'subscriptions',
  'transactions',
  'rescheduleRequests',
  'packageReviews',
  'reports',
  'contractorInvitations',
  'supervisionProjects',
  'contractors',
  'orders',
  'discountCodes',
  // Số liệu cấu hình, không có bản dịch.
  'floorOptions',
  'materialPrices'
]

/** Ngăn lưu: một ngăn cho mỗi ngôn ngữ, cộng ngăn `shared` cho dữ liệu vận hành. */
const SHARED_BUCKET = 'shared'
type Bucket = Locale | typeof SHARED_BUCKET

function bucketOf(collection: CmsCollection, locale: Locale): Bucket {
  return SHARED_COLLECTIONS.includes(collection) ? SHARED_BUCKET : locale
}

/** Bảng này có bản dịch riêng theo ngôn ngữ hay không. */
export function isLocalizedCollection(collection: CmsCollection): boolean {
  return !SHARED_COLLECTIONS.includes(collection)
}

/**
 * Tài liệu KHÔNG rơi về bản ngôn ngữ mặc định.
 *
 * Với nội dung thường, chưa có bản EN thì hiện bản VI mới nhất còn hơn hiện
 * seed cũ. Nhưng `uiStrings` là chữ GHI ĐÈ lên `messages/en.json` — mà bản dịch
 * trong đó vốn đã là tiếng Anh đúng nghĩa. Rơi về bản VI ở đây nghĩa là dán chữ
 * tiếng Việt đè lên site tiếng Anh: tệ hơn hẳn việc không ghi đè gì cả.
 */
const NO_LOCALE_FALLBACK_DOCUMENTS: readonly CmsDocument[] = ['uiStrings']

/**
 * Tài liệu cấu hình thuần SỐ / QUY TẮC — không có bản dịch, cả hai ngôn ngữ dùng
 * chung một bản (lưu ở ngăn ngôn ngữ mặc định). Để theo ngôn ngữ thì admin sửa
 * khi đang ở chế độ EN sẽ không áp cho site tiếng Việt.
 */
const SHARED_DOCUMENTS: readonly CmsDocument[] = ['quotas', 'planSettings', 'contractorMatching', 'surveySchedule']

const documentLocale = (document: CmsDocument, locale: Locale): Locale =>
  SHARED_DOCUMENTS.includes(document) ? DEFAULT_LOCALE : locale

/** Tài liệu này có bản dịch riêng theo ngôn ngữ hay không. */
export function isLocalizedDocument(document: CmsDocument): boolean {
  return !SHARED_DOCUMENTS.includes(document)
}

/** Ngôn ngữ nào có bản dịch riêng — dùng cho công tắc "ngôn ngữ nội dung". */
export const CMS_LOCALES: readonly Locale[] = LOCALES

const COLLECTION_SEEDS: { [K in CmsCollection]: CmsCollectionMap[K][] } = {
  handbookTemplates: HANDBOOK_TEMPLATES_SEED,
  handbookArticles: HANDBOOK_ARTICLES_SEED,
  handbookStages: HANDBOOK_STAGES_SEED,
  articleLabels: ARTICLE_LABELS_SEED,
  testimonials: TESTIMONIALS_SEED,
  guideVideos: GUIDE_VIDEOS_SEED,
  guideArticles: GUIDE_ARTICLES_SEED,
  plans: PLANS_SEED,
  gifts: GIFTS_SEED,
  supervisionPackages: SUPERVISION_PACKAGES_SEED,
  supervisionStages: SUPERVISION_STAGES_SEED,
  consultants: CONSULTANTS_SEED,
  bookings: BOOKINGS_SEED,
  customers: CUSTOMERS_SEED,
  customerPackages: CUSTOMER_PACKAGES_SEED,
  quotaEvents: QUOTA_EVENTS_SEED,
  designProjects: DESIGN_PROJECTS_SEED,
  buildingTypes: BUILDING_TYPES_SEED,
  floorOptions: FLOOR_OPTIONS_SEED,
  styleOptions: STYLE_OPTIONS_SEED,
  costGroups: COST_GROUPS_SEED,
  costItems: COST_ITEMS_SEED,
  materialPrices: MATERIAL_PRICES_SEED,
  subscriptions: SUBSCRIPTIONS_SEED,
  transactions: TRANSACTIONS_SEED,
  rescheduleRequests: RESCHEDULE_REQUESTS_SEED,
  consultPackages: CONSULT_PACKAGES_SEED,
  packageReviews: PACKAGE_REVIEWS_SEED,
  reports: REPORTS_SEED,
  contractorInvitations: CONTRACTOR_INVITATIONS_SEED,
  // Dự án giám sát sinh ra khi khách mua gói; bản demo dựng dữ liệu mẫu ở lần
  // mở bảng điều khiển đầu tiên, nên bảng cũng bắt đầu rỗng.
  supervisionProjects: [],
  contractors: CONTRACTORS_SEED,
  orders: ORDERS_SEED,
  discountCodes: DISCOUNT_CODES_SEED
}

/** Không có gì bị ghi đè — dùng chung một tham chiếu cho cả hai tài liệu. */
const EMPTY_OVERRIDES: Record<string, string> = {}

const DOCUMENT_SEEDS: { [K in CmsDocument]: CmsDocumentMap[K] } = {
  settings: SITE_SETTINGS_SEED,
  termsPage: TERMS_PAGE_SEED,
  privacyPage: PRIVACY_PAGE_SEED,
  quotas: QUOTAS_SEED,
  planSettings: PLAN_SETTINGS_SEED,
  contractorMatching: CONTRACTOR_MATCHING_SEED,
  estimateAdvice: ESTIMATE_ADVICE_SEED,
  surveySchedule: SURVEY_SCHEDULE_SEED,
  // Rỗng = chưa sửa gì: site chạy nguyên bản dịch trong `messages/` và sổ ảnh
  // trong `shared/lib/imagery`. Hai hằng này phải là THAM CHIẾU CỐ ĐỊNH, vì
  // `useSyncExternalStore` so sánh theo tham chiếu khi chưa có bản ghi nào.
  uiStrings: EMPTY_OVERRIDES,
  uiAssets: EMPTY_OVERRIDES
}

/** Khóa localStorage. Đổi `VERSION` để bỏ bản ghi cũ khi cấu trúc thay đổi. */
const STORAGE_KEY = 'savico.cms'
const VERSION = 16

interface CmsSnapshot {
  version: number
  /** `collections[bucket][collection]` */
  collections: Partial<Record<Bucket, Partial<Record<CmsCollection, unknown[]>>>>
  /** `documents[locale][document]` */
  documents: Partial<Record<Locale, Partial<Record<CmsDocument, unknown>>>>
}

const EMPTY_SNAPSHOT: CmsSnapshot = { version: VERSION, collections: {}, documents: {} }

/** Bản đang giữ trong bộ nhớ tab — tránh parse JSON mỗi lần đọc. */
let snapshot: CmsSnapshot | null = null

const listeners = new Set<() => void>()

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Ngôn ngữ của trang đang mở. Layout gốc đặt `<html lang={locale}>` nên lớp mock
 * đọc được ngôn ngữ mà không cần luồn tham số qua từng hàm API — bên gọi vẫn
 * truyền tay được khi cần (trang quản trị sửa bản dịch của ngôn ngữ khác).
 */
export function currentCmsLocale(): Locale {
  if (!isBrowser()) return DEFAULT_LOCALE
  const lang = document.documentElement.lang as Locale
  return LOCALES.includes(lang) ? lang : DEFAULT_LOCALE
}

function load(): CmsSnapshot {
  if (snapshot) return snapshot
  if (!isBrowser()) return EMPTY_SNAPSHOT

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as CmsSnapshot) : null
    snapshot = parsed && parsed.version === VERSION ? parsed : { ...EMPTY_SNAPSHOT }
  } catch {
    // Kho hỏng hoặc bị chặn (chế độ ẩn danh) — chạy tiếp với seed.
    snapshot = { ...EMPTY_SNAPSHOT }
  }
  return snapshot
}

/**
 * Số lần kho đổi. `useSyncExternalStore` đòi cùng một tham chiếu khi dữ liệu
 * chưa đổi, nên mọi bản đọc "ổn định" được nhớ theo revision này.
 */
let revision = 0
const stableCache = new Map<string, { revision: number; value: unknown }>()

function cached<T>(key: string, produce: () => T): T {
  const hit = stableCache.get(key)
  if (hit && hit.revision === revision) return hit.value as T
  const value = produce()
  stableCache.set(key, { revision, value })
  return value
}

function persist(next: CmsSnapshot): void {
  snapshot = next
  revision += 1
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Hết dung lượng — vẫn giữ thay đổi trong bộ nhớ tab.
    }
  }
  listeners.forEach((listener) => listener())
}

export const cmsDb = {
  /**
   * Bản ghi của một bảng cho ngôn ngữ đang xem: bản của ngôn ngữ đó → bản của
   * ngôn ngữ mặc định → seed.
   */
  list<K extends CmsCollection>(collection: K, locale: Locale = currentCmsLocale()): CmsCollectionMap[K][] {
    const stored = load().collections
    const bucket = bucketOf(collection, locale)
    const own = stored[bucket]?.[collection] as CmsCollectionMap[K][] | undefined
    if (own) return own

    const fallback = stored[bucketOf(collection, DEFAULT_LOCALE)]?.[collection] as CmsCollectionMap[K][] | undefined
    return fallback ?? COLLECTION_SEEDS[collection]
  },

  /** Bản ổn định theo tham chiếu — dùng cho `useSyncExternalStore`. */
  listStable<K extends CmsCollection>(collection: K, locale: Locale = currentCmsLocale()): CmsCollectionMap[K][] {
    return cached(`${locale}:${collection}`, () => cmsDb.list(collection, locale))
  },

  find<K extends CmsCollection>(
    collection: K,
    id: string,
    locale: Locale = currentCmsLocale()
  ): CmsCollectionMap[K] | null {
    return cmsDb.list(collection, locale).find((item) => (item as { id: string }).id === id) ?? null
  },

  /** Ghi đè toàn bộ bảng của MỘT ngôn ngữ (dùng khi sắp xếp lại thứ tự). */
  replace<K extends CmsCollection>(
    collection: K,
    items: CmsCollectionMap[K][],
    locale: Locale = currentCmsLocale()
  ): void {
    const stored = load()
    const bucket = bucketOf(collection, locale)
    persist({
      ...stored,
      collections: {
        ...stored.collections,
        [bucket]: { ...stored.collections[bucket], [collection]: items }
      }
    })
  },

  /** Thêm mới hoặc cập nhật theo `id`; bản ghi mới được đẩy lên đầu bảng. */
  upsert<K extends CmsCollection>(
    collection: K,
    item: CmsCollectionMap[K],
    locale: Locale = currentCmsLocale()
  ): CmsCollectionMap[K] {
    const items = cmsDb.list(collection, locale)
    const id = (item as { id: string }).id
    const index = items.findIndex((existing) => (existing as { id: string }).id === id)
    const next = index >= 0 ? items.map((existing, i) => (i === index ? item : existing)) : [item, ...items]
    cmsDb.replace(collection, next, locale)
    return item
  },

  remove<K extends CmsCollection>(collection: K, id: string, locale: Locale = currentCmsLocale()): void {
    cmsDb.replace(
      collection,
      cmsDb.list(collection, locale).filter((item) => (item as { id: string }).id !== id),
      locale
    )
  },

  getDocument<K extends CmsDocument>(document: K, requested: Locale = currentCmsLocale()): CmsDocumentMap[K] {
    const locale = documentLocale(document, requested)
    const stored = load().documents
    const own = stored[locale]?.[document] as CmsDocumentMap[K] | undefined
    if (own) return own

    if (NO_LOCALE_FALLBACK_DOCUMENTS.includes(document)) return DOCUMENT_SEEDS[document]

    const fallback = stored[DEFAULT_LOCALE]?.[document] as CmsDocumentMap[K] | undefined
    return fallback ?? DOCUMENT_SEEDS[document]
  },

  /** Bản ổn định theo tham chiếu — dùng cho `useSyncExternalStore`. */
  getDocumentStable<K extends CmsDocument>(document: K, locale: Locale = currentCmsLocale()): CmsDocumentMap[K] {
    return cached(`${locale}:doc:${document}`, () => cmsDb.getDocument(document, locale))
  },

  saveDocument<K extends CmsDocument>(
    document: K,
    value: CmsDocumentMap[K],
    requested: Locale = currentCmsLocale()
  ): CmsDocumentMap[K] {
    const locale = documentLocale(document, requested)
    const stored = load()
    persist({
      ...stored,
      documents: {
        ...stored.documents,
        [locale]: { ...stored.documents[locale], [document]: value }
      }
    })
    return value
  },

  /** Trả nội dung về seed gốc — nút "Khôi phục mặc định" của trang quản trị. */
  reset(): void {
    persist({ version: VERSION, collections: {}, documents: {} })
  },

  /** Ngôn ngữ này đã có bản dịch riêng cho nội dung nào chưa. */
  hasTranslation(locale: Locale): boolean {
    const stored = load()
    return Boolean(stored.collections[locale]) || Boolean(stored.documents[locale])
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
}

/** Seed gốc — trang quản trị dùng để so sánh / khôi phục từng mục. */
export function cmsSeedOf<K extends CmsCollection>(collection: K): CmsCollectionMap[K][] {
  return COLLECTION_SEEDS[collection]
}

export function cmsDocumentSeedOf<K extends CmsDocument>(document: K): CmsDocumentMap[K] {
  return DOCUMENT_SEEDS[document]
}

// Đồng bộ giữa các tab: kho đổi ở tab khác thì bỏ cache và báo cho listener.
if (isBrowser()) {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    snapshot = null
    revision += 1
    listeners.forEach((listener) => listener())
  })
}
