/**
 * Đổi MỘT tham số trên thanh địa chỉ mà không gọi máy chủ.
 *
 * Dùng cho thứ chỉ là trạng thái hiển thị của trang đang mở (tab, bộ lọc) nhưng cần chia sẻ được bằng đường dẫn. Next đồng
 * bộ `useSearchParams` theo `history`, nên component đọc tham số đó tự cập nhật.
 *
 * Không dùng `router.replace` cho việc này: trang ISR vẫn bị tải lại cả payload mỗi lần đổi chuỗi truy vấn (hồ sơ nhà thầu
 * là ~385 KB, 308 KB trong đó là bảng chữ giao diện), rồi dựng lại cả cây component vì bảng chữ là object mới — đo trên bản
 * Dev ngày 12/10/2026 thì mỗi lần bấm tab mất 1–3 giây. `value` rỗng thì bỏ tham số.
 */
export function replaceSearchParam(key: string, value: string | null) {
  const params = new URLSearchParams(window.location.search)
  if (value) params.set(key, value)
  else params.delete(key)
  const query = params.toString()
  // Tham số đầu PHẢI là `null`: Next chỉ cập nhật `useSearchParams` khi nó tự gắn trạng thái nội bộ vào lệnh gọi; truyền lại
  // `window.history.state` (đã mang trạng thái đó) thì Next coi là lệnh của chính nó và bỏ qua, URL đổi mà giao diện đứng yên.
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
}
