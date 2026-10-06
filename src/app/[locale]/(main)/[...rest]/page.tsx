import { notFound } from 'next/navigation'

/**
 * Catch-all cho đường dẫn không khớp màn nào. Chuyển tiếp sang `not-found.tsx`
 * của locale để trang 404 vẫn nằm trong đúng ngôn ngữ và khung layout.
 *
 * PHẢI nằm TRONG route group `(main)`, không phải cạnh nó.
 *
 * Khi file này đứng ở `app/[locale]/[...rest]`, tức là ngang hàng với group
 * `(main)` chứ không nằm trong, Next 16 chọn nó cho MỌI đường dẫn có từ một
 * đoạn trở lên: `/vi/handbook`, `/vi/plans`, `/vi/contractors`… đều ra 404 dù
 * trang tồn tại và `next build` vẫn liệt kê đủ route. Trang chủ thoát nạn chỉ vì
 * catch-all cần ít nhất một đoạn.
 *
 * Đặt vào trong group thì catch-all thành anh em cùng cấp với `handbook`,
 * `plans`, `contractors`… và quy tắc "đoạn tĩnh thắng đoạn động" hoạt động đúng.
 */
export default function CatchAllPage() {
  notFound()
}
