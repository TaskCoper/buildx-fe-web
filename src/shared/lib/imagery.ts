/**
 * Semantic image registry.
 *
 * Every photo is picked to MATCH what it illustrates — a pitched-roof house for
 * "Nhà mái", a neoclassical living room for "Tân cổ điển" — rather than pulled
 * from a random pool. Swap the URLs for CMS assets when admin uploads the real
 * catalogue (mục VI: dữ liệu tĩnh do admin biên soạn); the keys stay the same.
 *
 * Remote photos are royalty-free (Unsplash) and every id below was verified to
 * resolve. Local renders under `/images` ship with the app.
 */

const UNSPLASH = 'https://images.unsplash.com/'

/** Build a sized Unsplash URL. */
const photo = (id: string, width = 900) => `${UNSPLASH}${id}?w=${width}&q=80&auto=format&fit=crop`

/**
 * Thẻ ảnh của trường "Kiểu kiến trúc & phong cách" (Phụ lục A, trường 7).
 *
 * Một trường gộp nên mỗi phong cách chỉ có MỘT ảnh; Hình 04 dùng ảnh ngoại thất
 * cho nhà đất. Danh mục và ảnh sẽ do admin thay (mục X, #6) — các id dưới đây
 * là seed đã kiểm tra resolve được.
 */
export const STYLE_IMAGE = {
  /** Nhà phố / villa hiện đại — khối hộp, gỗ + kính. */
  modern: photo('photo-1600047509807-ba8f99d2cdde'),
  /** Wabi-sabi — vật liệu thô, tông ấm. */
  'wabi-sabi': photo('photo-1502672260266-1c1ef2d93688'),
  /** Tân cổ điển — phào chỉ, mái đầu hồi. */
  neoclassical: photo('photo-1592595896551-12b371d546d5'),
  /** Tối giản (Minimalism) — mặt phẳng, ít chi tiết. */
  minimal: photo('photo-1600585154340-be6161a56a0c'),
  /** Indochine — Đông Dương, gạch bông, cửa lá sách. */
  indochine: photo('photo-1616137466211-f939a420be84'),
  /** Nhà mái Thái hiện đại — mái dốc lợp ngói. */
  'thai-roof': photo('photo-1449844908441-8829872d2607'),
  /** Nhà mái Nhật hiện đại — mái dốc thấp, hiên rộng. */
  'japanese-roof': photo('photo-1580587771525-78b9dba3b914'),
  /** Nhà vườn mái Thái — dùng lại ảnh mái Thái cho tới khi có ảnh riêng. */
  'garden-thai-roof': photo('photo-1449844908441-8829872d2607'),
  /** Nhà vườn mái Nhật — dùng lại ảnh mái Nhật cho tới khi có ảnh riêng. */
  'garden-japanese-roof': photo('photo-1580587771525-78b9dba3b914'),
  /** Biệt thự / villa sân vườn. */
  'garden-villa': photo('photo-1613490493576-7fde63acd811'),
  /** Nhà cấp 4 hiện đại. */
  'level4-modern': photo('photo-1523217582562-09d0def993a6')
} as const

/** Phong cách nội thất — không gian bên trong, dùng cho cẩm nang & minh họa. */
export const INTERIOR_IMAGE = {
  modern: photo('photo-1600607687939-ce8a6c25118c'),
  minimal: photo('photo-1583847268964-b28dc8f51f92'),
  neoclassical: photo('photo-1616137466211-f939a420be84'),
  indochine: photo('photo-1502672260266-1c1ef2d93688')
} as const

/** Loại công trình — dùng cho thẻ minh họa và ảnh bìa. */
export const BUILDING_IMAGE = {
  townhouse: photo('photo-1600585154340-be6161a56a0c'),
  villa: photo('photo-1613490493576-7fde63acd811'),
  roofed: photo('photo-1449844908441-8829872d2607'),
  garden: photo('photo-1580587771525-78b9dba3b914'),
  apartment: photo('photo-1522708323590-d24dbb6b0267')
} as const

