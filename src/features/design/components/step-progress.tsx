'use client'

import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, Check } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'

import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import { usePageEntrance } from '@/shared/hooks'
import { DESIGN_STEPS, PIPELINE_STEP_HELP_TOPIC, STEP_HELP_TOPIC } from '../constants/design.constants'
import { PIPELINE_STEPS, type PipelineStep, type PipelineStepState } from '../services/pipeline.logic'
import type { DesignStep } from '../types/design.types'
import { HelpLink } from './help-link'

/**
 * Thanh tiến trình (stepper) — cố định trên đầu mọi màn hình của luồng
 * (mục IV.0). Nấc đang làm tô màu thương hiệu, nấc đã xong đánh dấu tích, kèm
 * dòng trạng thái nhỏ bên dưới tên nấc. `title` (tuỳ chọn) là tiêu đề màn hình
 * hiện phía trên thanh, theo Hình 04.
 */
interface StepProgressProps {
  /** Luồng ba bước cũ. Bỏ trống khi dùng `pipeline`. */
  current?: DesignStep
  /**
   * Luồng bốn chặng: năm bước Nhập liệu → Bản vẽ 2D → Dự toán → Phối cảnh 3D → Hồ sơ (TDD-PROJ-006). Trạng thái từng
   * nấc tính từ `GET /stages` (`pipelineStepStates`); nấc chưa mở ghi "Chưa mở".
   */
  pipeline?: { current: PipelineStep; states: Record<PipelineStep, PipelineStepState> }
  /** Tiêu đề màn hình hiện phía trên thanh (Hình 04, 07, 08). */
  title?: string
  /** Dòng phụ dưới tiêu đề — ví dụ địa chỉ · loại nhà · quy mô ở màn kết quả dự toán. */
  subtitle?: ReactNode
  /** Liên kết quay lại (ví dụ danh sách dự án) hiện phía trên tiêu đề. */
  back?: { href: string; label: string }
  /** Explicit previous-step action shown on narrow screens. */
  previousStep?: { href: string; label: string }
  /**
   * Ngày nấc hiện tại xong (ISO). Có thì dòng trạng thái ghi "Hoàn thành ngày …"
   * thay cho "Vừa hoàn thành" (góp ý BuildX: dự toán làm từ nhiều ngày trước).
   */
  currentDoneAt?: string
  /**
   * Nấc đang đứng đã xong việc — nấc đó chuyển sang tích xanh kèm dòng "Vừa
   * hoàn thành" (mục IV.5: màn kết quả dự toán, Hình 08).
   */
  currentDone?: boolean
  /** Project-scoped key keeps Back/revisit lifecycle correct across projects. */
  entranceKey?: string
  /**
   * Bước 3 giữ stepper đứng yên giữa M07 → M08 → M09 và cả khi reload; chỉ
   * nội dung của màn hiện tại được chạy entrance.
   */
  animateEntrance?: boolean
}

/** Một nấc đã tính sẵn trạng thái, dùng chung cho hai luồng. */
interface StepItem {
  step: number
  label: string
  done: boolean
  active: boolean
  /** Nấc của màn đang mở (kể cả khi đã xong) — điều khiển hiệu ứng nối. */
  isCurrent: boolean
  /** Dòng trạng thái nhỏ dưới tên nấc. */
  status: string
  /** Nấc lỗi tô màu cảnh báo thay vì màu thương hiệu. */
  failed?: boolean
}

