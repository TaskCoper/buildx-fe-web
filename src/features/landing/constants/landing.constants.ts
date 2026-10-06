/** 4 tab của khung minh họa sản phẩm ở hero (mục II.2). */
export const SHOWCASE_TABS = ['floorPlan', 'render3d', 'dossier', 'estimate'] as const

export type ShowcaseTab = (typeof SHOWCASE_TABS)[number]

/**
 * Dải 5 con số dưới hero trang chủ.
 *
 * Đọc từ trái sang phải là đúng lời hứa của sản phẩm: một tấm ảnh là đủ để bắt
 * đầu → ba bước tới hồ sơ → số phương án thiết kế → số nhà thầu được mời (R1) →
 * số lượt kỹ sư kiểm tra của gói giám sát (R5). Con số là chữ trong i18n nên
 * admin sửa được, không phải hằng số tính toán.
 */
export const HOME_STATS = ['photo', 'steps', 'options', 'contractors', 'inspections'] as const

export type HomeStat = (typeof HOME_STATS)[number]

/**
 * Ảnh nền hero chạy slide (sheet góp ý BuildX, tab "Hình ảnh website": banner
 * 01–04). Thứ tự mảng là thứ tự trình chiếu.
 */
export const HERO_SLIDES = [
  '/images/home/hero-banner-01.webp',
  '/images/home/hero-banner-02.webp',
  '/images/home/hero-banner-03.webp',
  '/images/home/hero-banner-04.webp'
] as const

/** Mỗi ảnh hero đứng bao lâu trước khi chuyển (ms). */
export const HERO_SLIDE_INTERVAL_MS = 5000

/** Bốn dòng của thẻ "Hồ sơ dự án" nổi trên ảnh hero. */
export const HERO_CARD_ROWS = ['area', 'type', 'style', 'options'] as const

export type HeroCardRow = (typeof HERO_CARD_ROWS)[number]

/**
 * Năm nỗi đau của chủ nhà — dải xanh đậm "Khó là kiểm soát mọi thứ cùng lúc".
 *
 * Thứ tự bám đúng hành trình của khách: tiền → thiết kế → chọn nhà thầu → hồ sơ
 * đủ để thi công → giám sát. Mỗi mục về sau được một mảng của SAVICO giải quyết.
 */
export const HOME_PAIN_POINTS = ['budget', 'design', 'contractor', 'dossier', 'supervision'] as const

export type HomePainPoint = (typeof HOME_PAIN_POINTS)[number]

/**
 * 15 thương hiệu vật liệu ở dải "Các thương hiệu được tin dùng".
 * Sáu logo cũ + chín logo khách bổ sung từ thư mục SAVICO/IMG, chuẩn hóa tên
 * file và đặt ở `public/images/partners`. Tên nằm trong i18n làm alt ảnh.
 */
export const HOME_BRANDS = [
  'hoaphat',
  'inax',
  'viglacera',
  'dulux',
  'cadivi',
  'scg',
  'kova',
  'dongtam',
  'jotun',
  'toto',
  'vinhtuong',
  'eurowindow',
  'tienphong',
  'hoasen',
  'hatien'
] as const

/** Ảnh logo của từng thương hiệu. */
export const HOME_BRAND_LOGOS: Record<(typeof HOME_BRANDS)[number], string> = {
  hoaphat: '/images/partners/hoa-phat.png',
  inax: '/images/partners/inax.png',
  viglacera: '/images/partners/viglacera.png',
  dulux: '/images/partners/dulux.png',
  cadivi: '/images/partners/cadivi.png',
  scg: '/images/partners/scg.png',
  kova: '/images/partners/kova.png',
  dongtam: '/images/partners/dong-tam-group.png',
  jotun: '/images/partners/jotun.png',
  toto: '/images/partners/toto.png',
  vinhtuong: '/images/partners/vinh-tuong.png',
  eurowindow: '/images/partners/eurowindow.png',
  tienphong: '/images/partners/nhua-tien-phong.png',
  hoasen: '/images/partners/hoa-sen-group.png',
  hatien: '/images/partners/xi-mang-ha-tien.png'
}

export type HomeBrand = (typeof HOME_BRANDS)[number]

/**
 * Bốn hồ sơ mẫu ghim ở trang chủ — mỗi loại công trình một thẻ. Ảnh và số liệu
 * là dữ liệu minh họa, admin sửa được (mục X).
 */
export const HOME_DOSSIERS = ['townhouse', 'villa', 'resort', 'garden'] as const

export type HomeDossier = (typeof HOME_DOSSIERS)[number]

/**
 * Bốn gói dịch vụ trên trang chủ — dải xanh "Chọn gói phù hợp với giai đoạn của
 * bạn". Thứ tự bám theo giai đoạn khách đang đứng: thiết kế → tìm nhà thầu →
 * giám sát → giao trọn gói cho SAVICO.
 */
export const HOME_SERVICES = ['design', 'contractors', 'supervision', 'turnkey'] as const

export type HomeService = (typeof HOME_SERVICES)[number]

/**
 * Hành trình 5 bước trên trang chủ — "Từ ý tưởng đến ngôi nhà hoàn thiện".
 *
 * Thay cho dải 3 bước cũ (mục II.2): bản mô tả cũ chỉ có luồng thiết kế, còn
 * sản phẩm giờ đi tiếp tới mời nhà thầu (S12–S18) và giám sát thi công
 * (S19–S24), nên trang chủ phải kể đủ cả năm chặng.
 */
export const HOME_JOURNEY_STEPS = ['project', 'design', 'dossier', 'contractor', 'build'] as const

export type HomeJourneyStep = (typeof HOME_JOURNEY_STEPS)[number]
