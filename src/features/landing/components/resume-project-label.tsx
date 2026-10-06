/**
 * Nhãn nút "Tiếp tục dự án <tên>" dùng chung cho hero, dải 5 bước và CTA cuối
 * trang (góp ý BuildX): cả ba cùng trỏ MỘT dự án dở, hiện TÊN chứ không hiện mã.
 * Tên dài thì cắt "…" — nơi gọi đặt `title` trên liên kết để rê chuột xem đủ.
 */
export function ResumeProjectLabel({ label, name }: { label: string; name: string }) {
  return (
    <span className='flex min-w-0 items-center gap-1'>
      <span className='shrink-0'>{label}</span>
      <span className='max-w-24 truncate sm:max-w-28 xl:max-w-32'>{name}</span>
    </span>
  )
}