/** Ảnh chủ đề dùng chung cho cẩm nang, hướng dẫn và hồ sơ. */
export const TOPIC_IMAGE = {
  articleEnd: '/images/handbook/article-end-villa.png',
  /** Công trường / lô đất — minh họa bước chụp ảnh lô đất. */
  site: photo('photo-1541888946425-d81bb19240f5'),
  /** Kiến trúc sư đang đọc bản vẽ — minh họa nhập liệu, hồ sơ, dự toán. */
  blueprint: photo('photo-1503387762-592deb58ef4e'),
  /** Bếp mở — mẫu nội thất. */
  kitchen: photo('photo-1484154218962-a197022b5858'),
  /** Phòng khách sáng, thoáng — mẫu bố trí. */
  livingRoom: photo('photo-1600566753086-00f18fb6b3ea'),
  /** Phòng khách ấm, nhiều cây — mẫu bố trí. */
  warmLiving: photo('photo-1616486338812-3dadae4b4ace'),
  /** Phòng khách nhiều tranh — bài viết ngân sách nội thất. */
  gallery: photo('photo-1600210492486-724fe5c67fb0')
} as const

/**
 * Ảnh thi công dùng cho cẩm nang và tin tức xây dựng. Mỗi id đã kiểm tra
 * resolve và xem tận mắt để chắc đúng chủ đề; admin sẽ thay bằng ảnh chụp công
 * trình SAVICO khi có CMS.
 */
export const CONSTRUCTION_IMAGE = {
  /** Sàn thép chờ đổ bê tông — phần thô, kết cấu. */
  rebar: photo('photo-1504307651254-35680f356dfd'),
  /** Thợ đấu nối điện tại công trình — hệ thống kỹ thuật. */
  electrician: photo('photo-1621905251189-08b45d6a269e'),
  /** Cao ốc đang xây kèm cần cẩu — tin tức thị trường, vật liệu. */
  crane: photo('photo-1565008447742-97f6f38c985c'),
  /** Vòi nước, thiết bị vệ sinh. */
  faucet: photo('photo-1517646287270-a5a9ca602e5c')
} as const

/** Ba giai đoạn xây nhà của cẩm nang nền tảng (Phần 3.1). */
export const STAGE_IMAGE = {
  /** Phần thô — công trường, kết cấu chưa hoàn thiện. */
  structure: CONSTRUCTION_IMAGE.rebar,
  /** Phần hoàn thiện — kỹ sư đọc bản vẽ tại công trình. */
  finishing: photo('photo-1503387762-592deb58ef4e'),
  /** Trang trí nội thất — không gian đã hoàn thiện. */
  interior: photo('photo-1600607687939-ce8a6c25118c')
} as const

/**
 * Ảnh hiện trường của 6 giai đoạn giám sát (R5) — dùng cho tấm ảnh bên phải
 * khối "GÓI AN TÂM · GIÁM SÁT" ở thẻ dự án (Hình S24).
 *
 * Là ảnh SEED: bản mock không có URL ảnh thật (`StageFile` chỉ giữ tên tệp và
 * dung lượng), nên tấm này minh họa giai đoạn ĐANG CHẠY. Khi backend trả ảnh
 * khách tải lên thì lấy ảnh mới nhất của giai đoạn đó thay cho bảng này; trong
 * lúc chờ, admin thay được từng ảnh ở màn "Hình ảnh site".
 */
