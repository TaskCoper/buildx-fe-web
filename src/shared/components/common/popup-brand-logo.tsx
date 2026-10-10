'use client'

import { motion, useReducedMotion } from 'motion/react'

/**
 * Logo BuildX có slogan, nền trong suốt, dùng chung cho header các popup public.
 *
 * Parent cần `position: relative`. Logo được căn giữa theo chiều cao cụm
 * header/subtitle và hạ nhẹ xuống để cân thị giác với phần chữ. Header chừa
 * `min-[900px]:px-44` để tiêu đề dài không chồng lên logo hoặc nút đóng.
 */
export function PopupBrandLogo() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
      className='absolute top-[calc(50%+0.35rem)] left-6 hidden min-[900px]:block'
    >
      <span className='block -translate-y-1/2'>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo tĩnh trong public, không cần loader */}
        <img
          src='/images/brand/buildx-popup-logo-transparent.avif'
          alt='BuildX'
          className='h-24 w-auto max-w-32 object-contain'
        />
      </span>
    </motion.div>
  )
}
