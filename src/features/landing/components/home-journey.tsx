'use client'

import { ArrowRight, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { HOME_JOURNEY_STEPS, type HomeJourneyStep } from '../constants/landing.constants'
import { ResumeProjectLabel } from './resume-project-label'

/**
 * Icon nét của từng bước (bộ icon khách gửi, `public/images/journey`). Vẽ bằng `mask-image` chứ không
 * phải thẻ `img`: PNG chỉ đóng vai hình dạng, màu lấy từ `currentColor` nên vẫn xanh mặc định, cam khi
 * rê chuột và trắng khi thẻ mobile đang mở — đúng như các icon cũ.
 */
const STEP_ICON: Record<HomeJourneyStep, string> = {
  project: '/images/journey/design.png',
  design: '/images/journey/dossier.png',
  dossier: '/images/journey/build.png',
  contractor: '/images/journey/contractor.png',
  build: '/images/journey/project.png'
}

const DETAIL_FIELDS = ['youDo', 'savicoDoes', 'youGet'] as const

interface HomeJourneyProps {
  onCreateProject?: () => void
  /** Dự án dở gần nhất — bước hiện tại tự sáng, các bước trước có dấu ✓. */
  activeProject?: { name: string; href: string; currentStep: HomeJourneyStep } | null
}

/**
 * Dải "Từ ý tưởng đến ngôi nhà hoàn thiện chỉ trong 5 bước".
 *
 * Năm thẻ đánh số nối bằng mũi tên, kết bằng nút tạo dự án. Mũi tên là Ô RIÊNG
 * của lưới (`li` dùng `contents` để nhả hai con ra thẳng lưới) chứ không vẽ đè
 * lên thẻ: có vậy thẻ mới co giãn theo nội dung mà mũi tên vẫn nằm đúng giữa
 * hai thẻ ở mọi bề ngang.
 *
 * ★ Thẻ hiện lần lượt, mũi tên vẽ nét ngay sau; đứng yên ~1,5s thì viền sáng
 * lướt 01→05 một vòng (rê chuột thì dừng); bấm thẻ mở chi tiết tại chỗ; có
 * dự án dở thì bước hiện tại tự sáng + nút CTA đổi thành "Mở tiếp dự án".
 */
export function HomeJourney({ onCreateProject, activeProject }: HomeJourneyProps) {
  const t = useTranslations('landing.journey')
  const [hovered, setHovered] = useState<number | null>(null)
  // Bước xa nhất đã rê qua trong lượt rê chuột hiện tại — chỉ TĂNG dần khi rê
  // sang thẻ sau, không tụt lại khi rê giữa các thẻ (tránh giật nền xám của
  // các thẻ đã qua); chỉ về null khi chuột rời HẲN cả dải 5 thẻ.
  const [hoverReached, setHoverReached] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<HomeJourneyStep | null>(null)
  const [sweepIndex, setSweepIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const sweepTimer = useRef<ReturnType<typeof setInterval>>(undefined)

  const activeIndex = activeProject ? HOME_JOURNEY_STEPS.indexOf(activeProject.currentStep) : -1

  const stopSweep = () => {
    clearTimeout(idleTimer.current)
    clearInterval(sweepTimer.current)
    setSweepIndex(null)
  }

  // Đứng yên ~1,5s (không rê chuột vào thẻ nào) thì viền sáng lướt 01→05 đúng
  // một vòng rồi tự tắt; rê chuột vào bất kỳ đâu trong dải thì dừng ngay.
  useEffect(() => {
    if (hovered !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cancels the running sweep timers, not a plain state sync
      stopSweep()
      return
    }
    idleTimer.current = setTimeout(() => {
      let i = 0
      setSweepIndex(0)
      sweepTimer.current = setInterval(() => {
        i += 1
        if (i >= HOME_JOURNEY_STEPS.length) {
          clearInterval(sweepTimer.current)
          setSweepIndex(null)
          return
        }
        setSweepIndex(i)
      }, 420)
    }, 1500)
    return stopSweep
  }, [hovered])

  return (
    // Dưới `lg`: đệm trên 20px (đồng bộ mọi cụm trang chủ), dòng nhãn ẩn — khối đầu chỉ còn
    // tiêu đề + mô tả; mô tả là MỘT câu liền: dưới `lg` ký tự xuống dòng trong câu chữ chỉ còn là khoảng trắng, chữ chạy hết bề ngang rồi mới xuống dòng (`text-pretty` tránh chừa một chữ lẻ ở dòng cuối).
    <section id='home-journey' className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
      <header className='flex flex-wrap items-end justify-between gap-x-10 gap-y-3'>
        <div className='space-y-2'>
          {/* Góp ý BuildX: bỏ dòng nhãn, chỉ còn tiêu đề + một câu mô tả. */}
          <h2 className='text-2xl font-bold tracking-tight text-balance lg:text-[1.75rem]'>{t('title')}</h2>
          <p className='text-foreground max-w-5xl text-sm text-pretty'>{t('subtitle')}</p>
        </div>
      </header>

      <ol
        onMouseLeave={() => setHoverReached(null)}
        className='mt-4 grid gap-4 lg:mt-8 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr)_auto)_minmax(0,1fr)] lg:gap-3'
      >
        {HOME_JOURNEY_STEPS.map((step, index) => {
          const iconSrc = STEP_ICON[step]
          const isCurrent = index === activeIndex
          const isHovered = hovered === index
          const isSweptPassed = sweepIndex !== null && index < sweepIndex
          const isPastResume = activeIndex >= 0 && index < activeIndex
          const isHoverPassed = hoverReached !== null && index < hoverReached
          const isPastCard = isPastResume || isHoverPassed || isSweptPassed
          const isOpen = expanded === step
          const isSwept = sweepIndex === index
          const shouldBounce = isHovered || isCurrent || isSwept || revealed.has(index)

          return (
            <li key={step} className='contents'>
              <motion.div
                id={`home-journey-step-${step}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: index * 0.12, ease: revealEase }}
                onAnimationComplete={() => setRevealed((prev) => (prev.has(index) ? prev : new Set(prev).add(index)))}
                onMouseEnter={() => {
                  setHovered(index)
                  setHoverReached((prev) => (prev === null ? index : Math.max(prev, index)))
                }}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setExpanded((current) => (current === step ? null : step))}
                className={cn(
                  'relative flex h-full cursor-pointer flex-col rounded-2xl border p-4 pt-5 text-left transition-[background-color,border-color,color,box-shadow] duration-500 ease-in-out sm:items-center sm:gap-2 sm:p-5 sm:pt-7 sm:text-center',
                  isPastCard ? 'bg-muted/40' : 'bg-card',
                  isSwept && 'border-primary shadow-[0_0_0_4px_var(--color-accent),0_0_18px_var(--color-accent)]',
                  isOpen && 'border-brand-orange ring-brand-orange/30 ring-2'
                )}
              >
                {/* Con số nằm ĐÈ LÊN viền trên, căn giữa thẻ (ảnh mockup). Rê
                    tới thẻ nào thì huy hiệu số thẻ đó nhún nhẹ + đổi màu đậm;
                    bước đã qua (dự án thật, đã rê tới bước sau — chỉ TĂNG
                    dần, không giật lại khi rê qua lại giữa các thẻ — hoặc đã
                    bị viền sáng lướt qua) ngả xám cả thẻ, số vẫn giữ nguyên,
                    không đổi thành dấu ✓. Huy hiệu cũng nhún khi thẻ vừa hiện
                    ra (reveal) và mỗi lần viền sáng lướt tới nó. */}
                <motion.span
                  animate={shouldBounce ? { y: [0, -5, 0] } : {}}
                  transition={{ duration: 0.4, ease: revealEase }}
                  className={cn(
                    'absolute -top-3 left-4 rounded-lg px-2.5 py-1 text-sm font-bold transition-colors duration-500 ease-in-out sm:left-1/2 sm:-translate-x-1/2',
                    isHovered
                      ? 'bg-brand-orange text-brand-orange-foreground'
                      : isPastCard
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary-soft text-primary',
                    // Mobile: thẻ đang mở thì ô nền bọc số đậm lên xanh đậm (thẻ vẫn giữ màu cũ).
                    isOpen && 'max-sm:bg-brand-orange max-sm:text-brand-orange-foreground'
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </motion.span>
                {/* Dưới `sm` (mobile): mỗi bước là MỘT HÀNG — icon trong ô vuông bên trái, chữ ở
                    giữa, mũi tên mở/đóng bên phải; bấm thì chi tiết mở NGAY TRONG thẻ (theo
                    ảnh khách đề xuất) để khỏi phải cuộn xuống cuối danh sách. Từ `sm` hai
                    khung bọc `contents` biến mất, thẻ dọc như cũ và chi tiết vẫn ở khung
                    chung dưới hàng thẻ. */}
                <div className='flex items-center gap-3 sm:contents'>
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-500 ease-in-out sm:size-auto sm:rounded-none sm:bg-transparent',
                      isOpen ? 'bg-brand-orange text-brand-orange-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'block size-6 bg-current transition-colors duration-500 ease-in-out sm:size-8',
                        isOpen
                          ? 'text-brand-orange max-sm:text-brand-orange-foreground'
                          : isHovered
                            ? 'text-brand-orange'
                            : 'sm:text-primary'
                      )}
                      style={{
                        maskImage: `url(${iconSrc})`,
                        WebkitMaskImage: `url(${iconSrc})`,
                        maskSize: 'contain',
                        WebkitMaskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskPosition: 'center'
                      }}
                    />
                  </span>
                  <div className='min-w-0 flex-1 space-y-0.5 sm:contents sm:space-y-0'>
                    <h3
                      className={cn(
                        'text-sm leading-snug font-bold text-balance transition-colors duration-500 ease-in-out',
                        (isHovered || isOpen) && 'text-brand-orange'
                      )}
                    >
                      {t(`items.${step}.title`)}
                    </h3>
                    <p className='text-muted-foreground text-xs leading-relaxed text-pretty'>
                      {t(`items.${step}.description`)}
                    </p>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'text-muted-foreground size-5 shrink-0 transition-transform duration-500 ease-in-out sm:hidden',
                      isOpen && 'rotate-180'
                    )}
                  />
                </div>

                {isCurrent ? (
                  <span className='bg-primary/10 text-primary-strong mt-2 self-start rounded-full px-2.5 py-1 max-md:text-xs text-[11px] font-semibold sm:mt-0 sm:self-auto'>
                    {t('currentStepBadge')}
                  </span>
                ) : null}

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.dl
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                      onClick={(event) => event.stopPropagation()}
                      // `pl-[3.25rem]` = ô icon 40px + khoảng hở 12px: chữ thụt vào ĐÚNG cột tiêu đề "Tạo dự án".
                      className='cursor-auto space-y-3 overflow-hidden pl-[3.25rem] text-left sm:hidden'
                    >
                      {DETAIL_FIELDS.map((field) => (
                        <div key={field} className='first:mt-2'>
                          <dt className='text-brand-orange text-xs font-semibold tracking-wide uppercase'>
                            {t(`detailLabels.${field}`)}
                          </dt>
                          <dd className='text-foreground mt-1 text-sm leading-relaxed text-pretty'>
                            {t(`items.${step}.${field}`)}
                          </dd>
                        </div>
                      ))}
                    </motion.dl>
                  ) : null}
                </AnimatePresence>
              </motion.div>

              {index < HOME_JOURNEY_STEPS.length - 1 ? (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, scaleX: 0 }}
                  whileInView={{ opacity: 1, scaleX: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.3, delay: index * 0.12 + 0.25, ease: revealEase }}
                  className='hidden origin-left items-center justify-center self-center lg:flex'
                >
                  <ArrowRight className='text-primary/50 size-5' />
                </motion.div>
              ) : null}
            </li>
          )
        })}
      </ol>

      {/* Từ `sm`: bấm 1 thẻ thì khung chi tiết NÀY (chung, nằm dưới hàng thẻ) trượt mở
          ra 3 cột "bạn làm gì / BuildX làm gì / bạn nhận được" cho bước đó —
          giống ảnh mockup; bấm lại chính thẻ đang mở thì khung đóng lại. */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.dl
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: revealEase }}
            className='bg-brand-orange-soft border-brand-orange/40 mt-4 grid grid-cols-1 gap-x-6 gap-y-3 overflow-hidden rounded-2xl border p-5 text-left max-sm:hidden sm:grid-cols-3'
          >
            {DETAIL_FIELDS.map((field, fieldIndex) => (
              <motion.div
                // `key` gồm cả bước: đổi sang thẻ khác thì nội dung fade in lại từ đầu.
                key={`${expanded}-${field}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 + fieldIndex * 0.12, ease: 'easeOut' }}
              >
                <dt className='text-brand-orange text-xs font-semibold tracking-wide uppercase'>
                  {t(`detailLabels.${field}`)}
                </dt>
                <dd className='text-foreground mt-1 text-sm leading-relaxed text-pretty'>
                  {t(`items.${expanded}.${field}`)}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.4, delay: 0.85, ease: revealEase }}
        // Dưới `sm`: nút ở TRÊN, dòng gợi ý "Chỉ cần 1 tấm ảnh lô đất" ở DƯỚI (xếp dọc). Trước đây `flex-wrap`
        // chỉ xuống dòng khi nhãn nút dài ("Tiếp tục dự án <tên>"); nhãn ngắn "Tạo dự án mới" thì hai phần lọt
        // chung một hàng.
        className='mt-4 flex flex-col items-center gap-y-3 lg:mt-8 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6'
      >
        {activeProject ? (
          <Button asChild className='brand-green-button h-11 rounded-full px-8 text-base has-[>svg]:px-8'>
            <Link href={activeProject.href} title={`${t('resumeCta')} ${activeProject.name}`}>
              <ResumeProjectLabel label={t('resumeCta')} name={activeProject.name} />
              <ArrowRight className='size-4' />
            </Link>
          </Button>
        ) : (
          <Button
            className='brand-green-button h-11 rounded-full px-8 text-base has-[>svg]:px-8'
            onClick={onCreateProject}
          >
            {t('cta')}
            <ArrowRight className='size-4' />
          </Button>
        )}
      </motion.div>
    </section>
  )
}
