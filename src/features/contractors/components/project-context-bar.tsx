'use client'

import { ArrowLeftRight, House, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { contractorBriefRoute, contractorInvitationsRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { env } from '@/shared/config/env'
import { MAX_INVITATIONS } from '../constants/contractors.constants'
import { useInvitations } from '../hooks/use-invitations'
import { useSyncSelectedProject } from '../hooks/use-sync-selected-project'
import { shortAddress } from '../services/brief.service'
import { useProjectPickerStore } from '../store/project-picker.store'
import type { ProjectBrief } from '../types/contractor.types'
import { ProjectPickerDialog } from './project-picker-dialog'

interface ProjectContextBarProps {
  brief?: ProjectBrief
  /** Thu thanh về một hàng khi M05 dính dưới navigation trong lúc cuộn. */
  condensed?: boolean
  /**
   * Thay viên nhãn "Đã mời x/3" mặc định — trang Đề xuất dùng bản có hoạt ảnh lật
   * số và rung khi hết lượt. Nội dung vẫn phải là "Đã mời x/3".
   */
  invitedPill?: ReactNode
  /** Hành động riêng của một màn, đứng trước bộ hành động chung (ví dụ "So sánh x/3" ở hồ sơ nhà thầu). */
  extra?: ReactNode
}

/**
 * Thanh dự án — MỘT khối dùng chung cho cả luồng tìm nhà thầu (Đề xuất, Hồ sơ
 * nhà thầu, So sánh, Đặt lịch khảo sát, Đã gửi, Lời mời).
 *
 * Góp ý BuildX: trước đây mỗi màn một kiểu (nhãn khác nhau, màn có "Đổi dự án",
 * màn chỉ có "Chỉnh sửa hồ sơ"). Nay màn nào cũng giống nhau: nhãn "Dự án đang
 * chọn", tên · loại · quy mô · địa chỉ, rồi "Đã mời x/3" + Xem lời mời + Đổi dự
 * án + Chỉnh sửa hồ sơ. Hộp thoại chọn dự án đi kèm thanh nên không màn nào
 * phải tự gắn.
 *
 * Sửa hồ sơ sau khi đã gửi lời mời tạo phiên bản mới (v2…) — lời mời đã gửi giữ
 * bản cũ; nhãn "Hồ sơ v2" và chú thích trên nút sửa nói rõ điều đó.
 */
export function ProjectContextBar({ brief, condensed = false, invitedPill, extra }: ProjectContextBarProps) {
  useSyncSelectedProject(brief)
  const t = useTranslations('contractors.common')
  const tBar = useTranslations('contractors.projectBar')
  const rfq = useTranslations('contractors.rfq')
  const tScale = useTranslations('contractors.scale')
  const openPicker = useProjectPickerStore((s) => s.openPicker)
  const { data: invitations, limit, isError, siteRequired } = useInvitations(brief?.id ?? '')

  if (!brief) {
    return <Skeleton className='h-20 w-full rounded-2xl' />
  }

  const invitedCount = invitations?.length ?? 0
  const version = brief.version ?? 1

  const editLink = (
    <Link
      href={contractorBriefRoute(brief.id)}
      className='text-primary hover:text-primary/80 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium underline-offset-4 transition-colors hover:underline'
    >
      <Pencil className='size-3.5' />
      {t('editBrief')}
    </Link>
  )

  return (
    <section
      className={cn(
        'bg-card flex flex-wrap items-center rounded-2xl border transition-[padding,gap,border-radius] duration-300 ease-out motion-reduce:transition-none',
        condensed ? 'gap-x-3 gap-y-2 px-3 py-2 sm:px-4' : 'gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5'
      )}
    >
      <span
        className={cn(
          'bg-accent text-primary-strong flex shrink-0 items-center justify-center transition-[width,height,border-radius] duration-300 ease-out motion-reduce:transition-none',
          condensed ? 'size-8 rounded-lg' : 'size-11 rounded-xl'
        )}
      >
        <House className='size-5' />
      </span>

      <div className='min-w-0 flex-1'>
        <p
          aria-hidden={condensed}
          className={cn(
            'text-muted-foreground overflow-hidden max-md:text-xs text-[11px] font-medium tracking-wide uppercase transition-[max-height,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            condensed ? 'max-h-0 -translate-y-1 opacity-0' : 'max-h-5 translate-y-0 opacity-100'
          )}
        >
          {tBar('label')}
        </p>

        <div className='flex flex-wrap items-center gap-2'>
          <h2
            className={cn(
              'truncate font-semibold transition-[font-size] duration-300 ease-out motion-reduce:transition-none',
              condensed ? 'text-sm' : 'text-lg'
            )}
          >
            {brief.name}
          </h2>
          {brief.selfCreated ? (
            <span className='border-primary/40 text-primary-strong rounded-md border px-2 py-0.5 max-md:text-xs text-[11px] font-medium'>
              {t('selfCreated')}
            </span>
          ) : null}
          {version > 1 ? (
            <span className='bg-accent text-primary-strong rounded-md px-2 py-0.5 max-md:text-xs text-[11px] font-medium'>
              {tBar('version', { version })}
            </span>
          ) : null}
        </div>

        {/* "Nhà phố · Trệt + 1 lầu · 120 m² · P. Tân Lợi, Đắk Lắk" — quy mô đứng ngay sau loại công trình. */}
        <p
          aria-hidden={condensed}
          className={cn(
            'text-muted-foreground truncate overflow-hidden text-xs transition-[max-height,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            condensed ? 'max-h-0 -translate-y-1 opacity-0' : 'max-h-5 translate-y-0 opacity-100'
          )}
        >
          {[brief.buildingType, tScale(brief.scale), `${brief.landArea} m²`, shortAddress(brief)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        {extra}
        {!env.NEXT_PUBLIC_USE_MOCK_API && limit === undefined ? (
          <span role='status' className='text-muted-foreground text-xs'>
            {siteRequired ? rfq('siteRequired') : isError ? rfq('quotaUnavailable') : rfq('loading')}
          </span>
        ) : (
          (invitedPill ?? (
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                invitedCount >= (limit ?? Infinity)
                  ? 'bg-brand-orange-soft text-brand-orange'
                  : 'bg-accent text-primary-strong'
              )}
            >
              {tBar('invited', { used: invitedCount, max: limit ?? MAX_INVITATIONS })}
            </span>
          ))
        )}
        <Link
          href={contractorInvitationsRoute(brief.id)}
          className='text-primary-strong text-sm font-medium underline underline-offset-4'
        >
          {tBar('viewInvites')}
        </Link>
        <Button variant='outline' size='sm' onClick={openPicker}>
          <ArrowLeftRight className='size-4' />
          {tBar('switchProject')}
        </Button>
        {invitedCount > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>{editLink}</TooltipTrigger>
            <TooltipContent>{tBar('editWarning', { next: `v${version + 1}`, current: `v${version}` })}</TooltipContent>
          </Tooltip>
        ) : (
          editLink
        )}
      </div>

      <ProjectPickerDialog currentProjectId={brief.id} />
    </section>
  )
}
