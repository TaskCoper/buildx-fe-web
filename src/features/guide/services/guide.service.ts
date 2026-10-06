/** Bỏ dấu tiếng Việt + hạ chữ thường để tìm không phân biệt hoa/thường/dấu (mục 2). */
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

export function matchesQuery(text: string, query: string): boolean {
  if (!query.trim()) return true
  return normalize(text).includes(normalize(query))
}

/**
 * Vị trí đoạn khớp `query` trong `text` (tô nền xanh nhạt) — so khớp trên bản
 * đã chuẩn hoá nhưng trả vị trí để cắt trên bản gốc có dấu, vì mọi phép biến
 * đổi trong `normalize` giữ nguyên số ký tự.
 */
export function findMatchRange(text: string, query: string): { start: number; end: number } | null {
  const q = normalize(query.trim())
  if (!q) return null
  const index = normalize(text).indexOf(q)
  if (index === -1) return null
  return { start: index, end: index + q.length }
}
