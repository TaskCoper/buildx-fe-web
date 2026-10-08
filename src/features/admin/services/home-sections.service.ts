/**
 * Logic THUẦN cho màn sửa nội dung trang chủ. Hình dạng từng khối khớp những gì các section của trang chủ đọc
 * (xem `docs/BE_API_GAPS.md` mục 8); không import alias để kiểm được bằng `scripts/home-admin.test.mjs`.
 *
 * Quy tắc xuyên suốt giống phía hiển thị: trường nào không lưu thì trang dùng nội dung có sẵn trong ứng dụng. Vì vậy
 * form mở ra với đúng chữ đang hiển thị (sửa tại chỗ), và khi lưu chỉ những trường khác bản có sẵn mới được ghi —
 * gõ lại đúng chữ gốc nghĩa là bỏ sửa đổi, và chữ gốc đổi sau này vẫn tự lan sang trang.
 */

export type HomeFieldKind = 'text' | 'textarea' | 'image' | 'icon'

export interface HomeField {
  /** Tên trường trong nội dung lưu; cũng là phần cuối của khóa dịch `admin.homeContent.fields.<name>`. */
  name: string
  kind: HomeFieldKind
  /**
   * Khóa của chữ có sẵn trong `messages/<locale>.json`, theo từng đoạn. Đoạn `{row}` được thay bằng khóa của dòng khi
   * trường nằm trong danh sách cố định. Ảnh và icon không có chữ có sẵn nên bỏ trống.
   */
  defaultPath?: readonly string[]
}

/** Danh sách cố định: đúng từng ấy thẻ trên trang, thứ tự cố định, mỗi thẻ có chữ có sẵn riêng. */
export interface HomeFixedList {
  type: 'rows'
  name: string
  rows: readonly string[]
  fields: readonly HomeField[]
}

/** Danh sách admin thêm bớt tự do; để trống thì trang dùng bộ có sẵn, có ít nhất một mục thì thay hoàn toàn. */
export interface HomeRepeatList {
  type: 'repeat'
  name: string
  max: number
  fields: readonly HomeField[]
}

/** Danh sách id chọn từ kho (mẫu thư viện hoặc video hướng dẫn), giữ đúng thứ tự đã chọn. */
export interface HomeIdList {
  type: 'ids'
  name: string
  max: number
  source: 'templates' | 'guides'
}

export type HomeList = HomeFixedList | HomeRepeatList | HomeIdList

export type HomeSectionKey =
  | 'hero'
  | 'stats'
  | 'painPoints'
  | 'journey'
  | 'services'
  | 'dossiers'
  | 'guides'
  | 'consult'
  | 'brands'
  | 'testimonials'
  | 'cta'

export interface HomeSectionDef {
  key: HomeSectionKey
  fields: readonly HomeField[]
  lists: readonly HomeList[]
  /**
   * Giới hạn CHUNG cho tổng số id của mọi danh sách id trong khối (mẫu 2D và 3D cộng lại). Backend chỉ giới hạn từng
   * danh sách, nên giới hạn chung này do màn admin giữ.
   */
  idsTotalMax?: number
}

/** Giới hạn độ dài mỗi trường chữ. */
export const HOME_TEXT_MAX_LENGTH = 1000

/** Tên icon lucide: chữ, số, gạch ngang, tối đa 64 ký tự (cùng quy tắc `lucideIconKey` phía trang chủ). */
export const ICON_NAME_PATTERN = /^[A-Za-z0-9-]{1,64}$/

const text = (name: string, path?: readonly string[]): HomeField => ({ name, kind: 'text', defaultPath: path })
const area = (name: string, path?: readonly string[]): HomeField => ({ name, kind: 'textarea', defaultPath: path })
const image = (name: string): HomeField => ({ name, kind: 'image' })
const icon = (name: string): HomeField => ({ name, kind: 'icon' })

const landing = (...rest: string[]) => ['landing', ...rest] as const

