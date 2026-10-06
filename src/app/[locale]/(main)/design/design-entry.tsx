'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { ProjectBoard, useDesignStore } from '@/features/design'
import { Button } from '@/shared/components/ui/button'
import { usePageEntrance } from '@/shared/hooks'

/**
 * Trang "Thiết kế & Dự toán — Dự án của tôi" (mục IV.1).
 *
 * Tiêu đề + dòng phụ + MỘT nút "Tạo dự án mới" to, đặt giữa (góp ý BuildX: bỏ
 * nút góc phải và ô viền đứt cuối lưới để khách tập trung vào một chỗ). Lịch sử
 * dự án do `ProjectBoard` dựng bên dưới (thẻ đếm, bộ lọc, lưới, phân trang).
 */
export function DesignEntry({ openCreateProject = false }: { openCreateProject?: boolean }) {
  const t = useTranslations('design.entry')
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)
  const queryHandledRef = useRef(false)
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('design.m01.header')

  useEffect(() => {
    if (queryHandledRef.current || !openCreateProject) return
    queryHandledRef.current = true
    openCreateDialog()
  }, [openCreateDialog, openCreateProject])

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] space-y-5 px-4 py-5 lg:space-y-8 lg:px-8'
    >
      <header data-entrance-step='0' className='flex flex-col items-center gap-5 py-0 text-center lg:py-4'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-semibold tracking-tight'>{t('title')}</h1>
          <p className='text-muted-foreground text-pretty'>{t('subtitle')}</p>
        </div>
        <Button
          size='lg'
          className='brand-green-button h-12 rounded-full px-10 text-base font-semibold has-[>svg]:px-10'
          onClick={openCreateDialog}
        >
          <Plus className='size-5' />
          {t('create')}
        </Button>
      </header>

      <ProjectBoard />
    </div>
  )
}
