/**
 * Tách giá trị quà tặng thành "con số" và "đơn vị triệu" để hiển thị như Hình
 * S01/S02: số cỡ rất lớn ("100") tách khỏi dòng đơn vị ("TRIỆU ĐỒNG"). Bản mô
 * tả S02 cũng viết theo cách này ("trị giá 100 triệu đồng").
 *
 * Chỉ rút gọn khi giá trị chia hết cho một triệu — quà có giá trị lẻ thì trả
 * `null` để nơi gọi in đầy đủ bằng `formatCurrency`, tránh làm tròn sai số tiền.
 */
export function giftValueInMillions(value: number): number | null {
  if (!Number.isFinite(value) || value < 1_000_000) return null
  return value % 1_000_000 === 0 ? value / 1_000_000 : null
}
