/**
 * Logic THUẦN cho màn sửa chữ cố định của trang Cẩm nang (TDD-HB-003, BR-HB-003). Hình dạng từng khối khớp
 * `PageSectionCatalog` ở backend; không import alias để kiểm được bằng `scripts/handbook-admin.test.mjs`.
 */

export type SectionFieldKind = 'text' | 'textarea' | 'image'

/** Tên các trường của khối chữ; cũng là phần cuối của khóa dịch `admin.handbookContent.fields.<name>`. */
export type SectionFieldName =
  | 'eyebrow'
  | 'title'
  | 'description'
  | 'ctaLabel'
  | 'backgroundImageUrl'
  | 'newsLabel'
  | 'libraryLabel'

/** Mã các khối chữ của trang Cẩm nang; cũng là khóa dịch `admin.handbookContent.sections.<key>`. */
export type SectionKey = 'tabs' | 'hero' | 'stagesHeading' | 'articlesHeading' | 'newsletterHeading' | 'libraryBanner'

export interface SectionField {
  name: SectionFieldName
  kind: SectionFieldKind
  /** Khóa của bản dịch mặc định trong `messages/<locale>.json`, theo từng đoạn: `['handbook', 'foundation', 'title']`. */
  defaultPath: readonly string[]
  /** Chữ bắt buộc phải có nội dung; ảnh luôn tùy chọn (BR-HB-003 khoản 4). */
  required: boolean
}

export interface SectionDef {
  key: SectionKey
  fields: readonly SectionField[]
}

/** Giới hạn độ dài mỗi trường chữ; backend từ chối vượt giới hạn và không tự cắt. */
export const SECTION_TEXT_MAX_LENGTH = 1000

const text = (name: SectionFieldName, path: readonly string[], required = true): SectionField => ({
  name,
  kind: 'text',
  defaultPath: path,
  required
})

/** Sáu khối chữ của trang Cẩm nang (BR-HB-003 khoản 2), theo thứ tự xuất hiện trên trang. */
export const HANDBOOK_SECTIONS: readonly SectionDef[] = [
  {
    key: 'tabs',
    fields: [
      text('newsLabel', ['handbook', 'page', 'tabs', 'news']),
      text('libraryLabel', ['handbook', 'page', 'tabs', 'library'])
    ]
  },
  {
    key: 'hero',
    fields: [
      text('eyebrow', ['handbook', 'foundation', 'kicker']),
      text('title', ['handbook', 'foundation', 'title']),
      { name: 'description', kind: 'textarea', defaultPath: ['handbook', 'foundation', 'description'], required: true },
      text('ctaLabel', ['handbook', 'foundation', 'start']),
      { name: 'backgroundImageUrl', kind: 'image', defaultPath: [], required: false }
    ]
  },
  { key: 'stagesHeading', fields: [text('title', ['handbook', 'foundation', 'stagesTitle'])] },
  {
    key: 'articlesHeading',
    fields: [
      text('title', ['handbook', 'articles', 'title']),
      { name: 'description', kind: 'textarea', defaultPath: ['handbook', 'articles', 'subtitle'], required: true }
    ]
  },
  { key: 'newsletterHeading', fields: [text('title', ['handbook', 'newsletter', 'title'])] },
  {
    key: 'libraryBanner',
    fields: [
      // Tiêu đề banner ngắt dòng bằng ký tự xuống dòng nên dùng ô nhiều dòng.
      { name: 'title', kind: 'textarea', defaultPath: ['handbook', 'library', 'bannerTitle'], required: true },
      {
        name: 'description',
        kind: 'textarea',
        defaultPath: ['handbook', 'library', 'bannerDescription'],
        required: true
      },
      { name: 'backgroundImageUrl', kind: 'image', defaultPath: [], required: false }
    ]
  }
]

/** Chữ mặc định của các trường trong `messages` của một ngôn ngữ. Trường ảnh và khóa thiếu cho chuỗi rỗng. */
export function defaultsFor(fields: readonly SectionField[], messages: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of fields) {
    let cursor: unknown = messages
    for (const segment of field.defaultPath) {
      cursor = cursor && typeof cursor === 'object' ? (cursor as Record<string, unknown>)[segment] : undefined
    }
    result[field.name] = typeof cursor === 'string' ? cursor : ''
  }
  return result
}

/**
 * Nội dung gửi lên backend từ giá trị của form: cắt khoảng trắng đầu cuối, và bỏ hẳn trường ảnh để trống để backend
 * hiểu là "dùng ảnh mặc định" chứ không phải một ảnh rỗng.
 */
export function buildContent(fields: readonly SectionField[], values: Record<string, unknown>): Record<string, string> {
  const content: Record<string, string> = {}
  for (const field of fields) {
    const value = typeof values[field.name] === 'string' ? (values[field.name] as string).trim() : ''
    if (field.kind === 'image' && !value) continue
    content[field.name] = value
  }
  return content
}

/** Hai nội dung có giống nhau không, bỏ qua thứ tự khóa. */
export function sameContent(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((key) => (a[key] ?? '') === (b[key] ?? ''))
}

/** Giá trị ban đầu của form: bản đã lưu nếu có, không thì chữ mặc định để người quản lý sửa từ chữ đang hiển thị. */
export function formValuesFor(
  fields: readonly SectionField[],
  saved: Record<string, unknown> | null | undefined,
  defaults: Record<string, string>
): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of fields) {
    const stored = saved?.[field.name]
    values[field.name] = typeof stored === 'string' ? stored : (defaults[field.name] ?? '')
  }
  return values
}