export const SUPERVISION_IMAGE = {
  /** Hồ sơ pháp lý — bản vẽ, giấy phép. */
  legal: TOPIC_IMAGE.blueprint,
  /** Móng & khởi công — hố móng, cốt thép. */
  foundation: photo('photo-1590274853856-f22d5ee3d228'),
  /** Phần thô, kết cấu — sàn thép chờ đổ bê tông. */
  structure: CONSTRUCTION_IMAGE.rebar,
  /** Hệ thống kỹ thuật & chống thấm — thợ đấu nối điện nước. */
  mep: CONSTRUCTION_IMAGE.electrician,
  /** Hoàn thiện — sơn bả, ốp lát. */
  finishing: STAGE_IMAGE.finishing,
  /** Nghiệm thu & bàn giao — công trình đã xong, sân vườn. */
  handover: BUILDING_IMAGE.garden
} as const

/**
 * Ảnh chân dung kiến trúc sư của trang Tư vấn 1:1 (mục VIII.1, Hình 14).
 * Toàn bộ là ảnh SEED — admin tải ảnh thật của KTS lên và thay ở mục X, #5.
 */
export const PORTRAIT_IMAGE = {
  /** Nam, vest tối — KTS trưởng. */
  man1: photo('photo-1560250097-0b93528c311a', 600),
  /** Nam, chân dung sáng. */
  man2: photo('photo-1507003211169-0a1dd7228f2d', 600),
  /** Nam, đeo kính. */
  man3: photo('photo-1568602471122-7832951cc4c5', 600),
  /** Nữ, trang phục công sở. */
  woman1: photo('photo-1573496359142-b8d87734a5a2', 600),
  /** Nữ, chân dung sáng. */
  woman2: photo('photo-1580489944761-15a19d654956', 600),
  /** Nữ, chân dung ngoài trời. */
  woman3: photo('photo-1544005313-94ddf0286df2', 600)
} as const

/**
 * Phối cảnh 3D mẫu — model kiến trúc trắng, ảnh dựng sẵn trong `/public`.
 * Dùng ở khung minh họa trang chủ và thẻ xem trước hồ sơ.
 */
export const RENDER_IMAGE = {
  villa: '/images/villa-light.png',
  townhouse: '/images/townhouse-light.png',
  apartment: '/images/appartment-light.png'
} as const

/**
 * Thư mục chứa MỌI file ảnh khách gửi cho thư viện mẫu.
 *
 * Ảnh stock (Unsplash) và ảnh dựng sẵn đều nằm ngoài thư mục này, nên chỉ cần so
 * tiền tố là biết một mẫu đang dùng file thật hay ảnh minh họa tạm — panel màn
 * chờ dựa vào đúng dấu hiệu đó để không bốc nhầm ảnh stock.
 */
export const LIBRARY_PHOTO_PREFIX = '/images/library/'

/** Ảnh trong thư viện file khách gửi: `'2d/2d-0001.webp'` → đường dẫn đầy đủ. */
const libraryPhoto = (file: string) => `${LIBRARY_PHOTO_PREFIX}${file}`

/**
 * Bản vẽ mặt bằng THẬT của thư viện mẫu 2D (Phần 2.1).
 *
 * File khách gửi, đã chuyển sang webp và đặt trong `/public/images/library/2d`.
 * Mỗi tấm là mặt bằng TẦNG TRỆT của một mẫu — các tầng còn lại vẫn để
 * `PlanDrawing` dựng SVG cho tới khi có đủ file, đúng như fallback sẵn có của
 * `TemplateFigure`. Khóa đặt theo kích thước lô để khỏi lẫn khi thêm bản vẽ mới.
 */
export const PLAN_IMAGE = {
  /** Lô 9×20m, 91m² sàn — phòng ngủ trệt, tiểu cảnh giữa nhà, chỗ đậu ô tô. */
  garden9x20: libraryPhoto('2d/2d-0001.webp'),
  /** Lô 4×9,8m, 35,2m² sàn — nhà phố hẹp, gara xe máy. */
  townhouse4x10: libraryPhoto('2d/2d-0002.webp'),
  /** Lô 5×10m, 25,25m² phần ở — gara ô tô trong nhà, sân thượng nhỏ. */
  townhouse5x10: libraryPhoto('2d/2d-0003.webp'),
  /** Lô 5×12m — gara ô tô, phòng ngủ 1 ở tầng trệt. */
  townhouse5x12: libraryPhoto('2d/2d-0004.webp'),
  /** Lô 6,75×10,02m — phòng ngủ chính tầng trệt, mái che xe. */
  garden675x10: libraryPhoto('2d/2d-0005.webp'),
  /** Lô 6,75×13m — gara ô tô + gara xe máy, phòng sinh hoạt chung. */
  garden675x13: libraryPhoto('2d/2d-0006.webp')
} as const

