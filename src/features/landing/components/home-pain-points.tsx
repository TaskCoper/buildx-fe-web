'use client'

import { Clock, Coins, FileSearch, PencilRuler, UserRoundSearch, type LucideIcon } from 'lucide-react'
import { motion, useInView } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { revealEase, ScribbleArrow } from '@/shared/components/common'
import { cn } from '@/shared/lib/utils'
import { HOME_PAIN_POINTS, type HomePainPoint } from '../constants/landing.constants'

/** Biểu tượng theo ảnh mockup: tiền · thước-bút · kính lúp tìm người · hồ sơ · đồng hồ. */
const PAIN_ICON: Record<HomePainPoint, LucideIcon> = {
  budget: Coins,
  design: PencilRuler,
  contractor: UserRoundSearch,
  dossier: FileSearch,
  supervision: Clock
}

const DIM_DELAY = ['delay-0', 'delay-75', 'delay-150', 'delay-200'] as const

/**
 * Dải xanh đậm "Khó là kiểm soát mọi thứ cùng lúc" — 5 nỗi đau của chủ nhà.
 *
 * Nền xanh đặc tràn hết bề ngang, chữ trắng; 5 thẻ trắng nằm trên nền đó. Đây là
 * khối DUY NHẤT của trang chủ đảo màu, nên nó cũng là ranh giới thị giác giữa
 * phần giới thiệu sản phẩm (hero) và phần bán hàng bên dưới.
 *
 * ★ Thẻ hiện lần lượt trái→phải, icon nhún 1 lần lúc hiện; rê thẻ thì 4 thẻ
 * còn lại mờ đi. Theo góp ý BuildX: bỏ dòng nhãn đầu khối, bỏ dòng "Xem cách
 * … giải quyết" và bỏ bấm thẻ cuộn xuống dải 5 bước.
 */
