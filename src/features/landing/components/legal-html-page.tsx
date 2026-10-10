/**
 * Trang pháp lý do admin soạn bằng rich text (màn "Chân trang & Về BuildX"). Cùng "tờ giấy" trắng với `LegalPage`;
 * kiểu chữ nằm ở `.legal-html` trong `globals.css`.
 *
 * `html` đã được backend làm sạch khi lưu (chỉ còn thẻ văn bản, bảng và liên kết, không có ảnh hay script) nên được
 * đưa thẳng vào trang như bài viết Cẩm nang.
 */
export function LegalHtmlPage({ html }: { html: string }) {
  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-5 lg:px-8'>
      <article className='rounded-2xl border bg-white px-6 py-10 shadow-sm sm:px-12'>
        <div className='legal-html' dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  )
}