/**
 * Ảnh phối cảnh nội thất THẬT của thư viện mẫu 3D (Phần 2.2).
 *
 * Sáu tấm khách gửi, đã chuyển sang webp trong `/public/images/library/3d`.
 * Toàn bộ là phòng khách tông kem – gỗ sáng nên chỉ gắn cho mẫu HIỆN ĐẠI /
 * TỐI GIẢN; mẫu Tân cổ điển, Indochine, mái Thái vẫn dùng ảnh stock cho tới khi
 * có phối cảnh đúng phong cách.
 */
export const INTERIOR_RENDER = {
  /** Phòng khách căn hộ tông kem, sofa cong, đèn chùm bi. */
  creamLiving: libraryPhoto('3d/3d-0001.webp'),
  /** Phòng khách trắng ấm, sofa module, ghế Togo, ban công. */
  softMinimal: libraryPhoto('3d/3d-0004.webp'),
  /** Vách TV đá marble kết hợp lam gỗ, hắt sáng viền. */
  stoneTvWall: libraryPhoto('3d/3d-0005.webp'),
  /** Khách – ăn liên thông, cửa vòm nhìn ra thành phố. */
  openDining: libraryPhoto('3d/3d-0007.webp'),
  /** Phòng khách tông gỗ óc chó, tủ TV kịch trần, đèn cần câu. */
  walnutLiving: libraryPhoto('3d/3d-0008.webp'),
  /** Phòng khách tối giản cạnh ban công, sofa bông kem. */
  balconyLiving: libraryPhoto('3d/3d-0009.webp')
} as const

/**
 * Ảnh nền khối hero trang chủ — đang là ẢNH TẠM (placeholder) chờ ảnh thật của
 * khách: lô đất / ngôi nhà hoàn thiện chụp ngang. Để tạm một tấm stock ở đây thì
 * khách dễ tưởng đó là ảnh chốt, nên chỗ này cố ý trung tính. Thay bằng URL ảnh
 * thật ở màn "Hình ảnh site" là xong, khóa `home.hero` giữ nguyên.
 */
export const HOME_IMAGE = {
  hero: '/images/placeholder-hero.svg',
  /** Bốn thẻ "Hồ sơ mẫu" — mỗi thẻ một khóa để admin thay từng ảnh. */
  dossierTownhouse: '/images/placeholder-hero.svg',
  dossierVilla: '/images/placeholder-hero.svg',
  dossierResort: '/images/placeholder-hero.svg',
  dossierGarden: '/images/placeholder-hero.svg'
} as const

/** Banner đầu trang Cẩm nang "Hiểu rõ từng bước xây nhà" — ảnh khách gửi (góp ý CN02). */
export const HANDBOOK_IMAGE = {
  banner: '/images/handbook/banner.webp',
  /** Banner đầu tab Thư viện mẫu — cùng khung với `banner` của tab Tin tức. */
  libraryBanner: '/images/handbook/thu-vien-mau-banner.png'
} as const

/**
 * Ảnh banner khối hero trang "Tìm nhà thầu" — ảnh khách gửi trong sheet góp ý
 * BuildX. Thẻ nhà thầu được đặt nổi lên trên bằng CSS.
 */
export const MAP_IMAGE = {
  contractors: '/images/contractors/banner-tim-nha-thau.png'
} as const

