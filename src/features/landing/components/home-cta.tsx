'use client'

import { ArrowRight, House } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { ResumeProjectLabel } from './resume-project-label'

export interface HomeCtaResumeProject {
  id: string
  name: string
  href: string
  /** Chỉ 3 trạng thái dở — dự án hoàn tất thì không còn là "dự án dở" nữa. */
  status: 'input' | 'designing' | 'review'
}

interface HomeCtaProps {
  onCreateProject?: () => void
  resumeProject?: HomeCtaResumeProject | null
  /** Đã bấm "Tạo dự án" ở một section khác của trang thì không lặp vệt sáng nữa. */
  skipShine?: boolean
}

/**
 * Dải chuyển đổi cuối trang chủ — "Sẵn sàng bắt đầu dự án của bạn?".
 *
 * Nền xanh RẤT nhạt chứ không phải dải xanh đặc như hai khối trên: đây là lời
 * mời cuối cùng, đứng ngay trên chân trang tối màu, nên phải nhẹ hơn để không
 * đấu màu với footer.
 *
 * ★ Khung hiện dần, icon ngôi nhà nhún 1 lần, nút hiện sau cùng kèm vệt sáng
 * lướt qua đúng 1 lần — trừ khi đã bấm "Tạo dự án" ở chỗ khác của trang rồi.
 * Có dự án dở → đổi hẳn nội dung + nút sang "Mở tiếp dự án".
 */
export function HomeCta({ onCreateProject, resumeProject, skipShine }: HomeCtaProps) {
  const t = useTranslations('landing.cta')

  return (
    <section id='home-cta' className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
        // Dưới `sm` (theo ảnh tham chiếu): MỘT HÀNG — icon nhỏ, chữ ở giữa, nút gọn bên phải; trước đây
        // `flex-wrap` + icon 48px + nút `px-8` ép cột chữ còn vài chục px. Từ `sm` giữ bố cục cũ.
        className='bg-primary/8 border-primary/15 flex flex-nowrap items-center gap-3 rounded-2xl border px-4 py-4 sm:flex-wrap sm:gap-x-6 sm:gap-y-4 sm:px-6 sm:py-5'
      >
        <motion.span
          initial={{ scale: 1 }}
          whileInView={{ scale: [1, 1.15, 1] }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className='bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl max-sm:size-9 max-sm:rounded-lg'
        >
          <House className='size-6 max-sm:size-5' strokeWidth={1.75} />
        </motion.span>

        <div className='min-w-0 flex-1'>
          <p className='text-sm font-bold text-pretty sm:text-base'>
            {resumeProject ? t('resumeTitle', { name: resumeProject.name }) : t('title')}
          </p>
          <p className='text-muted-foreground mt-0.5 text-xs text-pretty sm:mt-0 sm:text-sm'>
            {resumeProject ? t(`byStatus.${resumeProject.status}`) : t('subtitle')}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className='relative shrink-0 overflow-hidden rounded-full'
        >
          {resumeProject ? (
            <Button
              asChild
              className='brand-green-button h-11 rounded-full px-8 text-base has-[>svg]:px-8 max-sm:h-9 max-sm:px-3 max-sm:text-xs max-sm:has-[>svg]:px-3'
            >
              <Link href={resumeProject.href} title={`${t('resumeAction')} ${resumeProject.name}`}>
                <ResumeProjectLabel label={t('resumeAction')} name={resumeProject.name} />
                <ArrowRight className='size-4' />
              </Link>
            </Button>
          ) : (
            <Button
              className='brand-green-button h-11 rounded-full px-8 text-base has-[>svg]:px-8 max-sm:h-9 max-sm:px-3 max-sm:text-xs max-sm:has-[>svg]:px-3'
              onClick={onCreateProject}
            >
              {t('action')}
              <ArrowRight className='size-4' />
            </Button>
          )}

          {/* Vệt sáng rộng 1/4 nút: phải đi 4 lần bề rộng của chính nó (400%) mới ra khỏi nút — 230% cũ
              dừng ngay GIỮA nút nên để lại một vạch trắng mờ đứng yên sau khi quét xong. */}
          {skipShine ? null : (
            <motion.span
              aria-hidden
              initial={{ x: '-130%' }}
              whileInView={{ x: '480%' }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.85, delay: 0.55, ease: 'easeInOut' }}
              className='pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-white/30'
            />
          )}
        </motion.div>
      </motion.div>
    </section>
  )
}
