'use client'

import Image from 'next/image'
import { ArrowRight, Play, Star } from 'lucide-react'
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  type Transition
} from 'motion/react'
import { useTranslations } from 'next-intl'
import { type MouseEvent, useEffect, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { useSessionOnce } from '@/shared/hooks'
import { cn } from '@/shared/lib'
import { HERO_CARD_ROWS, HERO_SLIDE_INTERVAL_MS, HERO_SLIDES } from '../constants/landing.constants'
import { ResumeProjectLabel } from './resume-project-label'

interface HomeHeroProps {
  onCreateProject?: () => void
  /** "▷ Xem hướng dẫn 1 phút" — mở hộp video của vùng 09 ngay tại chỗ. */
  onWatchIntro?: () => void
  /** Có dự án dở → nút chính đổi thành "Mở tiếp dự án →" trỏ thẳng route này. */
  /** Dự án dở gần nhất — có thì nút chính thành "Tiếp tục dự án <tên>". */
  resumeProject?: { name: string; href: string }
}

/** Khoá `sessionStorage` — chuỗi mở màn chỉ chạy một lần mỗi phiên (mục II.2). */
const INTRO_SESSION_KEY = 'savico.hero-intro-played'

/** Hệ số tăng tốc chuỗi mở màn hero (sheet góp ý BuildX). */
const INTRO_SPEED = { delay: 0.45, duration: 0.65 } as const

/**
 * Khối hero trang chủ (mục II.2, dựng theo ảnh mockup khách gửi).
 *
 * Dải ảnh TRÀN HẾT bề ngang màn hình, không viền không bo góc — chữ và thẻ "Hồ
 * sơ dự án" nằm đè lên ảnh. Dải 5 con số là thẻ trắng RIÊNG bên dưới
 * (`HomeStats`), không dùng chung khung với ảnh.
 *
 * Lưới BA cột (chữ · thẻ · khoảng trống) chứ không phải hai: cột trống bên phải
 * là chỗ để công trình trong ảnh lộ ra — đẩy thẻ sát mép phải là che mất đúng
 * phần đáng nhìn nhất của tấm ảnh.
 *
 * ★ Mở màn theo thứ tự đọc trong ~1,5 giây, CHỈ chạy lần đầu mỗi phiên
 * (`useSessionOnce`); cuộn hay bấm trong lúc đang chạy thì `skip` bật lên và
 * mọi phần còn lại nhảy thẳng tới trạng thái hoàn chỉnh (transition còn 0s).
 * `#home-hero-end` là mốc để `SiteHeader` biết đã cuộn qua hero hay chưa.
 */
export function HomeHero({ onCreateProject, onWatchIntro, resumeProject }: HomeHeroProps) {
  const t = useTranslations('landing.hero')
  // Chữ hero admin sửa được qua kho `uiStrings` (phủ thẳng lên i18n), nên ở đây
  // chỉ cần `t` — không còn tài liệu `home` song song để lệch nhau nữa.
  const reduceMotion = useReducedMotion()
  // Ảnh nền chạy slide tự động; giảm chuyển động thì đứng yên ở ảnh đầu.
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % HERO_SLIDES.length),
      HERO_SLIDE_INTERVAL_MS
    )
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  const seenBefore = useSessionOnce(INTRO_SESSION_KEY)
  // Cuộn hay bấm giữa chừng cũng nhảy thẳng tới trạng thái hoàn chỉnh — gộp
  // chung với "đã xem trước đó" thành một cờ `skip` DUY NHẤT thay vì đồng bộ
  // hai state riêng bằng effect.
  const [interacted, setInteracted] = useState(false)
  const skip = seenBefore || interacted || Boolean(reduceMotion)
  const skipStar = interacted || Boolean(reduceMotion)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    if (!skip && latest > 0) setInteracted(true)
  })

  useEffect(() => {
    if (skip) return
    const fastForward = () => setInteracted(true)
    window.addEventListener('pointerdown', fastForward, { once: true })
    return () => window.removeEventListener('pointerdown', fastForward)
  }, [skip])

  /** Từng mốc thời gian của chuỗi mở màn — 0s hết khi `skip`. */
  // Góp ý BuildX: mở màn đang chậm, đầu trang trống quá lâu — mọi mốc chạy
  // nhanh gấp đôi (độ trễ × 0,45, thời lượng × 0,65), thứ tự giữ nguyên.
  const seq = (delay: number, duration = 0.7): Transition => ({
    duration: skip ? 0 : duration * INTRO_SPEED.duration,
    delay: skip ? 0 : delay * INTRO_SPEED.delay,
    ease: revealEase
  })

  return (
    <section id='home-hero' className='relative isolate overflow-hidden'>
      <div aria-hidden className='absolute inset-0 -z-10'>
        {/* Dưới `lg`: ảnh phủ kín nền sau khối chữ. Từ `lg`: banner đứng bên phải,
            giữ đúng tỉ lệ 16:9 để thấy trọn khung hình (ảnh mẫu trong sheet góp ý),
            mép trái mờ dần vào nền trang. */}
        <motion.div
          className='hero-photo-drift absolute inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:aspect-[16/9] lg:h-full'
          initial={{ opacity: skip ? 1 : 0, scale: 1.03 }}
          animate={{ opacity: 1 }}
          transition={seq(1.05, 0.9)}
        >
          {/* Các ảnh chồng lên nhau, chỉ ảnh đang chiếu đậm — chuyển ảnh là mờ dần
              chéo nhau, ảnh sau đã tải sẵn nên không nháy trắng. */}
          {HERO_SLIDES.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt=''
              fill
              priority={index === 0}
              sizes='(min-width: 1024px) 60vw, 100vw'
              className={cn(
                'object-cover object-center transition-opacity duration-1000 ease-in-out',
                index === slide ? 'opacity-100' : 'opacity-0'
              )}
            />
          ))}
          {/* Mép trái banner tan vào nền trang (chỉ từ `lg`). */}
          <div className='from-background absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r to-transparent lg:block' />
        </motion.div>
        {/* Dưới `lg` ảnh nằm sau chữ nên phủ ngang cả khung: đặc bên trái cho cột
            chữ, tan dần sang phải. */}
        <div className='from-background via-background/85 absolute inset-0 bg-gradient-to-r to-transparent lg:hidden' />
      </div>

      {/* Dưới `lg` mọi khối xếp dọc: khoảng cách nút "Xem hướng dẫn" → thẻ "Hồ sơ dự án"
          (`gap-y-4.5` = 18px) phải BẰNG khoảng cách thẻ → dải số liệu bên dưới. Dải
          số liệu (`HomeStats`) kéo lên chờm `-mt-9.5` (38px) vào `pb-14` (56px) của khối
          này, nên chỗ hở thật là 56 − 38 = 18px. Đổi `pb-14` hay `-mt-9.5` thì đổi số này theo.
          Từ `lg` giữ `gap-10` như cũ. */}
      <div className='mx-auto grid w-full max-w-[90rem] items-center gap-y-4.5 px-4 pt-5 pb-14 lg:grid-cols-[minmax(0,1fr)_14rem_minmax(0,0.65fr)] lg:gap-10 lg:px-8 lg:py-20'>
        <div className='min-w-0 space-y-4'>
          <motion.p
            initial={{ opacity: skip ? 1 : 0, y: skip ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={seq(0)}
            className='text-brand-orange text-xs font-semibold tracking-[0.16em] uppercase'
          >
            {t('eyebrow')}
          </motion.p>

          {/* Tiêu đề chỉ có MỘT bản trong HTML (sheet góp ý BuildX: bản cũ dựng hai
              bản + một lớp chữ chồng cho hiệu ứng nên mã trang lặp câu). Phần nhấn
              tô màu bằng `background-clip: text` + dải chuyển sắc trượt từ trái —
              span `inline` nên xuống dòng theo từng từ; từ `lg` phần nhấn xuống
              dòng riêng. Dưới `sm` cỡ chữ co theo bề ngang (`vw`) để vế đầu nằm
              gọn một dòng và phần nhấn tách dòng riêng, cân hai dòng (`text-balance`)
              — tổng 3 dòng, không ngắt giữa cụm kể cả máy màn nhỏ (Responsive case 3).
              Chỗ ngắt dòng admin đặt bằng ký tự xuống dòng được `whitespace-pre-line` giữ. */}
          <h1 className='text-[clamp(1.05rem,5.4vw,1.875rem)] leading-[1.15] font-bold tracking-tight sm:text-4xl lg:text-[2.2rem]'>
            <motion.span
              initial={{ opacity: skip ? 1 : 0, y: skip ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={seq(0.1, 0.75)}
              className='block text-balance whitespace-pre-line'
            >
              {t('titleLead')}{' '}
              <motion.span
                initial={{ backgroundPositionX: skip ? '0%' : '100%' }}
                animate={{ backgroundPositionX: '0%' }}
                transition={seq(0.9, 0.9)}
                style={{
                  backgroundImage:
                    'linear-gradient(to right, var(--color-brand-orange) 50%, color-mix(in oklab, var(--color-foreground) 35%, transparent) 50%)',
                  backgroundSize: '200% 100%'
                }}
                className='block bg-clip-text text-balance text-transparent lg:text-wrap lg:whitespace-nowrap'
              >
                {t('titleAccent')}
              </motion.span>
            </motion.span>
          </h1>

          {/* Chỗ xuống dòng nằm TRONG câu chữ (ký tự xuống dòng trong
              `messages/*.json`) và `whitespace-pre-line` tôn trọng nó: mô tả
              ngắt hết câu rồi mới xuống dòng, đúng như ảnh mockup, thay vì
              phó mặc trình duyệt ngắt giữa câu. */}
          <motion.p
            initial={{ opacity: skip ? 1 : 0, y: skip ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={seq(0.55, 0.75)}
            className='text-muted-foreground max-w-[38rem] whitespace-pre-line'
          >
            {t('subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: skip ? 1 : 0, y: skip ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={seq(0.72, 0.75)}
            className='flex min-w-0 flex-col gap-3 pt-1 sm:flex-row'
          >
            {resumeProject ? (
              <Button
                asChild
                className='brand-green-button h-11 max-w-full min-w-0 shrink overflow-hidden rounded-full px-8 text-base has-[>svg]:px-8'
              >
                <Link href={resumeProject.href} title={`${t('resumeCta')} ${resumeProject.name}`}>
                  <ResumeProjectLabel label={t('resumeCta')} name={resumeProject.name} />
                  <ArrowRight className='size-4' />
                </Link>
              </Button>
            ) : (
              <Button
                className='brand-green-button group h-11 rounded-full px-8 text-base has-[>svg]:px-8'
                onClick={onCreateProject}
              >
                {t('primaryCta')}
                <ArrowRight className='size-4 transition-transform duration-300 group-hover:translate-x-1' />
              </Button>
            )}
            <Button
              type='button'
              variant='outline'
              className='bg-card/85 h-11 shrink-0 rounded-full px-8 text-base has-[>svg]:px-8'
              onClick={onWatchIntro}
            >
              <Play className='size-4' />
              {t('secondaryCta')}
            </Button>
          </motion.div>
        </div>

        <HeroDossierCard skip={skip} skipStar={skipStar} seq={seq} onCreateProject={onCreateProject} />
      </div>
    </section>
  )
}

interface HeroDossierCardProps {
  skip: boolean
  skipStar: boolean
  seq: (delay: number, duration?: number) => Transition
  /** "Xem hồ sơ mẫu" mở hộp thoại Tạo dự án mới (sheet góp ý BuildX). */
  onCreateProject?: () => void
}

/**
 * Thẻ "Hồ sơ dự án" nổi trên ảnh hero — bản rút gọn của khối Thông tin dự án ở
 * Bước 3 (mục III.4). Số liệu là ví dụ minh họa, không phải dự án thật, nên dòng
 * tổng cộng dẫn người xem vào hồ sơ mẫu thay vì nêu một con số tiền.
 *
 * Rê chuột: nhấc + nghiêng nhẹ THEO CHUỘT (tilt 3D bám vị trí con trỏ trong
 * thẻ) — khác `whileHover` tĩnh, cần theo dõi `onMouseMove` để tính góc.
 */
function HeroDossierCard({ skip, skipStar, seq, onCreateProject }: HeroDossierCardProps) {
  const t = useTranslations('landing.hero.card')

  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 24, mass: 0.8 })
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 24, mass: 0.8 })

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * 6)
    rotateX.set(py * -6)
  }

  const onMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: skip ? 1 : 0, y: skip ? 0 : 24, scale: skip ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={seq(0.55, 0.75)}
      style={{ rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 800 }}
      whileHover={{ y: -3, transition: { duration: 0.5, ease: revealEase } }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className='bg-card/95 w-full space-y-2.5 rounded-2xl border p-3 shadow-lg backdrop-blur-sm lg:mt-10 lg:-translate-x-14'
    >
      <p className='flex items-center gap-2 text-xs font-semibold'>
        <motion.span
          initial={skipStar ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 0, rotate: 0, scale: 0.85 }}
          animate={
            skipStar
              ? { opacity: 1, rotate: 0, scale: 1 }
              : {
                  opacity: [0, 1, 1, 1],
                  rotate: [0, 0, 40, 0],
                  scale: [0.85, 1, 1.22, 1]
                }
          }
          transition={{
            duration: skipStar ? 0 : 1.05 * INTRO_SPEED.duration,
            delay: skipStar ? 0 : 1.35 * INTRO_SPEED.delay,
            times: [0, 0.18, 0.55, 1],
            ease: 'easeInOut'
          }}
          className='relative inline-flex'
        >
          <motion.span
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={skipStar ? { opacity: 0, scale: 1 } : { opacity: [0, 0, 0.9, 0], scale: [0.6, 0.8, 1.8, 2.1] }}
            transition={{
              duration: skipStar ? 0 : 1.05 * INTRO_SPEED.duration,
              delay: skipStar ? 0 : 1.35 * INTRO_SPEED.delay,
              times: [0, 0.18, 0.55, 1],
              ease: 'easeInOut'
            }}
            className='bg-warning/70 absolute inset-0 rounded-full blur-sm'
          />
          <Star className='fill-warning text-warning relative size-3.5' />
        </motion.span>
        {t('title')}
      </p>

      <dl className='space-y-1.5 text-xs'>
        {HERO_CARD_ROWS.map((row, index) => (
          <motion.div
            key={row}
            initial={{ opacity: skip ? 1 : 0, x: skip ? 0 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={seq(0.85 + index * 0.11, 0.45)}
            className='flex items-center justify-between gap-4'
          >
            <dt className='text-muted-foreground'>{t(`rows.${row}.label`)}</dt>
            <dd className='font-medium'>{t(`rows.${row}.value`)}</dd>
          </motion.div>
        ))}
      </dl>

      <motion.div
        initial={{ opacity: skip ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={seq(1.2, 0.45)}
        className='flex flex-col gap-0.5 border-t pt-2 text-xs'
      >
        {/* Nhãn trên, số dưới: "Tổng dự toán (mẫu)" + "Khoảng 2,1 tỷ đồng" không vừa một hàng thẻ 14rem. */}
        <span className='font-semibold'>{t('totalLabel')}</span>
        <span className='text-primary text-sm font-semibold'>{t('totalValue')}</span>
      </motion.div>

      {/* "Xem hồ sơ mẫu": mở hộp thoại Tạo dự án mới (sheet góp ý BuildX) —
          trước đây chỉ cuộn xuống khối "Hồ sơ mẫu" bên dưới. */}
      <Button type='button' className='brand-green-button h-8.5 w-full rounded-full text-xs' onClick={onCreateProject}>
        {t('cta')}
      </Button>
    </motion.div>
  )
}