/** Mười một khối của trang chủ, theo thứ tự xuất hiện trên trang. */
export const HOME_SECTIONS: readonly HomeSectionDef[] = [
  {
    key: 'hero',
    fields: [
      text('eyebrow', landing('hero', 'eyebrow')),
      text('titleLead', landing('hero', 'titleLead')),
      text('titleAccent', landing('hero', 'titleAccent')),
      area('subtitle', landing('hero', 'subtitle')),
      text('primaryCta', landing('hero', 'primaryCta')),
      text('secondaryCta', landing('hero', 'secondaryCta')),
      text('cardTitle', landing('hero', 'card', 'title')),
      text('cardAreaLabel', landing('hero', 'card', 'rows', 'area', 'label')),
      text('cardAreaValue', landing('hero', 'card', 'rows', 'area', 'value')),
      text('cardTypeLabel', landing('hero', 'card', 'rows', 'type', 'label')),
      text('cardTypeValue', landing('hero', 'card', 'rows', 'type', 'value')),
      text('cardStyleLabel', landing('hero', 'card', 'rows', 'style', 'label')),
      text('cardStyleValue', landing('hero', 'card', 'rows', 'style', 'value')),
      text('cardOptionsLabel', landing('hero', 'card', 'rows', 'options', 'label')),
      text('cardOptionsValue', landing('hero', 'card', 'rows', 'options', 'value')),
      text('cardTotalLabel', landing('hero', 'card', 'totalLabel')),
      text('cardTotalValue', landing('hero', 'card', 'totalValue')),
      text('cardCta', landing('hero', 'card', 'cta'))
    ],
    lists: [{ type: 'repeat', name: 'slides', max: 8, fields: [image('imageUrl')] }]
  },
  {
    key: 'stats',
    fields: [],
    lists: [
      {
        type: 'rows',
        name: 'items',
        rows: ['photo', 'steps', 'options', 'contractors', 'inspections'],
        fields: [
          icon('icon'),
          text('value', landing('stats', '{row}', 'value')),
          text('label', landing('stats', '{row}', 'label'))
        ]
      }
    ]
  },
  {
    key: 'painPoints',
    fields: [
      text('title', landing('painPoints', 'title')),
      area('subtitle', landing('painPoints', 'subtitle')),
      area('note', landing('painPoints', 'note'))
    ],
    lists: [
      {
        type: 'rows',
        name: 'items',
        rows: ['budget', 'design', 'contractor', 'dossier', 'supervision'],
        fields: [
          icon('icon'),
          text('title', landing('painPoints', 'items', '{row}', 'title')),
          area('description', landing('painPoints', 'items', '{row}', 'description'))
        ]
      }
    ]
  },
  {
    key: 'journey',
    fields: [
      text('title', landing('journey', 'title')),
      area('subtitle', landing('journey', 'subtitle')),
      text('cta', landing('journey', 'cta')),
      text('currentStepBadge', landing('journey', 'currentStepBadge')),
      text('labelYouDo', landing('journey', 'detailLabels', 'youDo')),
      // Khóa i18n cũ còn mang tên thương hiệu cũ (`savicoDoes`); trường lưu đã đổi sang `buildxDoes`.
      text('labelBuildxDoes', landing('journey', 'detailLabels', 'savicoDoes')),
      text('labelYouGet', landing('journey', 'detailLabels', 'youGet'))
    ],
    lists: [
      {
        type: 'rows',
        name: 'items',
        rows: ['project', 'design', 'dossier', 'contractor', 'build'],
        fields: [
          text('title', landing('journey', 'items', '{row}', 'title')),
          area('description', landing('journey', 'items', '{row}', 'description')),
          area('youDo', landing('journey', 'items', '{row}', 'youDo')),
          area('buildxDoes', landing('journey', 'items', '{row}', 'savicoDoes')),
          area('youGet', landing('journey', 'items', '{row}', 'youGet')),
          image('iconUrl')
        ]
      }
    ]
  },
  {
    key: 'services',
    fields: [
      text('title', landing('services', 'title')),
      area('subtitle', landing('services', 'subtitle')),
      text('viewAll', landing('services', 'viewAll'))
    ],
    lists: [
      {
        type: 'rows',
        name: 'items',
        rows: ['design', 'contractors', 'supervision', 'turnkey'],
        fields: [
          icon('icon'),
          text('title', landing('services', 'items', '{row}', 'title')),
          area('description', landing('services', 'items', '{row}', 'description')),
          text('usedAtStep', landing('services', 'items', '{row}', 'usedAtStep')),
          text('action', landing('services', 'items', '{row}', 'action'))
        ]
      }
    ]
  },
  {
    key: 'dossiers',
    fields: [
      text('title', landing('dossiers', 'title')),
      text('tab2d', landing('dossiers', 'tab2d')),
      text('tab3d', landing('dossiers', 'tab3d')),
      text('viewAll', landing('dossiers', 'viewAll')),
      text('viewOne', landing('dossiers', 'viewOne'))
    ],
    lists: [
      { type: 'ids', name: 'templateIds2d', max: 4, source: 'templates' },
      { type: 'ids', name: 'templateIds3d', max: 4, source: 'templates' }
    ],
    // Cả hai tab cộng lại chỉ chọn tối đa 4 mẫu.
    idsTotalMax: 4
  },
  {
    key: 'guides',
    fields: [
      text('title', ['guide', 'highlights', 'title']),
      area('subtitle', ['guide', 'highlights', 'subtitle']),
      text('viewAll', ['guide', 'highlights', 'viewAll'])
    ],
    lists: [{ type: 'ids', name: 'guideIds', max: 3, source: 'guides' }]
  },
  {
    key: 'consult',
    fields: [
      text('title', ['consult', 'home', 'title']),
      area('description', ['consult', 'home', 'subtitle']),
      text('viewAll', ['consult', 'home', 'viewAll'])
    ],
    lists: []
  },
  {
    key: 'brands',
    fields: [text('title', landing('brands', 'title'))],
    lists: [{ type: 'repeat', name: 'logos', max: 30, fields: [image('imageUrl'), text('name')] }]
  },
  {
    key: 'testimonials',
    fields: [text('title', landing('testimonials', 'titleMobile'))],
    lists: [
      {
        type: 'repeat',
        name: 'reviews',
        max: 12,
        fields: [text('name'), text('meta'), area('quote'), image('avatarUrl')]
      }
    ]
  },
  {
    key: 'cta',
    fields: [
      text('title', landing('cta', 'title')),
      area('subtitle', landing('cta', 'subtitle')),
      text('action', landing('cta', 'action'))
    ],
    lists: []
  }
]

