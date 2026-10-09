/**
 * Đọc hình dạng các khối của một trang (trang chủ, chân trang) từ `PageSectionCatalog.cs` của backend — nguồn sự thật
 * về trường, kiểu và số mục của từng khối. Dùng cho các test hợp đồng (`home-contract.test.mjs`,
 * `footer-contract.test.mjs`) và cho server giả khi chạy thử toàn luồng.
 *
 * Chỉ đọc đúng cú pháp catalog đang dùng (`new(PageKeys.Home, HomeSectionKeys.X, OptionalText: [...], Fields: [Items(...)])`);
 * catalog đổi cú pháp thì test hợp đồng sẽ hỏng trước, không âm thầm đọc sai.
 */

/** Đường dẫn catalog trong workspace (`bmt-be` nằm cạnh thư mục `buildx`). */
export const CATALOG_URL = new URL(
  '../../../bmt-be/src/bmt-be.contract/services/handbook/PageSectionCatalog.cs',
  import.meta.url
)

/** Phần nằm giữa cặp ngoặc bắt đầu tại `open` (chỉ số ký tự mở), tính cả ngoặc lồng nhau và chuỗi trong nháy kép. */
export function balanced(text, open) {
  const pairs = { '(': ')', '[': ']', '{': '}' }
  const stack = []
  for (let i = open; i < text.length; i++) {
    const char = text[i]
    if (char === '"') i = text.indexOf('"', i + 1)
    else if (pairs[char]) stack.push(pairs[char])
    else if (char === stack[stack.length - 1]) {
      stack.pop()
      if (stack.length === 0) return text.slice(open + 1, i)
    }
  }
  throw new Error('Ngoặc không cân')
}

const quoted = (text) => [...text.matchAll(/"([^"]+)"/g)].map((match) => match[1])

/** Danh sách chuỗi của tham số có tên, ví dụ `OptionalText: ["a", "b"]`. */
function namedList(args, name) {
  const at = args.search(new RegExp(`${name}:\\s*\\[`))
  return at < 0 ? [] : quoted(balanced(args, args.indexOf('[', at)))
}

function parseStructuredField(call) {
  const kind = call.match(/^(Items|Ids|Html)\(/)[1]
  const args = balanced(call, call.indexOf('('))
  if (kind === 'Html') return { kind, name: args.match(/^\s*"([^"]+)"/)[1] }
  if (kind === 'Ids') {
    const [, name, max] = args.match(/^\s*"([^"]+)"\s*,\s*(\d+)/)
    return { kind, name, max: Number(max) }
  }
  const [, name, min, max] = args.match(/^\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)/)
  const itemFields = [...args.matchAll(/\b(Text|Image|Icon)\("([^"]+)"\)/g)].map((match) => ({
    kind: match[1],
    name: match[2]
  }))
  return { kind, name, min: Number(min), max: Number(max), itemFields }
}

/**
 * Các hằng chuỗi của một lớp tĩnh, theo tên hằng (`Contact` → `"contact"`). Đọc theo từng lớp vì tên hằng của các trang
 * khác nhau có thể trùng nhau.
 */
function constantsOf(text, className) {
  const at = text.search(new RegExp(`static class ${className}\\b`))
  if (at < 0) throw new Error(`Không thấy lớp ${className} trong catalog`)
  const body = balanced(text, text.indexOf('{', at))
  return Object.fromEntries([...body.matchAll(/public const string (\w+) = "(\w+)";/g)].map((m) => [m[1], m[2]]))
}

/**
 * Các khối của một trang theo mã khối: `{ required, optional, images, structured }`, với `structured` là danh sách
 * trường có cấu trúc (`Items` có min/max và trường của mục, `Ids` có max, `Html` chỉ có tên).
 */
export function parsePageCatalog(text, pageConstant, sectionKeysClass) {
  const constants = constantsOf(text, sectionKeysClass)
  const sections = new Map()
  const start = new RegExp(`new\\(PageKeys\\.${pageConstant},\\s*${sectionKeysClass}\\.(\\w+),`, 'g')
  for (const match of text.matchAll(start)) {
    const args = balanced(text, match.index + 3)
    const fieldsAt = args.search(/Fields:\s*\[/)
    const structured = []
    if (fieldsAt >= 0) {
      const body = balanced(args, args.indexOf('[', fieldsAt))
      for (const call of body.matchAll(/\b(Items|Ids|Html)\(/g))
        structured.push(parseStructuredField(body.slice(call.index)))
    }
    sections.set(constants[match[1]], {
      required: namedList(args, 'RequiredText'),
      optional: namedList(args, 'OptionalText'),
      images: namedList(args, 'ImageUrls'),
      structured
    })
  }
  return sections
}

/** Các khối của trang chủ (xem {@link parsePageCatalog}). */
export const parseHomeCatalog = (text) => parsePageCatalog(text, 'Home', 'HomeSectionKeys')

/** Các khối của chân trang (xem {@link parsePageCatalog}). */
export const parseFooterCatalog = (text) => parsePageCatalog(text, 'Footer', 'FooterSectionKeys')
