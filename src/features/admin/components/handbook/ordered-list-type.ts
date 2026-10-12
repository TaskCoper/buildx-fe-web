import { mergeAttributes, type Attributes, type Editor } from '@tiptap/react'
import { OrderedList } from '@tiptap/extension-list'

import { isOrderedListType, listStyleDeclaration, listTypeFromStyle, type OrderedListType } from './list-type'

/** Kiểu đánh số của một `<ol>` đang đọc: `type` (HTML cũ, dán từ nơi khác), rồi `list-style-type` của chính nó, rồi của mục đầu. */
function orderedListTypeOf(element: HTMLElement): OrderedListType | null {
  const attribute = element.getAttribute('type')
  if (isOrderedListType(attribute)) return attribute
  return (
    listTypeFromStyle(element.getAttribute('style')) ??
    listTypeFromStyle(element.querySelector('li')?.getAttribute('style'))
  )
}

/**
 * `OrderedList` của TipTap đọc kiểu đánh số vào thuộc tính `type` nhưng chỉ ghi lại thành `<ol type>` và bỏ `type="1"` vì coi
 * là mặc định. Ở đây trang hiển thị tự đổi ký hiệu theo cấp (1. → a. → i.) và CSS không tách được `type="a"` khỏi
 * `type="A"`, nên kiểu được ghi thành `style="list-style-type: …"` (kể cả `decimal` cho danh sách lồng nhau chọn "1. 2. 3.").
 * Đọc lại: bản gốc không hiểu `decimal`, nên đọc bằng `orderedListTypeOf`. Phần còn lại giữ nguyên bản gốc.
 */
export const OrderedListWithType = OrderedList.extend({
  addAttributes() {
    const attributes: Attributes = this.parent?.() ?? {}
    return { ...attributes, type: { ...attributes.type, parseHTML: orderedListTypeOf } }
  },
  renderHTML({ HTMLAttributes }) {
    const { start, type, ...rest } = HTMLAttributes as { start?: number; type?: string | null }
    const attrs = mergeAttributes(this.options.HTMLAttributes, rest)
    if (start !== undefined && start !== 1) attrs.start = start
    if (isOrderedListType(type)) attrs.style = listStyleDeclaration(type)
    return ['ol', attrs, 0]
  }
})

/** Kiểu đánh số của danh sách có thứ tự TRONG CÙNG quanh con trỏ (lồng nhau thì lấy cấp sâu nhất); `null` khi không ở trong danh sách số. */
export function activeOrderedListType(editor: Editor): OrderedListType | null {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'orderedList') {
      const type = node.attrs.type as string | null | undefined
      return isOrderedListType(type) ? type : '1'
    }
  }
  return null
}

/**
 * Đổi kiểu đánh số của danh sách số quanh con trỏ; đang không ở trong danh sách số thì biến đoạn / danh sách chấm hiện
 * tại thành danh sách số rồi áp kiểu. Chỉ đổi danh sách SÂU NHẤT chứa con trỏ (`updateAttributes` của TipTap đổi cả
 * danh sách cha nên không dùng).
 */
export function setOrderedListType(editor: Editor, type: OrderedListType) {
  const chain = editor.chain().focus()
  if (!editor.isActive('orderedList')) chain.toggleOrderedList()
  chain
    .command(({ tr }) => {
      const { $from } = tr.selection
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth)
        if (node.type.name === 'orderedList') {
          tr.setNodeMarkup($from.before(depth), undefined, { ...node.attrs, type })
          return true
        }
      }
      return false
    })
    .run()
}