type PlainObject = Record<string, unknown>

/** Một dòng của danh sách: giá trị chữ theo tên trường. */
export type HomeRowValues = Record<string, string>

/** Giá trị của cả form một khối: chữ theo tên trường, và danh sách theo tên danh sách. */
export type HomeFormValues = Record<string, string | HomeRowValues[] | string[]>

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Chữ có sẵn tại một khóa của `messages`; khóa thiếu hoặc không phải chuỗi cho chuỗi rỗng. */
export function defaultText(messages: unknown, path: readonly string[] | undefined, row?: string): string {
  if (!path) return ''
  let cursor: unknown = messages
  for (const segment of path) {
    const key = segment === '{row}' && row !== undefined ? row : segment
    cursor = isPlainObject(cursor) ? cursor[key] : undefined
  }
  return typeof cursor === 'string' ? cursor : ''
}

/** Chữ có sẵn của các trường lẻ trong khối. */
export function scalarDefaults(section: HomeSectionDef, messages: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of section.fields) result[field.name] = defaultText(messages, field.defaultPath)
  return result
}

/** Chữ có sẵn của từng dòng trong danh sách cố định. */
export function rowDefaults(list: HomeFixedList, messages: unknown): HomeRowValues[] {
  return list.rows.map((row) => {
    const values: HomeRowValues = {}
    for (const field of list.fields) values[field.name] = defaultText(messages, field.defaultPath, row)
    return values
  })
}

function rowFromSaved(fields: readonly HomeField[], saved: unknown, fallback?: HomeRowValues): HomeRowValues {
  const item = isPlainObject(saved) ? saved : {}
  const values: HomeRowValues = {}
  for (const field of fields) values[field.name] = clean(item[field.name]) || (fallback?.[field.name] ?? '')
  return values
}

/**
 * Giá trị ban đầu của form: bản đã lưu nếu có, không thì chữ đang hiển thị để người quản lý sửa ngay trên đó. Danh
 * sách thêm bớt tự do bắt đầu rỗng khi chưa lưu vì trang đang dùng bộ có sẵn trong mã nguồn (ảnh, logo), không phải
 * chữ trong bản dịch.
 */
export function formValuesFor(
  section: HomeSectionDef,
  saved: Record<string, unknown> | null | undefined,
  messages: unknown
): HomeFormValues {
  const values: HomeFormValues = {}
  const defaults = scalarDefaults(section, messages)
  for (const field of section.fields) values[field.name] = clean(saved?.[field.name]) || (defaults[field.name] ?? '')

  for (const list of section.lists) {
    const stored = saved?.[list.name]
    const items = Array.isArray(stored) ? stored : []

    if (list.type === 'rows') {
      const fallback = rowDefaults(list, messages)
      values[list.name] = list.rows.map((_, index) => rowFromSaved(list.fields, items[index], fallback[index]))
    } else if (list.type === 'repeat') {
      values[list.name] = items.slice(0, list.max).map((item) => rowFromSaved(list.fields, item))
    } else {
      values[list.name] = items.map(clean).filter(Boolean).slice(0, list.max)
    }
  }
  return values
}

function rowContent(fields: readonly HomeField[], row: unknown): PlainObject {
  const source = isPlainObject(row) ? row : {}
  const content: PlainObject = {}
  for (const field of fields) {
    const value = clean(source[field.name])
    if (value) content[field.name] = value
  }
  return content
}

