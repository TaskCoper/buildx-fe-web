'use server'

import type { HomeIconNodes } from './home-sections'
import { resolveIconNodes } from './icon-nodes.server'

/** Tối đa bấy nhiêu tên mỗi lần, đủ cho màn xem trước của admin mà không thành cửa sau để dò cả thư viện. */
const MAX_NAMES = 40

/**
 * Tra dữ liệu vẽ icon cho ô nhập tên icon của admin (xem trước ngay khi gõ). Chỉ trả hình dạng icon công khai của
 * thư viện lucide, không đụng dữ liệu nào của hệ thống.
 */
export async function previewIconNodes(names: string[]): Promise<HomeIconNodes> {
  return resolveIconNodes(names.slice(0, MAX_NAMES))
}
