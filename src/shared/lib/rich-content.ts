/**
 * Kiểu chữ của nội dung rich text — MỘT nguồn cho cả nơi khách đọc và ô soạn của admin, để admin thấy lúc soạn
 * đúng như khách sẽ thấy (cùng tiêu đề, danh sách, trích dẫn, liên kết, ảnh, bảng). Sửa kiểu ở đây là sửa cả hai nơi;
 * đừng định kiểu riêng cho ô soạn.
 *
 * Hai họ nội dung, khớp hai nơi hiển thị công khai:
 *   · `ARTICLE_BODY_CLASS` — bài Cẩm nang (`features/handbook`, `article-detail`) và ô soạn bài viết;
 *   · `LEGAL_BODY_CLASS`   — trang pháp lý do admin soạn (`LegalHtmlPage`), kiểu nằm ở `.legal-html` trong `globals.css`.
 *
 * Các biến thể `[&_x]` nằm trong chuỗi (không tách ra CSS riêng) vì Tailwind chỉ sinh lớp cho chuỗi nó đọc được trong
 * mã nguồn. Danh sách lồng nhau đổi ký hiệu theo cấp như Google Docs: 1. → a. → i. và chấm → tròn rỗng → vuông.
 */
export const ARTICLE_BODY_CLASS =
  'article-richtext space-y-4 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-primary/40 [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h2]:text-primary [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman] [&_ul_ul]:list-[circle] [&_ul_ul_ul]:list-[square]'

export const LEGAL_BODY_CLASS = 'legal-html'
