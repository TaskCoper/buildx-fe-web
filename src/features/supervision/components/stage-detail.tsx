'use client'

import { CheckCircle2, FileText, History, ImageIcon, MessageSquare, Send, Upload } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'
import { formatDayMonth, formatDisplayDate, formatDisplayDateTime } from '@/shared/utils'
import { useStageLabel } from '../hooks/use-stage-label'
import { useStageActions } from '../hooks/use-supervision'
import { canUpload, daysUntil, isLocked, stageConfirmDrift, stageVersions } from '../services/supervision.service'
import type { StageFile, SupervisionStage } from '../types/supervision.types'
import { ChangeRequestDialog } from './change-request-dialog'

interface StageDetailProps {
  projectId: string
  stage: SupervisionStage
  onUpload: () => void
}

/**
 * Chi tiết một giai đoạn — cùng một component phục vụ cả bốn trạng thái của bản
 * mô tả:
 *
 * - đang thực hiện (S20): có nút tải hồ sơ, ô gửi nhận xét, chưa có kết quả kiểm tra;
 * - sắp tới (S21): khối "chưa đến giai đoạn này" + gợi ý chuẩn bị, không cho tải;
 * - đã xác nhận có CR chờ khách duyệt (S22): banner duyệt, hồ sơ khóa;
 * - đã xác nhận sau CR (S23): banner khóa ở v2, có nút gửi yêu cầu sửa đổi.
 *
 * Bốn màn của bản mô tả là bốn TRẠNG THÁI dữ liệu, không phải bốn bố cục — dựng
 * rời ra là cách chắc chắn để chúng trôi khỏi nhau sau vài lần sửa.
 */
/** Nhãn vai trò Giám sát trên ảnh đại diện — trùng với `role` của nhận xét. */
const ROLE_SUPERVISOR = 'GS'

