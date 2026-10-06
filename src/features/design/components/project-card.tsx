'use client'

import { ArrowRight, Check, House, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useEffect, useState, type CSSProperties } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Photo } from '@/shared/components/common'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { designDossierRoute, designEstimateRoute, designInputRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import { DESIGN_STEPS } from '../constants/design.constants'
import { miniStepState } from '../services/project-list.service'
import type { Project, ProjectStatus } from '../types/design.types'

interface ProjectCardProps {
  project: Project
  onRename: (project: Project) => void
  onDelete: (project: Project) => void
}

/**
 * Liên kết hành động đổi theo trạng thái (mục IV.1, Hình 02): đang nhập liệu →
 * "Tiếp tục nhập", đang thiết kế → "Mở tiếp", chờ duyệt → "Xem dự toán",
 * hoàn tất → "Xem hồ sơ".
 */
const ACTION_BY_STATUS: Record<
  ProjectStatus,
  { route: (projectId: string) => string; labelKey: 'continueInput' | 'open' | 'viewEstimate' | 'viewDossier' }
> = {
  input: { route: designInputRoute, labelKey: 'continueInput' },
  designing: { route: designEstimateRoute, labelKey: 'open' },
  review: { route: designEstimateRoute, labelKey: 'viewEstimate' },
  completed: { route: designDossierRoute, labelKey: 'viewDossier' }
}

/**
 * Badge trạng thái nằm bên phải tên dự án (không đè lên ảnh). Ba mức nền theo
 * Hình 02: xám nhạt → xanh nhạt → vàng nhạt → xanh đặc khi hoàn tất.
 */
const BADGE_CLASS: Record<ProjectStatus, string> = {
  input: 'bg-muted text-muted-foreground',
  designing: 'bg-accent text-primary-strong',
  review: 'bg-warning/15 text-warning-strong',
  completed: 'bg-primary text-primary-foreground'
}

/** Chấm "đang làm": chờ duyệt là mốc chờ người khác nên tô vàng, còn lại xanh. */
function currentDotClass(status: ProjectStatus): string {
  return status === 'review' ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground'
}

/**
 * Mini-stepper 3 nấc nằm ngang, các chấm nối bằng đường kẻ (Hình 02):
 * Nhập liệu — Dự toán — Hồ sơ.
 */
const playedMiniSteppers = new Set<string>()
type MiniStepperPhase = 'waiting' | 'play' | 'done'

function MiniStepper({ project }: { project: Project }) {
  const t = useTranslations('design.projects')
  const [phase, setPhase] = useState<MiniStepperPhase>(() => (playedMiniSteppers.has(project.id) ? 'done' : 'waiting'))

  useEffect(() => {
    if (phase !== 'waiting') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      playedMiniSteppers.add(project.id)
      queueMicrotask(() => setPhase('done'))
      return
    }

    // Project cards already have their own entrance choreography. Trigger the
    // connector once, near the end of that entrance, instead of coupling it to
    // IntersectionObserver (which could retrigger after filter/search remounts).
    // The module-level Set keeps each project from replaying until a hard reload.
    const timer = window.setTimeout(() => {
      playedMiniSteppers.add(project.id)
      setPhase('play')
    }, 900)
    return () => window.clearTimeout(timer)
  }, [phase, project.id])

  useEffect(() => {
    if (phase !== 'play') return
    const timer = window.setTimeout(() => setPhase('done'), 720)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <ol data-stepper-phase={phase} className='mt-1.5 flex min-w-0 items-start'>
      {DESIGN_STEPS.map((step, index) => {
        const state = miniStepState(step, project)
        const next = DESIGN_STEPS[index + 1]
        // Đoạn nối sáng lên khi nấc kế tiếp đã bắt đầu — đọc được tiến độ mà
        // không cần nhìn từng chấm.
        const linkReached = next ? miniStepState(next, project) !== 'pending' : false

        return (
          <Fragment key={step}>
            <li className='flex shrink-0 flex-col items-center gap-1'>
              <span
                data-step-dot
                data-active={state === 'current'}
                className={cn(
                  'flex size-[18px] items-center justify-center rounded-full max-md:text-xs text-[10px] leading-none font-semibold',
                  state === 'done' && 'bg-primary text-primary-foreground',
                  state === 'current' && currentDotClass(project.status),
                  state === 'pending' && 'border-border text-muted-foreground border bg-transparent'
                )}
              >
                {state === 'done' ? <Check className='size-3' strokeWidth={3.5} /> : step}
              </span>
              <span
                className={cn(
                  'max-md:text-xs text-[10px] leading-none whitespace-nowrap',
                  state === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                {t(`steps.${step}`)}
              </span>
            </li>

            {next ? (
              <span
                aria-hidden
                data-mini-step-link
                data-reached={linkReached}
                style={{ '--mini-step-delay': `${index * 150}ms` } as CSSProperties}
                className={cn(
                  'mt-2 h-0.5 min-w-3 flex-1 origin-left rounded-full',
                  linkReached ? 'bg-primary' : 'bg-border'
                )}
              />
            ) : null}
          </Fragment>
        )
      })}
    </ol>
  )
}

/**
 * Một thẻ trong lưới "DỰ ÁN CỦA TÔI" (mục IV.1, Hình 02): ảnh thu nhỏ với nút ⋮
 * góc phải, tên dự án kèm badge trạng thái, ngày tạo, rồi hàng
 * cuối gồm mini-stepper 3 nấc bên trái và liên kết hành động bên phải.
 */
export function ProjectCard({ project, onRename, onDelete }: ProjectCardProps) {
  const t = useTranslations('design.projects')
  const locale = useLocale() as Locale
  const action = ACTION_BY_STATUS[project.status]
  const [justCompleted, setJustCompleted] = useState(false)

  // Dropdown và Dialog đều là modal layer của Radix. Nếu mở Dialog ngay trong
  // `onSelect`, Dialog sẽ ghi nhận `pointer-events: none` mà Dropdown đang đặt
  // trên body; khi Dialog đóng nó phục hồi chính giá trị đó và khóa cả trang.
  // Chờ sang tick kế tiếp để Dropdown cleanup xong rồi mới mount Dialog.
  const openDialogAfterMenuCloses = (action: (project: Project) => void) => {
    window.setTimeout(() => action(project), 0)
  }

  useEffect(() => {
    if (sessionStorage.getItem('savico.just-completed-project') !== project.id) return
    sessionStorage.removeItem('savico.just-completed-project')
    const startTimer = window.setTimeout(() => setJustCompleted(true), 0)
    const endTimer = window.setTimeout(() => setJustCompleted(false), 850)
    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(endTimer)
    }
  }, [project.id])

  return (
    // Hình S24: thẻ nằm NGANG — ảnh bìa là cột trái 36%, mọi thông tin dồn
    // sang phải. Xếp dọc như bản trước làm mỗi thẻ cao gấp đôi mà chữ vẫn ít.
    <article
      data-project-card
      data-just-completed={justCompleted}
      className='bg-card hover:border-primary/50 group relative flex h-full overflow-hidden rounded-xl border transition-[transform,border-color,box-shadow] duration-600 ease-out hover:-translate-y-px hover:shadow-md'
    >
      <div className='relative w-[36%] shrink-0'>
        {/* Ảnh bìa là ảnh lô đất của Bước 1; chưa có thì để khung rỗng có biểu
            tượng thay vì bỏ trống. */}
        {project.coverUrl ? (
          <Photo
            className='project-card-image h-full min-h-32 w-full transition-transform duration-500'
            src={project.coverUrl}
            alt={project.name}
            sizes='220px'
          />
        ) : (
          // Khung rỗng tô nhạt màu thương hiệu thay vì ô xám trơn: ô xám với
          // biểu tượng mờ trông như ảnh vỡ chứ không như "chưa có ảnh".
          <div className='from-accent to-accent/40 text-primary/40 flex h-full min-h-32 w-full items-center justify-center bg-linear-to-br'>
            <House className='size-10' strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className='flex min-w-0 flex-1 flex-col p-4'>
        <div className='flex items-start justify-between gap-2'>
          <h3 className='min-w-0 truncate text-[15px] font-semibold'>{project.name}</h3>

          {/* z-10 để nổi trên lớp phủ của liên kết hành động bên dưới — nếu
              không bấm vào ⋮ sẽ mở dự án thay vì mở menu. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('menu.label')}
              className='text-muted-foreground hover:text-foreground relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full opacity-55 transition-[color,opacity] group-hover:opacity-100'
            >
              <MoreHorizontal className='size-4' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onSelect={() => openDialogAfterMenuCloses(onRename)}>
                <Pencil className='size-4' />
                {t('menu.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem variant='destructive' onSelect={() => openDialogAfterMenuCloses(onDelete)}>
                <Trash2 className='size-4' />
                {t('menu.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className='text-muted-foreground mt-1 text-xs'>
          {t('createdAt', { date: formatDisplayDate(project.createdAt, locale) })}
        </p>

        {/* Nhãn đứng trên mini-stepper, đúng Hình S24 — không có nhãn thì ba
            chấm lơ lửng, người đọc không biết đó là tiến độ của cái gì. */}
        <p className='text-muted-foreground mt-3 text-xs'>{t('progressLabel')}</p>
        <MiniStepper project={project} />

        <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5'>
          <span
            data-project-status
            data-completed={project.status === 'completed'}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 max-md:text-xs text-[11px] font-medium',
              BADGE_CLASS[project.status]
            )}
          >
            {t(`status.${project.status}`)}
            {project.status === 'completed' ? <Check className='size-3' strokeWidth={3} /> : null}
          </span>

          {/* `after:absolute after:inset-0` biến cả thẻ thành vùng bấm mà không
              phải lồng nút ⋮ vào trong thẻ <a>. */}
          <Link
            href={action.route(project.id)}
            className='text-primary hover:text-primary-strong inline-flex shrink-0 items-center gap-1 text-[13px] font-medium transition-colors after:absolute after:inset-0 after:content-[""]'
          >
            {t(`action.${action.labelKey}`)}
            <ArrowRight className='size-3.5 transition-transform duration-200 group-hover:translate-x-1' />
          </Link>
        </div>
      </div>
    </article>
  )
}
