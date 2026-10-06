import { useTranslations } from 'next-intl'

import { siteConfig } from '@/shared/config/site'
import { cn } from '@/shared/lib/utils'

/** Một dòng "nhãn — giá trị" ở chân trang bìa. */
export interface CoverRow {
  label: string
  value: string
}

interface DossierCoverProps {
  className?: string
  /**
   * Dữ liệu thật của dự án. Bỏ trống thì dùng nội dung mẫu tĩnh — đúng cho
   * khung minh họa trang chủ (mục II.2); thẻ xem trước Bước 3 (mục III.4a)
   * phải truyền vào, nếu không bìa sẽ hiện dự án của người khác.
   */
  project?: { title: string; subtitle: string; rows: CoverRow[] }
}

/**
 * Trang bìa bộ hồ sơ — dựng bằng markup thay vì ảnh stock, nên nó thực sự
 * trông giống trang bìa hồ sơ. Dùng ở khung minh họa trang chủ (tab "Hồ sơ",
 * mục II.2) và thẻ xem trước bộ hồ sơ (mục III.4a).
 */
export function DossierCover({ className, project }: DossierCoverProps) {
  const t = useTranslations('design.coverSample')

  const rows: CoverRow[] =
    project?.rows ??
    (['scale', 'package', 'date'] as const).map((row) => ({
      label: t(`rows.${row}.label`),
      value: t(`rows.${row}.value`)
    }))

  return (
    // Container query so the same cover reads correctly both as a small preview
    // thumbnail and as the large hero showcase panel.
    <div
      className={cn('bg-card relative flex flex-col overflow-hidden p-[8%] [container-type:inline-size]', className)}
    >
      {/* Nền bìa: dải màu thương hiệu chạy dọc mép trái + vệt sáng góc trên,
          để trang bìa không còn là một mảng trắng trơn. */}
      <span aria-hidden className='bg-primary absolute inset-y-0 left-0 w-[2.5%]' />
      <span aria-hidden className='from-primary/12 absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b to-transparent' />

      <div className='relative space-y-[3%]'>
        <p className='text-primary text-[clamp(0.5rem,2.2cqw,0.75rem)] font-semibold tracking-[0.2em] uppercase'>
          {siteConfig.name}
        </p>
        <div className='bg-primary h-0.5 w-10' />
      </div>

      {/* Khối tiêu đề chiếm phần thân và tự canh giữa: `justify-between` dồn hết
          khoảng trống vào một khe, để lại mảng trắng giữa bìa. */}
      <div className='relative flex flex-1 flex-col justify-center space-y-[4%] py-[6%]'>
        <p className='text-muted-foreground text-[clamp(0.45rem,2cqw,0.7rem)] tracking-wide uppercase'>{t('kicker')}</p>
        <h3 className='text-[clamp(0.8rem,4.5cqw,1.5rem)] leading-tight font-semibold text-balance'>
          {project?.title ?? t('title')}
        </h3>
        <p className='text-muted-foreground text-[clamp(0.45rem,2cqw,0.7rem)] text-pretty'>
          {project?.subtitle ?? t('project')}
        </p>
      </div>

      <dl className='relative space-y-[2%] border-t pt-[4%]'>
        {rows.map((row) => (
          <div key={row.label} className='flex justify-between gap-2 text-[clamp(0.4rem,1.9cqw,0.65rem)]'>
            <dt className='text-muted-foreground'>{row.label}</dt>
            <dd className='font-medium'>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