export function StageDetail({ projectId, stage, onUpload }: StageDetailProps) {
  const t = useTranslations('supervision.dashboard.stage')
  const locale = useLocale() as Locale
  const tStages = useStageLabel()
  const tChange = useTranslations('supervision.dashboard.change')
  const tStatus = useTranslations('supervision.dashboard.status')

  const { comment, requestChange } = useStageActions(projectId)
  const [draft, setDraft] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)

  const locked = isLocked(stage)
  const pending = stage.changeRequests.find((request) => request.status === 'pending')
  const pendingForCustomer = pending?.by === 'GS' ? pending : undefined
  /** Yêu cầu sửa đổi đã ngã ngũ — chỉ những cái này mới hiện thành bản ghi. */
  const settledRequests = stage.changeRequests.filter((request) => request.status !== 'pending')

  const sendComment = () => {
    if (!draft.trim()) return
    comment.mutate(
      { stageKey: stage.key, text: draft.trim() },
      {
        onSuccess: () => {
          setDraft('')
          toast.success(t('commentSent'))
        }
      }
    )
  }

  const confirmDrift = stageConfirmDrift(stage)
  const versions = stageVersions(stage)
  /** Số ngày theo lịch của giai đoạn — Hình S21 in kèm khoảng ngày. */
  const plannedDays = Math.max(
    1,
    Math.round((new Date(stage.plannedEnd).getTime() - new Date(stage.plannedStart).getTime()) / (24 * 60 * 60 * 1000))
  )

  return (
    // Không tự bọc thẻ: khung này nằm sẵn trong thẻ chung của bảng điều khiển,
    // thêm một lớp viền nữa thành thẻ lồng thẻ.
    <div className='space-y-6 p-5'>
      <header className='space-y-2'>
        {/* Số thứ tự và tên giai đoạn nằm CÙNG một dòng, đúng Hình S21. */}
        <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
          <p className='text-muted-foreground font-mono text-xs'>{t('heading', { index: stage.index })}</p>
          <h2 className='text-xl font-semibold tracking-tight'>{tStages(stage.key)}</h2>
        </div>

        <div className='flex flex-wrap items-center gap-2 text-xs'>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 font-medium',
              stage.status === 'confirmed' && 'bg-primary/10 text-primary-strong',
              stage.status === 'inProgress' && 'bg-warning/20 text-warning-strong',
              stage.status === 'upcoming' && 'bg-muted text-muted-foreground'
            )}
          >
            {tStatus(stage.status)}
          </span>
          {/* Thứ tự đúng Hình S22: trạng thái → mốc xác nhận → phiên bản →
              yêu cầu sửa đổi → lịch kế hoạch. Mốc xác nhận cũng là VIÊN NHÃN
              nền xanh chứ không phải chữ trần. */}
          {confirmDrift ? (
            <span className='bg-primary/10 text-primary-strong rounded-md px-2 py-0.5 font-medium'>
              {t(confirmDrift.early ? 'confirmedEarly' : 'confirmedLate', {
                date: formatDayMonth(confirmDrift.date),
                days: confirmDrift.days
              })}
            </span>
          ) : null}
          {/* Giai đoạn chưa bắt đầu thì chưa có tệp nào, chip phiên bản
              không mang thông tin gì — Hình S21 thay nó bằng mốc bắt đầu. */}
          {stage.status === 'upcoming' ? (
            <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 font-medium'>
              {t('startsIn', { days: Math.max(0, daysUntil(stage.plannedStart)) })}
            </span>
          ) : (
            <span className='bg-primary/10 text-primary-strong rounded-md px-2 py-0.5 font-medium'>
              {stage.version}
            </span>
          )}
          {pendingForCustomer ? (
            <span className='bg-warning/20 text-warning-strong rounded-md px-2 py-0.5 font-medium'>
              {tChange('pendingBadge', { code: pendingForCustomer.id })}
            </span>
          ) : null}
          <span className='text-muted-foreground'>
            {t('planned', {
              start: formatDisplayDate(stage.plannedStart, locale),
              end: formatDisplayDate(stage.plannedEnd, locale),
              days: plannedDays
            })}
          </span>
          {stage.actualStart ? (
            <span className='text-muted-foreground'>
              {t('actualStart', { date: formatDayMonth(stage.actualStart) })}
            </span>
          ) : null}
        </div>
      </header>

      {/* Giai đoạn sắp tới (S21): không có gì để làm, nói rõ vì sao và khi nào. */}
      {stage.status === 'upcoming' ? (
        <section className='bg-muted/40 rounded-xl border border-dashed p-4'>
          <p className='font-medium'>{t('upcomingTitle')}</p>
          <p className='text-muted-foreground mt-1 text-sm text-pretty'>
            {t('upcomingBody', {
              date: formatDisplayDate(stage.plannedStart, locale),
              days: Math.max(0, daysUntil(stage.plannedStart)),
              previous: stage.index - 1
            })}
          </p>
          {stage.prepHint ? (
            <p className='text-muted-foreground mt-2 text-sm text-pretty'>{t('prepHint', { hint: stage.prepHint })}</p>
          ) : null}
        </section>
      ) : null}

      {/* Yêu cầu sửa đổi của Giám sát đang chờ khách duyệt (S22). */}
      {pendingForCustomer ? (
        <section className='border-brand-orange/40 bg-brand-orange-soft flex flex-wrap items-center gap-4 rounded-xl border p-4'>
          {/* Một đoạn liền, không tách tiêu đề — đúng Hình S22. */}
          <p className='min-w-0 flex-1 text-sm text-pretty'>
            {tChange.rich('banner', {
              code: pendingForCustomer.id,
              due: pendingForCustomer.dueAt ? formatDisplayDate(pendingForCustomer.dueAt, locale) : '—',
              version: stage.version,
              b: (chunks) => <b className='font-semibold'>{chunks}</b>
            })}
          </p>
          <Button className='brand-orange-button text-brand-orange-foreground' onClick={() => setChangeOpen(true)}>
            {tChange('review')}
          </Button>
        </section>
      ) : null}

      {/* Hồ sơ đã khóa (S23). Khi đang có yêu cầu sửa đổi chờ khách duyệt thì
          KHÔNG dựng: banner cam ngay trên đã nói đúng việc cần làm, thêm hộp này
          là nói hai lần cùng một chuyện (Hình S22 chỉ có banner).

          Nút "Yêu cầu sửa đổi" đứng RIÊNG một hàng phía trên banner, tô cam —
          đúng Hình S23. Nhét nó vào trong banner như bản trước làm câu chữ giải
          thích và nút hành động chen nhau trên cùng một dòng. */}
      {locked && stage.inspection && !pendingForCustomer ? (
        <div className='space-y-4'>
          <Button className='brand-orange-button text-brand-orange-foreground' onClick={() => setChangeOpen(true)}>
            {t('requestChange')}
          </Button>

          <section className='border-primary/30 bg-primary/5 rounded-xl border p-4'>
            <p className='text-sm text-pretty'>
              {t.rich('lockedNotice', {
                date: formatDisplayDateTime(stage.inspection.confirmedAt, locale),
                version: stage.version,
                b: (chunks) => <b className='font-semibold'>{chunks}</b>
              })}
            </p>
          </section>
        </div>
      ) : null}

      {/* Đang thực hiện (S20): tải hồ sơ để hoàn thành giai đoạn. */}
      {canUpload(stage) ? (
        <section className='border-primary/40 bg-accent/30 flex flex-wrap items-center gap-4 rounded-xl border p-4'>
          <p className='text-muted-foreground min-w-0 flex-1 text-sm text-pretty'>{t('uploadHint')}</p>
          <Button onClick={onUpload}>
            <Upload className='size-4' />
            {t('uploadCta')}
          </Button>
        </section>
      ) : null}

      {/* Ảnh & tài liệu */}
      {/* Giai đoạn chưa tới thì KHÔNG dựng khối tệp và khối kiểm tra: Hình S21
          đi thẳng từ hộp "Chưa đến giai đoạn này" xuống lịch sử. Bày ra hai khối
          rỗng chỉ làm khách tưởng mình còn việc phải làm. */}
      <section hidden={stage.status === 'upcoming'}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 className='flex items-center gap-2 text-sm font-semibold'>
            <ImageIcon className='text-primary size-4' />
            {t('filesTitle')}
            <span className='text-muted-foreground font-normal'>{stage.files.length}</span>
          </h3>
          {locked ? (
            <span className='text-muted-foreground text-xs'>{t('filesLocked', { version: stage.version })}</span>
          ) : null}
        </div>

        {stage.files.length === 0 ? (
          <p className='text-muted-foreground mt-3 text-sm'>{t('noFiles')}</p>
        ) : (
          <ul className='mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5'>
            {stage.files.map((file) => (
              <StageFileCard key={file.id} file={file} />
            ))}
          </ul>
        )}
      </section>

      {/* Nhận xét & trao đổi — mục S21 của bản mô tả chỉ liệt kê tag, lịch kế
          hoạch, khối "Chưa đến giai đoạn này" và Lịch sử, nên giai đoạn chưa
          tới KHÔNG dựng khối này (S20/S22/S23 vẫn có). */}
      <section hidden={stage.status === 'upcoming'}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 className='flex items-center gap-2 text-sm font-semibold'>
            <MessageSquare className='text-primary size-4' />
            {t('commentsTitle')}
            <span className='text-muted-foreground font-normal'>{stage.comments.length}</span>
          </h3>
          {locked ? <span className='text-muted-foreground text-xs'>{t('commentsLocked')}</span> : null}
        </div>

        <ul className='mt-3 space-y-3'>
          {stage.comments.map((item) => (
            <li key={item.id} className='flex gap-3'>
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full max-md:text-xs text-[11px] font-semibold',
                  item.role === 'GS' ? 'bg-warning/20 text-warning-strong' : 'bg-accent text-primary-strong'
                )}
              >
                {item.role}
              </span>
              <div className='min-w-0 flex-1'>
                <p className='text-muted-foreground text-xs'>
                  <span className='text-foreground font-medium'>{item.author}</span> ·{' '}
                  {formatDisplayDateTime(item.at, locale)}
                  {item.changeRequestId ? (
                    <span className='bg-warning/20 text-warning-strong ml-2 rounded px-1.5 py-0.5 max-md:text-xs text-[10px] font-medium'>
                      {item.changeRequestId}
                    </span>
                  ) : null}
                </p>
                <p className='bg-muted/50 mt-1 rounded-lg px-3 py-2 text-sm text-pretty'>{item.text}</p>
              </div>
            </li>
          ))}
        </ul>

        {locked ? null : (
          <div className='mt-3 flex flex-wrap items-end gap-2'>
            <Textarea
              rows={2}
              value={draft}
              placeholder={t('commentPlaceholder')}
              onChange={(event) => setDraft(event.target.value)}
              className='min-w-0 flex-1'
            />
            <Button onClick={sendComment} disabled={!draft.trim() || comment.isPending}>
              <Send className='size-4' />
              {t('commentSend')}
            </Button>
          </div>
        )}
      </section>

      {/* Kết quả kiểm tra của Giám sát — giai đoạn chưa tới thì chưa có gì để
          kiểm tra, Hình S21 không vẽ khối này. */}
      <section hidden={stage.status === 'upcoming'}>
        <h3 className='flex items-center gap-2 text-sm font-semibold'>
          <CheckCircle2 className='text-primary size-4' />
          {t('inspectionTitle')}
        </h3>

        {stage.inspection ? (
          <div className='border-primary/30 bg-accent/30 mt-3 flex gap-3 rounded-xl border p-4'>
            {/* Cùng kiểu ảnh đại diện với khối "Nhận xét & trao đổi": đây cũng
                là lời của Giám sát, để trần không có avatar thì hai khối kề nhau
                trông như hai loại nội dung khác hẳn. */}
            <span
              aria-hidden
              className='bg-warning/20 text-warning-strong flex size-8 shrink-0 items-center justify-center rounded-full max-md:text-xs text-[11px] font-semibold'
            >
              {ROLE_SUPERVISOR}
            </span>
            <div className='min-w-0 flex-1'>
              <p className='text-primary-strong text-xs font-medium'>
                {tStatus('confirmed')} · {formatDisplayDateTime(stage.inspection.confirmedAt, locale)} ·{' '}
                {stage.inspection.engineer}
                {stage.inspection.onSite ? ` · ${t('inspectionVisited')}` : ''}
              </p>
              <p className='mt-1.5 text-sm text-pretty'>{stage.inspection.note}</p>
            </div>
          </div>
        ) : (
          <div className='mt-3 rounded-xl border border-dashed p-4 text-center'>
            <p className='font-medium'>{t('inspectionEmpty')}</p>
            <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('inspectionEmptyBody')}</p>
          </div>
        )}
      </section>

      {/* Lịch sử & phiên bản */}
      <section>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 className='flex items-center gap-2 text-sm font-semibold'>
            <History className='text-primary size-4' />
            {t('historyTitle')}
            <span className='text-muted-foreground font-normal'>
              {t('eventCount', { count: stage.history.length })}
            </span>
          </h3>
          <span className='text-muted-foreground text-xs'>{t('historyNote')}</span>
        </div>

        {/* Bản mô tả: khối lịch sử mở đầu bằng hàng chip phiên bản "v1 · 02/08",
            "v2 · 03/08" để thấy hồ sơ đã qua mấy lần khóa. */}
        {versions.length > 0 ? (
          <ul className='mt-3 flex flex-wrap items-center gap-2'>
            {versions.map((item) => (
              <li
                key={item.version}
                className='bg-primary/10 text-primary-strong rounded-md px-2 py-0.5 text-xs font-medium'
              >
                {item.version} · {formatDisplayDateTime(item.at, locale)}
              </li>
            ))}
          </ul>
        ) : null}

        <ol className='mt-3 space-y-2'>
          {[...stage.history]
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .map((item) => (
              <li key={item.id} className='flex items-start gap-3 text-xs'>
                <span
                  aria-hidden
                  className={cn(
                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                    item.milestone ? 'bg-primary' : 'bg-muted-foreground/40'
                  )}
                />
                <span className='text-muted-foreground font-mono'>{formatDisplayDateTime(item.at, locale)}</span>
                <span className='bg-muted rounded px-1.5 py-0.5 font-medium'>{item.actor}</span>
                <span className={cn('min-w-0 flex-1 text-pretty', item.milestone && 'font-medium')}>{item.text}</span>
              </li>
            ))}
        </ol>

        {/* Bản ghi yêu cầu sửa đổi thuộc về S23 ("Bản ghi CR-01: người đề
            xuất, thời điểm, Đã áp dụng → v2, lý do, phản hồi"). Cái đang CHỜ
            khách duyệt thì không dựng ở đây — S22 chỉ có banner + nút "Xem &
            duyệt", nội dung đầy đủ nằm trong hộp thoại đó. */}
        {settledRequests.length > 0 ? (
          <ul className='mt-4 space-y-2'>
            {settledRequests.map((request) => (
              <li key={request.id} className='rounded-xl border p-3'>
                <p className='flex flex-wrap items-center gap-2 text-xs'>
                  <span className='font-mono font-medium'>{request.id}</span>
                  <span className='bg-muted rounded px-1.5 py-0.5'>{request.by}</span>
                  <span className='text-muted-foreground'>{formatDisplayDateTime(request.proposedAt, locale)}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-medium',
                      request.status === 'applied' && 'bg-primary/10 text-primary-strong',
                      request.status === 'pending' && 'bg-warning/20 text-warning-strong',
                      request.status === 'rejected' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {request.status === 'applied'
                      ? tChange('applied', { version: request.resultVersion ?? stage.version })
                      : request.status === 'pending'
                        ? tChange('pendingState')
                        : tChange('rejectedState')}
                  </span>
                </p>
                <p className='text-muted-foreground mt-1.5 text-xs text-pretty'>
                  {tChange('reason')}: {request.reason}
                </p>
                {request.response ? (
                  <p className='text-muted-foreground mt-1 text-xs text-pretty'>
                    {tChange('response')}: {request.response}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <ChangeRequestDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        projectId={projectId}
        stage={stage}
        pending={pendingForCustomer}
        onSubmitted={() => setChangeOpen(false)}
        submitting={requestChange.isPending}
      />
    </div>
  )
}

/** Một ô ảnh/tài liệu trong khối "Ảnh & tài liệu". */
function StageFileCard({ file }: { file: StageFile }) {
  const t = useTranslations('supervision.dashboard.stage')
  const locale = useLocale() as Locale

  return (
    <li className='overflow-hidden rounded-xl border'>
      <div className='bg-muted text-muted-foreground/50 relative flex aspect-[4/3] items-center justify-center'>
        {file.kind === 'photo' ? (
          <ImageIcon className='size-8' strokeWidth={1.25} />
        ) : (
          <FileText className='size-8' strokeWidth={1.25} />
        )}
        <span
          className={cn(
            'absolute top-2 left-2 rounded px-1.5 py-0.5 max-md:text-xs text-[10px] font-semibold',
            file.by === 'GS' ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground'
          )}
        >
          {file.by}
        </span>
      </div>

      <div className='space-y-1 p-3'>
        <p className='text-sm text-pretty'>{file.name}</p>
        <p className='text-muted-foreground max-md:text-xs text-[11px]'>
          {formatDisplayDateTime(file.capturedAt ?? file.uploadedAt, locale)}
        </p>
        <div className='flex flex-wrap gap-1.5'>
          {file.fromInspection ? (
            <span className='bg-warning/20 text-warning-strong rounded px-1.5 py-0.5 max-md:text-xs text-[10px] font-medium'>
              {t('fileTagInspection')}
            </span>
          ) : null}
          {file.addedInVersion ? (
            <span className='bg-accent text-primary-strong rounded px-1.5 py-0.5 max-md:text-xs text-[10px] font-medium'>
              {t('fileTagAddedIn', { version: file.addedInVersion })}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  )
}