/**
 * Logo hệ thống ở thanh menu, chân trang, các màn checkout và đăng nhập.
 *
 * CHỖ CHỜ ASSET: để TRỐNG có chủ đích — chưa có file logo thật thì `Logo` dựng
 * bản vẽ bằng code (chữ "SAVI" + biểu tượng + dòng định vị). Admin dán URL ảnh
 * vào là ảnh thay hẳn cụm đó; ảnh logo đã mang sẵn slogan nên không có dòng chữ
 * riêng. `logoOnDark` là bản cho nền tối của chân trang — bỏ trống thì chân
 * trang vẫn dùng bản vẽ bằng code, vì ảnh logo nền sáng đặt lên nền tối sẽ mất chữ.
 */
export const BRAND_IMAGE = {
  logo: '',
  logoOnDark: ''
} as const

/* ===========================================================================
 * SỔ ẢNH PHẲNG — nguồn cho màn "Hình ảnh site" của khu quản trị.
 * ======================================================================== */

/** Gắn tiền tố nhóm vào khóa: `modern` → `style.modern`. */
function prefixed(prefix: string, group: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(group).map(([key, url]) => [`${prefix}.${key}`, url]))
}

/** `{ modern: … }` + tiền tố `style` → `{ 'style.modern': string }`, giữ khóa hằng. */
type Prefixed<P extends string, T> = { [K in keyof T & string as `${P}.${K}`]: string }

/**
 * Mọi ảnh dùng chung của giao diện, gộp về một bảng phẳng để khu quản trị liệt
 * kê và thay từng cái.
 *
 * Ảnh nằm TRONG các bảng nội dung (mẫu, bài viết, hồ sơ KTS, thẻ phong cách) đã
 * sửa được ngay trên bảng của chúng — chỗ này chỉ gom những ảnh mà trước đây
 * phải sửa code mới đổi được.
 */
export const SITE_IMAGE = {
  ...prefixed('style', STYLE_IMAGE),
  ...prefixed('interior', INTERIOR_IMAGE),
  ...prefixed('building', BUILDING_IMAGE),
  ...prefixed('topic', TOPIC_IMAGE),
  ...prefixed('construction', CONSTRUCTION_IMAGE),
  ...prefixed('stage', STAGE_IMAGE),
  ...prefixed('supervision', SUPERVISION_IMAGE),
  ...prefixed('portrait', PORTRAIT_IMAGE),
  ...prefixed('render', RENDER_IMAGE),
  ...prefixed('plan', PLAN_IMAGE),
  ...prefixed('interior3d', INTERIOR_RENDER),
  ...prefixed('map', MAP_IMAGE),
  ...prefixed('handbook', HANDBOOK_IMAGE),
  ...prefixed('home', HOME_IMAGE),
  ...prefixed('brand', BRAND_IMAGE)
} as Prefixed<'style', typeof STYLE_IMAGE> &
  Prefixed<'interior', typeof INTERIOR_IMAGE> &
  Prefixed<'building', typeof BUILDING_IMAGE> &
  Prefixed<'topic', typeof TOPIC_IMAGE> &
  Prefixed<'construction', typeof CONSTRUCTION_IMAGE> &
  Prefixed<'stage', typeof STAGE_IMAGE> &
  Prefixed<'supervision', typeof SUPERVISION_IMAGE> &
  Prefixed<'portrait', typeof PORTRAIT_IMAGE> &
  Prefixed<'render', typeof RENDER_IMAGE> &
  Prefixed<'plan', typeof PLAN_IMAGE> &
  Prefixed<'interior3d', typeof INTERIOR_RENDER> &
  Prefixed<'map', typeof MAP_IMAGE> &
  Prefixed<'handbook', typeof HANDBOOK_IMAGE> &
  Prefixed<'home', typeof HOME_IMAGE> &
  Prefixed<'brand', typeof BRAND_IMAGE>

export type SiteImageKey = keyof typeof SITE_IMAGE
