'use client'

import { ArrowRight, Check, House, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { EmptyState, Photo } from '@/shared/components/common'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { designDossierRoute, designEstimateRoute, designInputRoute } from '@/shared/constants/routes'
import { formatDisplayDate } from '@/shared/utils'
import { DESIGN_STEPS } from '../constants/design.constants'
import { useEstimateBrief } from '../hooks/use-estimate-brief'
import { useProjects } from '../hooks/use-projects'
import { DesignLoadError } from './design-load-error'
import type { DesignStep, Project } from '../types/design.types'
import { DeleteProjectDialog, RenameProjectDialog } from './project-menu-dialogs'

const STEP_ROUTE: Record<DesignStep, (projectId: string) => string> = {
  1: designInputRoute,
  2: designEstimateRoute,
  3: designDossierRoute
}

interface MyProjectsProps {
  /**
   * Nội dung gắn vào đáy mỗi thẻ dự án — S24 dùng để cắm khối giám sát.
   * `features/design` không được import `features/supervision`, nên khối đó do
   * lớp app truyền vào.
   */
  renderSupervision?: (projectId: string) => React.ReactNode
}

/**
 * "Dự án của tôi" ở trang Tài khoản (mục IX, Hình 17).
 *
 * Lưới 2 cột, mỗi thẻ nằm NGANG: ảnh trái, bên phải là tên dự án, mã, ngày tạo,
 * thanh tiến độ 3 đoạn, badge bước và liên kết "Mở tiếp →"; menu ⋮ ở góc phải.
 * Khác với lưới ở trang Thiết kế & Dự toán (mục IV.1) — chỗ đó là thẻ dọc kèm
 * bộ lọc và phân trang.
 */
export function MyProjects({ renderSupervision }: MyProjectsProps = {}) {
  const t = useTranslations('account.projects')
  const { data: projects, isPending, isError, refetch } = useProjects()

  const [renaming, setRenaming] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  // Đợi Dropdown trả lại pointer-events cho body trước khi mở Dialog. Mở hai
  // modal layer Radix trong cùng một tick sẽ khiến Dialog lưu nhầm giá trị
  // `none` và phục hồi nó khi đóng, làm toàn bộ trang không thể bấm chuột.
  const openDialogAfterMenuCloses = (setter: (project: Project) => void, project: Project) => {
    window.setTimeout(() => setter(project), 0)
  }

  if (isPending) {
    return (
      <div className='grid gap-4 sm:grid-cols-2'>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-36 w-full rounded-xl' />
        ))}
      </div>
    )
  }

  if (isError) return <DesignLoadError onRetry={() => void refetch()} />

  if (!projects?.length) {
    return <EmptyState title={t('empty.title')} description={t('empty.description')} />
  }

  return (
    <>
      {/* `grid-flow-row-dense`: thẻ có khối giám sát chiếm HAI hàng (xem bên
          dưới), nên các thẻ sau phải lấp được vào ô trống của hàng thứ hai thay
          vì nhảy hẳn xuống hàng ba. */}
      <ul className='grid grid-flow-row-dense items-start gap-4 sm:grid-cols-2'>
        {projects.map((project) => {
          const done = project.status === 'completed'
          // Hình S24: nửa trên của thẻ và khối giám sát mỗi phần cao đúng MỘT
          // hàng, nên thẻ có giám sát chiếm hai hàng và cột bên cạnh xếp vừa
          // hai thẻ thường. Không khai `row-span-2` thì thẻ ngắn bên cạnh để
          // trống hẳn một mảng bằng cả một thẻ.
          const supervision = renderSupervision?.(project.id)

          return (
            <li key={project.id} className={cn(supervision && 'sm:row-span-2 sm:self-stretch')}>
              <article
                className={cn(
                  'bg-card hover:border-primary/50 group relative flex h-full flex-col overflow-hidden rounded-xl border transition-colors',
                  // Thẻ chiếm hai hàng thì CHIA ĐÔI theo chiều cao: mỗi nửa cao
                  // đúng một hàng lưới, nên đường đứt giữa hai nửa rơi vào GIỮA
                  // khe hở của cột bên cạnh. Để hai nửa tự co theo nội dung thì
                  // đường đứt bám mép trên khe, và thẻ dưới bên phải tụt xuống
                  // đúng một `gap` so với khối giám sát — nhìn là thấy lệch.
                  supervision && 'sm:grid sm:grid-rows-2'
                )}
              >
                <div className='flex gap-4 p-4'>
                  {/* Ảnh bìa là ảnh lô đất của Bước 1; chưa có thì để khung rỗng. */}
                  <ProjectCover project={project} />

                  <div className='flex min-w-0 flex-1 flex-col gap-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <h3 className='min-w-0 truncate text-lg font-semibold'>{project.name}</h3>

                      {/* z-10 để nổi trên lớp phủ của liên kết "Mở tiếp". */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={t('menu.label')}
                          className='text-muted-foreground hover:text-foreground z-10 -mt-1 -mr-1 shrink-0 rounded p-1 transition-colors'
                        >
                          <MoreHorizontal className='size-4' />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onSelect={() => openDialogAfterMenuCloses(setRenaming, project)}>
                            <Pencil className='size-4' />
                            {t('menu.rename')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant='destructive'
                            onSelect={() => openDialogAfterMenuCloses(setDeleting, project)}
                          >
                            <Trash2 className='size-4' />
                            {t('menu.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Hình S24: "Tạo ngày 12/06/2026 · Nhà phố · 120 m²" — một
                        dòng, ngăn bằng dấu chấm giữa. Hai vế sau chỉ có sau khi
                        khách qua Bước 1 và Bước 2, thiếu vế nào thì bỏ luôn cả
                        dấu ngăn của vế đó. */}
                    <ProjectMeta project={project} />

                    {/* Hình S24: nhãn + ba CHẤM có số và tên bước, không phải ba
                      thanh trơn — ba thanh không nói được đang dừng ở bước nào. */}
                    <p className='mt-4 text-sm font-medium'>{t('progressLabel')}</p>
                    <ol className='mt-2.5 flex items-start'>
                      {DESIGN_STEPS.map((step, index) => {
                        const reached = done || step <= project.currentStep
                        const current = !done && step === project.currentStep

                        return (
                          <Fragment key={step}>
                            <li className='flex shrink-0 flex-col items-center gap-1'>
                              <span
                                className={cn(
                                  'flex size-6 items-center justify-center rounded-full max-md:text-xs text-[11px] leading-none font-semibold',
                                  current && 'bg-info text-primary-foreground',
                                  !current && reached && 'bg-primary text-primary-foreground',
                                  !reached && 'border-border text-muted-foreground border'
                                )}
                              >
                                {reached && !current ? <Check className='size-3.5' strokeWidth={3.5} /> : step}
                              </span>
                              <span
                                className={cn(
                                  'text-xs leading-none whitespace-nowrap',
                                  reached ? 'text-foreground' : 'text-muted-foreground'
                                )}
                              >
                                {t('stepShort', { step })}
                              </span>
                            </li>

                            {index < DESIGN_STEPS.length - 1 ? (
                              <span
                                aria-hidden
                                className={cn(
                                  'mt-3 h-0.5 min-w-3 flex-1 rounded-full',
                                  done || step < project.currentStep ? 'bg-primary' : 'bg-border'
                                )}
                              />
                            ) : null}
                          </Fragment>
                        )
                      })}
                    </ol>

                    {/* Viên nhãn trạng thái và liên kết xếp DỌC, canh trái —
                      Hình S24 để chúng trên hai dòng chứ không đẩy hai đầu. */}
                    <div className='mt-4 flex flex-col items-start gap-2'>
                      <span
                        // Hình S24: "Hoàn tất" nền XANH LÁ nhạt, "Bước 2/3"
                        // nền XANH DƯƠNG nhạt — cùng màu với chấm bước đang
                        // làm ở sợi chỉ ngay trên nó, để hai thứ đọc ra là một.
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                          done ? 'bg-accent text-primary-strong' : 'bg-info-soft text-info border-info/25 border'
                        )}
                      >
                        {done ? t('completed') : t('step', { step: project.currentStep })}
                        {done ? <Check className='size-3' strokeWidth={3} /> : null}
                      </span>

                      {/* `after:absolute after:inset-0` biến cả thẻ thành vùng bấm. */}
                      <Link
                        href={STEP_ROUTE[project.currentStep](project.id)}
                        className='text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 transition-colors after:absolute after:inset-0 after:content-[""]'
                      >
                        {t('open')}
                        <ArrowRight className='size-4' />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Chỗ cắm cho khối giám sát (S24). `features/design` không được
                    import `features/supervision`, nên lớp app truyền nội dung
                    vào qua slot này. */}
                {supervision}
              </article>
            </li>
          )
        })}
      </ul>

      <RenameProjectDialog project={renaming} onClose={() => setRenaming(null)} />
      <DeleteProjectDialog project={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}

/** Ảnh bìa = ảnh lô đất của Bước 1: dự toán thật đọc từ chi tiết (danh sách không trả ảnh); chưa có thì khung rỗng. */
function ProjectCover({ project }: { project: Project }) {
  const brief = useEstimateBrief(project.id)
  const coverUrl = project.coverUrl ?? brief.coverUrl
  return coverUrl ? (
    <Photo className='w-[36%] shrink-0 self-stretch rounded-lg' src={coverUrl} alt={project.name} sizes='220px' />
  ) : (
    <span className='bg-muted text-muted-foreground/40 flex w-[36%] shrink-0 items-center justify-center self-stretch rounded-lg'>
      <House className='size-8' strokeWidth={1.25} />
    </span>
  )
}

/** Hình S24: "Tạo ngày 12/06/2026 · Nhà phố · 120 m²" — thiếu vế nào thì bỏ luôn cả dấu ngăn của vế đó. */
function ProjectMeta({ project }: { project: Project }) {
  const t = useTranslations('account.projects')
  const locale = useLocale() as Locale
  const tBuilding = useTranslations('design.input.buildingType.options')
  const brief = useEstimateBrief(project.id)
  const buildingType = project.buildingTypeLabel ?? (project.buildingType ? tBuilding(project.buildingType) : null)
  const area = project.floorArea ?? brief.floorArea

  return (
    <p className='text-muted-foreground text-sm'>
      {[
        t('createdAt', { date: formatDisplayDate(project.createdAt, locale) }),
        buildingType,
        area ? t('floorArea', { area }) : null
      ]
        .filter(Boolean)
        .join(' · ')}
    </p>
  )
}