export function StepProgress({
  current = 1,
  pipeline,
  title,
  subtitle,
  back,
  previousStep,
  currentDoneAt,
  currentDone = false,
  entranceKey,
  animateEntrance = true
}: StepProgressProps) {
  const t = useTranslations('design.steps')
  const locale = useLocale() as Locale
  const { rootRef, entranceState, entranceStyle } = usePageEntrance<HTMLElement>(
    entranceKey ?? `design.step.${current}`,
    { enabled: animateEntrance }
  )

  const items: StepItem[] = pipeline
    ? PIPELINE_STEPS.map((step) => {
        const state = pipeline.states[step]
        return {
          step,
          label: t(`pipeline.${step}`),
          done: state === 'done',
          active: step === pipeline.current && state !== 'done',
          isCurrent: step === pipeline.current,
          failed: state === 'failed',
          status: t(`status.${state === 'current' ? 'current' : state === 'done' ? 'done' : state}`)
        }
      })
    : DESIGN_STEPS.map((step) => {
        const done = step < current || (step === current && currentDone)
        const active = step === current && !currentDone
        return {
          step,
          label: t(`${step}`),
          done,
          active,
          isCurrent: step === current,
          status:
            step === current && currentDone
              ? currentDoneAt
                ? t('status.doneOn', { date: formatDisplayDate(currentDoneAt, locale) })
                : t('status.justDone')
              : t(done ? 'status.done' : active ? 'status.current' : 'status.pending')
        }
      })
  const helpTopic = pipeline ? PIPELINE_STEP_HELP_TOPIC[pipeline.current] : STEP_HELP_TOPIC[current]

  return (
    <>
      {/* Tiêu đề màn hình nằm TRÊN stepper và cuộn theo trang (Hình 04) — đặt
          trong `nav` sticky thì nó sẽ dính luôn, chiếm mất chiều cao. */}
      {title ? (
        <div
          data-page-entrance={entranceState}
          style={entranceStyle}
          // Dưới `lg`: ba khoảng hở của màn Bước 1 bằng nhau = 24px (khoảng phía trên tiêu đề, `pt-6`):
          // header → tiêu đề 24 · tiêu đề → stepper 24 (`pb-2` + `py-4` của nav) · stepper → nội dung 24.
          className='mx-auto w-full max-w-[90rem] px-4 pt-5 lg:pt-6 pb-2 lg:px-8 lg:pb-0'
        >
          {previousStep ? (
            <Link
              href={previousStep.href}
              data-back-navigation
              className='text-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm font-medium transition-colors lg:hidden'
            >
              <ArrowLeft className='size-4' />
              {previousStep.label}
            </Link>
          ) : null}
          {back ? (
            <Link
              href={back.href}
              data-back-navigation
              className='text-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm transition-colors'
            >
              <ArrowLeft className='size-4' />
              {back.label}
            </Link>
          ) : null}
          <h1 data-entrance-step='0' data-entrance-order='1' className='text-2xl font-semibold tracking-tight'>
            {title}
          </h1>
          {subtitle ? (
            <p
              data-entrance-step='0'
              data-entrance-order='1'
              className='text-muted-foreground mt-1 text-sm text-pretty'
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Cùng một container với header, footer và nội dung bên dưới — nút "?" phải
          thẳng hàng mép phải của nội dung, không dán vào mép màn hình. */}
      <nav
        ref={rootRef}
        data-design-step-progress
        data-animate-entrance={animateEntrance}
        data-page-entrance={entranceState}
        style={entranceStyle}
        aria-label={t('label')}
        className='bg-background/85 backdrop-blur-xl'
      >
        <div className='mx-auto w-full max-w-[90rem] px-4 py-4 lg:px-8'>
          {/*
           * Bố cục theo thanh tiến trình trong bản mô tả (Hình S03/S04): vòng
           * tròn nằm TRÊN, nhãn nằm DƯỚI và canh giữa theo vòng tròn, đường nối
           * chạy ngang qua tâm hai vòng liền nhau, ba nấc chia ĐỀU cả chiều
           * rộng. Bản cũ đặt nhãn nằm cạnh vòng tròn nên các nấc so le nhau, cả
           * thanh dồn về trái và chừa một mảng trống bên phải.
           */}
          <div className='bg-card relative rounded-2xl border px-4 py-4 shadow-sm sm:px-6'>
            <ol className='flex items-start'>
              {items.map(({ step, label, done, active, isCurrent, failed, status }, index) => {
                return (
                  <li
                    key={step}
                    data-design-step-item
                    data-entrance-step={animateEntrance ? '0' : undefined}
                    data-entrance-order={animateEntrance ? index + 1 : undefined}
                    data-entrance-from={animateEntrance ? 'soft-scale' : undefined}
                    style={
                      {
                        '--entrance-order-delay': `${index * 220}ms`,
                        zIndex: items.length - index
                      } as CSSProperties
                    }
                    className='relative flex min-w-0 flex-1 flex-col items-center gap-1.5'
                  >
                    {/* Đường nối vẽ bằng nấc SAU, kéo từ tâm nấc trước sang tâm
                        nấc này — cách duy nhất giữ nó luôn đúng giữa hai vòng
                        tròn khi các cột co giãn theo nhau. */}
                    {index > 0 ? (
                      <span
                        aria-hidden
                        data-step-connector
                        data-reached={done || active}
                        className='bg-border absolute top-[1.125rem] -left-1/2 z-0 h-0.5 w-full overflow-hidden rounded-full'
                      >
                        {done || active ? (
                          <span
                            data-step-connector-fill
                            data-current={isCurrent}
                            className='bg-primary absolute inset-0 origin-left rounded-full'
                          />
                        ) : null}
                      </span>
                    ) : null}

                    <span
                      aria-current={active ? 'step' : undefined}
                      data-step-dot
                      data-active={active}
                      data-done={done}
                      className={cn(
                        'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                        done && 'bg-primary text-primary-foreground',
                        active && !failed && 'bg-primary text-primary-foreground',
                        failed && 'bg-destructive text-white',
                        !done && !active && !failed && 'bg-muted text-muted-foreground border'
                      )}
                    >
                      {done ? <Check className='size-4.5' /> : step}
                    </span>

                    <span className='min-w-0 px-2 text-center'>
                      <span
                        className={cn(
                          'block truncate text-sm font-semibold',
                          active ? 'text-primary-strong' : done ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {label}
                      </span>
                      <span
                        className={cn('block truncate text-xs', failed ? 'text-destructive' : 'text-muted-foreground')}
                      >
                        {status}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>

            {/* Nút "?" mở đúng video hướng dẫn của bước đang làm. Đặt tuyệt đối
                ở góc phải để không chiếm một cột trong lưới chia đều. */}
            <HelpLink topic={helpTopic} className='absolute top-3 right-3 shrink-0' />
          </div>
        </div>
      </nav>
    </>
  )
}
