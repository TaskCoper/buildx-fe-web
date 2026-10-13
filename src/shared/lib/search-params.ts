/**
 * Ghi MỘT tham số lên thanh địa chỉ mà Next KHÔNG hay biết, nên không có lượt tải trang nào và cũng không có việc dựng lại.
 *
 * Dùng cho thứ chỉ là trạng thái hiển thị của trang đang mở (tab, bộ lọc) nhưng cần chia sẻ được bằng đường dẫn. Nơi gọi
 * phải tự giữ trạng thái đó (`useSearchParamState`), vì `useSearchParams` KHÔNG cập nhật theo lệnh này.
 *
 * Vì sao không dùng `router.replace` (hay `replaceState(null, …)` để Next đồng bộ): trang ISR vẫn bị tải lại cả payload mỗi
 * lần đổi chuỗi truy vấn (hồ sơ nhà thầu ~385 KB, 308 KB trong đó là bảng chữ giao diện), dựng lại cả cây component, và
 * Next còn chạy lại prefetch cho mọi `<Link>` đang thấy (chân trang + thanh menu: hơn chục lượt ~100 KB mỗi lần bấm). Đo
 * trên bản Dev ngày 12/10/2026.
 *
 * Tham số đầu là `window.history.state` có chủ đích: Next đánh dấu lệnh mang trạng thái của chính nó là "việc của mình" và
 * bỏ qua, nên URL đổi mà router đứng yên. Nút Back/Forward vẫn đúng vì Next đọc lại `location` lúc đó.
 */
export function replaceSearchParam(key: string, value: string | null) {
  const params = new URLSearchParams(window.location.search)
  if (value) params.set(key, value)
  else params.delete(key)
  const query = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  )
}
