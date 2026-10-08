import * as lucide from 'lucide-react'

import { lucideComponentName, lucideIconKey, type HomeIconNodes, type LucideIconNode } from './home-sections'

/**
 * Đổi tên icon lucide admin nhập thành dữ liệu vẽ icon, chạy ở SERVER.
 *
 * Làm ở server vì bảng 1500+ icon quá nặng để đưa xuống trình duyệt, còn tải từng icon theo yêu cầu thì buộc bundler
 * tạo hàng nghìn tệp riêng (làm hỏng cả dev server trên Windows). Ở đây chỉ những icon thật sự được dùng mới được
 * gửi xuống client, dưới dạng chuỗi thuộc tính SVG.
 *
 * Phiên bản lucide-react hiện tại không công bố dữ liệu vẽ của từng icon; nó nằm trong phần tử mà hàm `render`
 * của component trả về (`props.iconNode`). Đây là chi tiết bên trong thư viện nên mọi sai khác đều được bắt: tên không
 * tồn tại hoặc thư viện đổi cấu trúc thì icon đó không có dữ liệu, giao diện dùng icon mặc định của vị trí.
 */

interface RenderableIcon {
  render?: (props: object, ref: null) => { props?: { iconNode?: unknown } } | null
}

function isIconNode(value: unknown): value is LucideIconNode {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'object' &&
        entry[1] !== null &&
        Object.values(entry[1] as Record<string, unknown>).every((attribute) => typeof attribute === 'string')
    )
  )
}

/**
 * Bảng `icons` của lucide chỉ có tên chuẩn (`House`); những tên quen thuộc nhưng là biệt danh như `Home`, `Edit`,
 * `CheckCircle`, `HomeIcon` chỉ có ở dạng export có tên. Tra bảng trước, không có thì tra export có tên để admin gõ tên nào
 * đang dùng trong lucide cũng ra icon.
 */
function componentOf(key: string): RenderableIcon | undefined {
  const name = lucideComponentName(key)
  const table = lucide.icons as unknown as Record<string, RenderableIcon | undefined>
  const named = lucide as unknown as Record<string, RenderableIcon | undefined>
  return table[name] ?? named[name]
}

function nodeOf(key: string): LucideIconNode | undefined {
  const component = componentOf(key)
  try {
    const node = component?.render?.({}, null)?.props?.iconNode
    return isIconNode(node) ? node : undefined
  } catch {
    return undefined
  }
}

/** Dữ liệu vẽ của các icon theo tên (nhận cả `PencilRuler` và `pencil-ruler`); bỏ qua tên không tồn tại. */
export function resolveIconNodes(names: readonly string[]): HomeIconNodes {
  const result: Record<string, LucideIconNode> = {}

  for (const name of names) {
    const key = lucideIconKey(name)
    if (!key || key in result) continue
    const node = nodeOf(key)
    if (node) result[key] = node
  }
  return result
}