/**
 * Nội dung gửi lên backend từ giá trị của form.
 * - Trường lẻ: chỉ ghi khi khác chữ có sẵn (ảnh thì ghi khi có); bỏ trống nghĩa là dùng bản có sẵn.
 * - Danh sách cố định: ghi cả danh sách khi có dòng nào khác bản có sẵn, mỗi dòng đủ các trường có nội dung, để vị
 *   trí của từng thẻ không lệch.
 * - Danh sách thêm bớt: bỏ dòng trống; còn dòng nào thì ghi cả danh sách.
 * - Danh sách id: bỏ id trống và trùng, tối đa `max`.
 * Trả đối tượng rỗng khi không có gì khác bản có sẵn.
 */
export function buildContent(section: HomeSectionDef, values: Record<string, unknown>, messages: unknown): PlainObject {
  const content: PlainObject = {}
  const defaults = scalarDefaults(section, messages)

  for (const field of section.fields) {
    const value = clean(values[field.name])
    if (value && value !== clean(defaults[field.name])) content[field.name] = value
  }

  for (const list of section.lists) {
    const raw = values[list.name]
    const rows = Array.isArray(raw) ? raw : []

    if (list.type === 'rows') {
      const fallback = rowDefaults(list, messages)
      const differs = list.rows.some((_, index) =>
        list.fields.some(
          (field) =>
            clean(isPlainObject(rows[index]) ? rows[index][field.name] : '') !== clean(fallback[index]?.[field.name])
        )
      )
      if (differs) content[list.name] = list.rows.map((_, index) => rowContent(list.fields, rows[index]))
    } else if (list.type === 'repeat') {
      const items = rows
        .slice(0, list.max)
        .map((row) => rowContent(list.fields, row))
        .filter((item) => Object.keys(item).length > 0)
      if (items.length > 0) content[list.name] = items
    } else {
      const ids = [...new Set(rows.map(clean).filter(Boolean))].slice(0, list.max)
      if (ids.length > 0) content[list.name] = ids
    }
  }
  return content
}

/**
 * Giá trị ban đầu của form cả trang: mỗi khối theo mã khối. Dùng cho một form duy nhất chứa cả 11 khối, nên khối nào
 * chưa được mở trên màn (các khối gập lại chưa dựng) vẫn có đủ giá trị để biết nó chưa đổi.
 */
export function formValuesForAll(
  contents: Record<string, Record<string, unknown> | undefined>,
  messages: unknown
): Record<string, HomeFormValues> {
  return Object.fromEntries(
    HOME_SECTIONS.map((section) => [section.key, formValuesFor(section, contents[section.key], messages)])
  )
}

/** Việc cần làm với một khối khi bấm Lưu tất cả. */
export type HomeSavePlan = { action: 'none' } | { action: 'save'; content: PlainObject } | { action: 'delete' }

/**
 * Khối này cần làm gì so với bản đang lưu trên backend:
 * - không có gì khác bản có sẵn: gỡ bản đã lưu nếu có (`delete`), không thì thôi (`none`);
 * - khác bản đang lưu (hoặc chưa lưu mà đã sửa): ghi nội dung mới (`save`);
 * - giống hệt bản đang lưu: không làm gì (`none`).
 * Khối chưa có giá trị trong form (chưa từng dựng) coi như chưa đổi.
 */
export function planSectionSave(
  section: HomeSectionDef,
  values: Record<string, unknown> | undefined,
  messages: unknown,
  saved: { content: Record<string, unknown> } | null | undefined
): HomeSavePlan {
  if (!values) return { action: 'none' }
  const content = buildContent(section, values, messages)
  if (Object.keys(content).length === 0) return saved ? { action: 'delete' } : { action: 'none' }
  if (saved && sameContent(content, saved.content)) return { action: 'none' }
  return { action: 'save', content }
}

/** Số id đang chọn ở mọi danh sách id của khối (bỏ id trống và trùng trong từng danh sách). */
export function idsUsed(section: HomeSectionDef, values: Record<string, unknown> | undefined): number {
  let used = 0
  for (const list of section.lists) {
    if (list.type !== 'ids') continue
    const raw = values?.[list.name]
    const ids = Array.isArray(raw) ? raw.map(clean).filter(Boolean) : []
    used += new Set(ids).size
  }
  return used
}

/** Khối có giới hạn chung về số id mà đang chọn vượt quá. */
export function exceedsIdsTotal(section: HomeSectionDef, values: Record<string, unknown> | undefined): boolean {
  return section.idsTotalMax !== undefined && idsUsed(section, values) > section.idsTotalMax
}

/** Hai nội dung có giống nhau không (so sâu, bỏ qua thứ tự khóa của đối tượng). */
export function sameContent(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameContent(item, b[i]))
    )
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) => sameContent(a[key], b[key]))
  }
  return (a ?? '') === (b ?? '')
}
