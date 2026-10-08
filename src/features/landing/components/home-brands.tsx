'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useHomeSections } from '@/shared/cms/home-content'
import { itemText, sectionItems, sectionText } from '@/shared/cms/home-sections'
import { cn } from '@/shared/lib/utils'
import { HOME_BRAND_LOGOS, HOME_BRANDS } from '../constants/landing.constants'

interface BrandLogo {
  key: string
  src: string
  label: string
}

/**
 * Dải thương hiệu vật liệu được tin dùng — mặc định 15 logo, admin thay được cả danh sách (khối `brands`).
 *
 * Luôn chạy marquee tự động trên desktop + mobile. Danh sách được nhân đôi để
 * vòng lặp liền mạch; rê chuột/chạm sẽ tạm dừng để người dùng xem logo.
 */
export function HomeBrands() {
  const t = useTranslations('landing.brands')
  const [paused, setPaused] = useState(false)
  const sections = useHomeSections()
  const savedLogos = sectionItems(sections, 'brands', 'logos')
    ?.map((item, index) => ({
      key: `saved-${index}`,
      src: itemText(item, 'imageUrl') ?? '',
      label: itemText(item, 'name') ?? ''
    }))
    .filter((logo) => logo.src !== '')
  // Admin đã lưu danh sách thì dùng đúng danh sách đó (thêm, bớt, đổi thứ tự được); chưa lưu thì dùng 15 logo có sẵn.
  const logos: BrandLogo[] =
    savedLogos && savedLogos.length > 0
      ? savedLogos
      : HOME_BRANDS.map((brand) => ({ key: brand, src: HOME_BRAND_LOGOS[brand], label: t(`items.${brand}`) }))

  return (
    <section className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
      <h2 className='text-2xl font-bold tracking-tight text-balance lg:text-[1.75rem]'>
        {sectionText(sections, 'brands', 'title') ?? t('title')}
      </h2>

      <div
        className='bg-card mt-3 overflow-hidden rounded-2xl border py-6'
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className={cn('animate-marquee flex w-max items-center gap-12 px-8', paused && 'paused')}>
          {[...logos, ...logos].map((logo, index) => {
            const duplicate = index >= logos.length

            return <BrandItem key={`${logo.key}-${index}`} src={logo.src} label={logo.label} duplicate={duplicate} />
          })}
        </div>
      </div>
    </section>
  )
}

function BrandItem({ src, label, duplicate }: { src: string; label: string; duplicate: boolean }) {
  return (
    <span className='flex h-14 w-36 shrink-0 items-center justify-center' aria-hidden={duplicate || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logo thương hiệu có nhiều tỉ lệ khác nhau */}
      <img
        src={src}
        alt={duplicate ? '' : label}
        loading='lazy'
        className='max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105'
      />
    </span>
  )
}