export function HomePainPoints() {
  const t = useTranslations('landing.painPoints')
  const [hovered, setHovered] = useState<HomePainPoint | null>(null)
  const hoveredIndex = hovered === null ? -1 : HOME_PAIN_POINTS.indexOf(hovered)
  // Theo dõi KHUNG BỌC ghi chú, không theo dõi chính ghi chú: ghi chú bị `clip-path` che
  // kín nên trình duyệt báo phần lọt màn hình = 0% và `whileInView` không bao giờ chạy —
  // ghi chú tàng hình ở mọi khổ màn (góp ý #46). Khung bọc không bị che nên đo đúng.
  const noteRef = useRef<HTMLDivElement>(null)
  const noteInView = useInView(noteRef, { once: true, amount: 0.3 })

  return (
    <section id='home-pain-points' className='brand-band'>
      {/* Dưới `lg`: đệm trên 50px (40 + 10 theo góp ý) — KHÔNG đưa về 20px như các cụm khác:
            dải số liệu (`HomeStats`) chờm xuống 38px (`-mb-9.5`) lên đầu khối này, đệm trên
            thấp hơn thì tiêu đề bị dải đó che. Đệm dưới 20px như các cụm khác (trước đây 50px, dưới thẻ còn dải
            chấm chỉ vị trí + `pb-1` nên trống ~66px). */}
      <div className='mx-auto w-full max-w-[90rem] px-4 pt-12.5 pb-5 lg:px-8 lg:pt-12 lg:pb-5'>
        <div className='flex flex-wrap items-end justify-between gap-x-10 gap-y-4'>
          <div className='space-y-2'>
            <motion.h2
              initial={{ opacity: 0, y: '35%' }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.75, delay: 0.08, ease: revealEase }}
              className='text-2xl font-bold tracking-tight text-balance lg:text-[1.75rem]'
            >
              {t('title')}
            </motion.h2>
            {/* Chỗ xuống dòng nằm trong chính câu chữ (`messages/*.json`). */}
            <motion.p
              initial={{ opacity: 0, y: '35%' }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.75, delay: 0.18, ease: revealEase }}
              className='text-primary-foreground max-w-5xl text-sm whitespace-pre-line'
            >
              {t('subtitle')}
            </motion.p>
          </div>

          {/* Ghi chú viết tay + mũi tên vẽ tay chỉ xuống dải thẻ (ảnh mockup) —
              vẽ nét SAU CÙNG, đúng thứ tự mở màn của khối. */}
          {/* Hiện ở MỌI khổ màn hình (góp ý #46): dưới `lg` nằm dưới tiêu đề, nghiêng nhẹ hơn. */}
          <div ref={noteRef} className='max-lg:hidden lg:translate-y-2'>
            <motion.div
              initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
              animate={noteInView ? { opacity: 1, clipPath: 'inset(0 0% 0 0)' } : undefined}
              transition={{ duration: 0.6, delay: 0.9, ease: revealEase }}
              className='flex flex-col items-end'
            >
              <p className='font-hand mr-10 max-w-[15rem] -rotate-6 text-left text-lg leading-snug whitespace-pre-line lg:mr-14 lg:-rotate-9 lg:text-xl'>
                {t('note')}
              </p>
              {/* Giữ đúng chiều ảnh mẫu: nét cong đi lên từ trái rồi đổ xuống,
                đầu mũi chỉ xuống-phải về phía dải thẻ. */}
              <ScribbleArrow className='text-primary-foreground/85 -mt-3 mr-5 h-8 w-20 rotate-120' />
            </motion.div>
          </div>
        </div>

        {/* Dưới `sm`: danh sách DỌC, thẻ ngang (icon trái · chữ phải, căn trái) như ảnh đề
            xuất — bỏ cuộn ngang và dải chấm. `auto-rows-fr`: 5 thẻ CAO BẰNG NHAU (bằng thẻ
            có mô tả dài nhất); icon nằm trên ô vuông xanh lá nhạt. Cả hai chỉ ở dưới `sm`. Từ `sm` giữ nguyên lưới thẻ dọc cũ. */}
        <ul className='mt-4 grid auto-rows-fr gap-3 sm:auto-rows-auto sm:grid-cols-2 sm:gap-4 lg:mt-8 lg:grid-cols-5'>
          {HOME_PAIN_POINTS.map((point, index) => {
            const Icon = PAIN_ICON[point]
            const isHovered = hovered === point
            const dimmed = hovered !== null && !isHovered
            const dimOrder = dimmed ? index - (index > hoveredIndex ? 1 : 0) : 0

            return (
              <motion.li
                key={point}
                initial={{ opacity: 0, y: '12%' }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.65, delay: index * 0.12, ease: revealEase }}
                onMouseEnter={() => setHovered(point)}
                onMouseLeave={() => setHovered(null)}
                className='flex'
              >
                <div
                  className={cn(
                    'bg-card text-card-foreground flex h-full w-full flex-row items-start gap-3 rounded-2xl border p-4 text-left transition-[opacity,transform,border-color,box-shadow] duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none sm:flex-col sm:items-center sm:gap-2.5 sm:p-5 sm:text-center',
                    dimmed ? cn('opacity-45', DIM_DELAY[dimOrder]) : 'delay-0 opacity-100',
                    isHovered && 'border-primary/50 ring-primary/15 -translate-y-1 shadow-md ring-4'
                  )}
                >
                  <motion.span
                    className='bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-auto sm:rounded-none sm:bg-transparent'
                    initial={{ scale: 1 }}
                    whileInView={{ scale: [1, 1.15, 1] }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.15 }}
                  >
                    <Icon
                      className={cn(
                        'size-7 transition-colors duration-500 ease-out motion-reduce:transition-none',
                        isHovered ? 'text-brand-orange' : 'text-primary'
                      )}
                      strokeWidth={1.75}
                    />
                  </motion.span>
                  {/* `sm:contents`: từ `sm` khung bọc này biến mất để tiêu đề, mô tả nằm thẳng
                      trong cột giữa thẻ như cũ. */}
                  <div className='min-w-0 flex-1 space-y-1 sm:contents sm:space-y-0'>
                    <h3
                      className={cn(
                        'text-sm leading-snug font-bold text-balance transition-colors duration-500 ease-out motion-reduce:transition-none',
                        isHovered && 'text-brand-orange'
                      )}
                    >
                      {t(`items.${point}.title`)}
                    </h3>
                    <p className='text-foreground text-xs leading-relaxed font-normal text-pretty'>
                      {t(`items.${point}.description`)}
                    </p>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
