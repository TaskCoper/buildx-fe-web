/**
 * Kiểu đánh số của danh sách có thứ tự trong ô rich text. Trong ô soạn mỗi kiểu là một giá trị của `type` (`1` số,
 * `a` chữ thường, `A` chữ hoa, `i` La Mã thường, `I` La Mã hoa). Khi lưu, HTML ghi `style="list-style-type: …"` trên
 * `<ol>` (backend giữ đúng năm giá trị này, TDD-NEWS-001); không ghi thuộc tính `type` vì CSS so khớp giá trị `type`
 * không phân biệt hoa thường nên không tách được `a` khỏi `A`.
 *
 * Phần thuần (không import React/TipTap) để kiểm bằng `node --test`, xem `scripts/list-type.test.mjs`.
 */

export const ORDERED_LIST_TYPES = ['1', 'a', 'A', 'i', 'I'] as const

export type OrderedListType = (typeof ORDERED_LIST_TYPES)[number]

/** Giá trị `type` hợp lệ của `<ol>`; so khớp phân biệt hoa thường vì `a` và `A` là hai kiểu khác nhau. */
export function isOrderedListType(value: string | null | undefined): value is OrderedListType {
  return typeof value === 'string' && (ORDERED_LIST_TYPES as readonly string[]).includes(value)
}

/** Giá trị `list-style-type` ghi ra HTML cho từng kiểu đánh số. */
export const LIST_STYLE_CSS: Record<OrderedListType, string> = {
  '1': 'decimal',
  a: 'lower-alpha',
  A: 'upper-alpha',
  i: 'lower-roman',
  I: 'upper-roman'
}

/** Câu khai báo CSS ghi vào `style` của `<ol>`, đúng dạng backend dựng lại. */
export function listStyleDeclaration(type: OrderedListType): string {
  return `list-style-type: ${LIST_STYLE_CSS[type]};`
}

const CSS_TO_TYPE: Record<string, OrderedListType> = {
  decimal: '1',
  'lower-alpha': 'a',
  'lower-latin': 'a',
  'upper-alpha': 'A',
  'upper-latin': 'A',
  'lower-roman': 'i',
  'upper-roman': 'I'
}

/**
 * Kiểu đánh số từ thuộc tính `style` (Google Docs ghi `list-style-type:lower-alpha` trên từng `<li>`); `null` khi không
 * có hoặc là kiểu không phải số / chữ (chấm, tròn, vuông, số 0 đầu...).
 */
export function listTypeFromStyle(style: string | null | undefined): OrderedListType | null {
  const match = /(?:^|;)\s*list-style(?:-type)?\s*:\s*([a-z-]+)/i.exec(style ?? '')
  return (match?.[1] ? CSS_TO_TYPE[match[1].toLowerCase()] : undefined) ?? null
}
