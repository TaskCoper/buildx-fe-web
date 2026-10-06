'use client'

import { displayProjectId } from '../services/estimate-input.logic'
import { Eye, FileDown, FileText, Info, Link2, Mail, QrCode } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import type { Locale } from '@/i18n/routing'
import { DossierCover, EstimateSheet, Photo, type CoverRow } from '@/shared/components/common'
import { useSiteImage } from '@/shared/cms'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { usePageEntrance } from '@/shared/hooks'
import { formatDisplayDate } from '@/shared/utils'
import { costShares } from '../services/estimate.service'
import type { EstimateResult } from '../types/design.types'

/** Khối THÔNG TIN DỰ ÁN ở đầu trang Bước 3 (mục IV.6). */
export interface DossierProjectInfo {
  customerName: string
  projectName: string
  projectId: string
  phone: string
  address: string
  createdAt: string
  buildingTypeLabel: string
  scaleLabel: string
  /** Tổng diện tích sàn do AI ước tính (m²). */
  floorArea: number
  packageLabel: string
  /** Kiểu kiến trúc & phong cách — MỘT trường gộp (Phụ lục A, trường 7). */
  styleLabel: string
}

interface DossierOverviewProps {
  info: DossierProjectInfo
  /** Kết quả Bước 2 — thẻ "Bảng dự toán chi tiết" phải hiện đúng số của dự án. */
  result: EstimateResult | undefined
  onRender: () => void
  isRendering: boolean
  /** Giữ M07 mounted trong toàn bộ pha render/error/settle để panel phải morph tại chỗ. */
  renderActive?: boolean
  /** Nội dung tiến độ do app layer compose để không tạo import chéo feature. */
  renderContent?: ReactNode
  /** Cẩm nang cá nhân hoá xuất hiện sau khi ba dòng progress đã lần lượt vào. */
  waitingPanel?: ReactNode
  waitingPanelCollapsed?: boolean
}

/** Bốn thành phần của bộ hồ sơ ở khối "Xem trước hồ sơ" (Hình 09). */
const PREVIEW_PARTS = ['cover', 'floorPlan', 'exterior', 'estimate'] as const
type PreviewPart = (typeof PREVIEW_PARTS)[number]

/** Các nút chỉ kích hoạt sau khi render xong (mục IV.6). */
const LOCKED_ACTIONS: readonly { key: 'downloadPdf' | 'shareLink' | 'email' | 'qr'; icon: LucideIcon }[] = [
  { key: 'downloadPdf', icon: FileDown },
  { key: 'shareLink', icon: Link2 },
  { key: 'email', icon: Mail },
  { key: 'qr', icon: QrCode }
]

interface PreviewBodyProps {
  part: PreviewPart
  alt: string
  /** Dữ liệu thật của dự án — thẻ xem trước phải khớp hồ sơ sắp render. */
  cover: { title: string; subtitle: string; rows: CoverRow[] }
  grandTotal: number | undefined
  percents: [number, number, number] | undefined
}

/** Render the real artefact behind each preview card. */
function PreviewBody({ part, alt, cover, grandTotal, percents }: PreviewBodyProps) {
  const exteriorImage = useSiteImage('render.villa')
  // Bản vẽ mẫu của thư viện 2D — admin thay ở màn "Hình ảnh site". Hiện TRỌN
  // khung vì bản vẽ là ảnh dọc: cắt theo khung 4:3 thì mất dòng ghi kích thước.
  const planImage = useSiteImage('plan.garden675x10')

  switch (part) {
    case 'cover':
      return <DossierCover className='aspect-4/3 w-full' project={cover} />
    case 'floorPlan':
      return <Photo className='aspect-4/3 w-full' src={planImage} alt={alt} sizes='240px' fit='contain' />
    case 'exterior':
      return <Photo className='aspect-4/3 w-full' src={exteriorImage} alt={alt} sizes='240px' />
    case 'estimate':
      return <EstimateSheet className='aspect-4/3 w-full' total={grandTotal} percents={percents} />
  }
}

/**
 * Bước 3 — trạng thái CHƯA render (mục IV.6, Hình 09).
 *
 * Cột trái: khối "THÔNG TIN DỰ ÁN" hai cột và khối "Xem trước hồ sơ" gồm 4 thẻ.
 * Cột phải: thẻ "Xuất hồ sơ" với nút chính "Render hồ sơ", 4 nút mờ chờ render,
 * dòng nhắc và badge trạng thái "Chưa render".
 */
export function DossierOverview({
  info,
  result,
  onRender,
  isRendering,
  renderActive = isRendering,
  renderContent,
  waitingPanel,
  waitingPanelCollapsed = false
}: DossierOverviewProps) {
  const t = useTranslations('design.dossier')
  const tProgress = useTranslations('design.progress.dossier')
  const locale = useLocale() as Locale
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`design.${info.projectId}.dossier-overview`, {
    offsetMs: 220,
    // M07 is entered from the estimate result via a client-side click. The
    // same project can be revisited during QA, so session-level "already
    // played" state must not swallow the forward transition. Reload and click
    // now use the same choreography, while the StepProgress remains stable.
    replayOnMount: true
  })
  const [previewing, setPreviewing] = useState<PreviewPart | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewOrigin, setPreviewOrigin] = useState({ x: 0, y: 0 })
  const [launching, setLaunching] = useState(false)
  const [waitingPanelVisible, setWaitingPanelVisible] = useState(false)
  const exportPanelRef = useRef<HTMLElement>(null)

  const showRenderProgress = renderActive && Boolean(renderContent)
  const showWaitingPanel = waitingPanelVisible && Boolean(waitingPanel) && !waitingPanelCollapsed

  useEffect(() => {
    if (!showRenderProgress) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = window.setTimeout(() => setWaitingPanelVisible(true), 0)
      return () => window.clearTimeout(timer)
    }

    // Row 1 → row 2 → row 3 chạy trước; cẩm nang chỉ bước vào sau cùng để
    // chuyển trạng thái M07 → màn chờ có chủ đích, không swap toàn trang ngay.
    const timer = window.setTimeout(() => setWaitingPanelVisible(true), 900)
    return () => window.clearTimeout(timer)
  }, [showRenderProgress])

  // Dưới `lg` thẻ tiến độ nhảy lên đầu khi bấm render (xem `aside` bên dưới) — cuộn tới đó để người
  // dùng đang đứng ở nút "Render" cuối trang không bị bỏ lại giữa hai khối.
  useEffect(() => {
    if (!showRenderProgress) return
    if (!window.matchMedia('(max-width: 1023px)').matches) return
    const frame = window.requestAnimationFrame(() => {
      exportPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [showRenderProgress])

  /** Message keys under `design.dossier.info`. */
  type InfoKey =
    | 'customerName'
    | 'projectName'
    | 'phone'
    | 'address'
    | 'createdAt'
    | 'buildingType'
    | 'scale'
    | 'floorArea'
    | 'package'
    | 'style'

  type InfoRow = { labelKey: InfoKey; value: string }

  // Hai cột cố định theo Hình 09 — không dùng grid tự chảy, vì kiểu đó xếp
  // dòng 1 và dòng 2 cạnh nhau chứ không phải "5 dòng trái, 5 dòng phải".
  const leftRows: InfoRow[] = [
    { labelKey: 'customerName', value: info.customerName },
    { labelKey: 'projectName', value: `${info.projectName} (${displayProjectId(info.projectId)})` },
    { labelKey: 'phone', value: info.phone },
    { labelKey: 'address', value: info.address },
    { labelKey: 'createdAt', value: formatDisplayDate(info.createdAt, locale) }
  ]
  const rightRows: InfoRow[] = [
    { labelKey: 'buildingType', value: info.buildingTypeLabel },
    { labelKey: 'scale', value: info.scaleLabel },
    // Diện tích do AI ước tính ở Bước 2; nếu chưa có vẫn giữ dòng để khối
    // Thông tin dự án không thay đổi cấu trúc giữa các lần tải dữ liệu.
    { labelKey: 'floorArea', value: info.floorArea > 0 ? t('floorAreaValue', { value: info.floorArea }) : '' },
    { labelKey: 'package', value: info.packageLabel },
    { labelKey: 'style', value: info.styleLabel }
  ]

  /**
   * Hình 09 có 5 dòng cố định ở mỗi cột. Không ẩn dòng khi dữ liệu tạm thời
   * chưa có: việc lọc `value` trước đây làm UI "Thông tin dự án" mất mục trong
   * lúc query/store chưa hydrate xong và khiến bố cục khác với bản thiết kế.
   */
  const renderRows = (rows: InfoRow[]) =>
    rows.map((row, index) => (
      <div
        key={row.labelKey}
        data-dossier-info-row
        style={{ '--dossier-info-row-delay': `${index * 120}ms` } as CSSProperties}
        className='flex items-start justify-between gap-4 border-b py-2.5 text-sm'
      >
        <dt data-dossier-info-label className='text-muted-foreground'>
          {t(`info.${row.labelKey}`)}
        </dt>
        <dd data-dossier-info-value className='text-right font-medium'>
          {row.value.trim() || '—'}
        </dd>
      </div>
    ))

  const shares = result ? costShares(result.sections) : null
  const cover = {
    title: info.projectName,
    subtitle: [info.address, displayProjectId(info.projectId)].filter(Boolean).join(' · '),
    rows: [
      { label: t('info.scale'), value: info.scaleLabel },
      { label: t('info.package'), value: info.packageLabel },
      { label: t('info.createdAt'), value: formatDisplayDate(info.createdAt, locale) }
    ].filter((row) => Boolean(row.value))
  }

  return (
    <div
      ref={rootRef}
      data-dossier-overview-root
      data-render-active={showRenderProgress}
      data-waiting-panel-visible={showWaitingPanel}
      data-page-entrance={entranceState}
      style={entranceStyle}
      // Dưới `lg`: một cột co được (`minmax(0,1fr)`), đệm trên 8px cộng `py-4` của stepper = 24px như
      // Bước 1/2 (trước đây `py-6` → 40px).
      className='mx-auto grid w-full max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-5 px-4 pt-5 pb-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8'
    >
      <div className='grid min-w-0'>
        <div data-dossier-overview-left className='col-start-1 row-start-1 space-y-5'>
          <section className='bg-card rounded-2xl border p-5 sm:p-6'>
            <h2 className='text-muted-foreground mb-3 text-xs font-semibold tracking-[0.1em] uppercase'>
              {t('infoTitle')}
            </h2>
            <div className='grid gap-x-10 sm:grid-cols-2'>
              <dl>{renderRows(leftRows)}</dl>
              <dl>{renderRows(rightRows)}</dl>
            </div>
          </section>

          <section className='bg-card rounded-2xl border p-5 sm:p-6'>
            <h2 className='mb-4 font-semibold tracking-tight'>{t('previewTitle')}</h2>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
              {PREVIEW_PARTS.map((key, index) => (
                <figure
                  key={key}
                  data-entrance-step='2'
                  data-entrance-order={index}
                  data-dossier-preview
                  className='bg-card hover:border-primary/40 group flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-md'
                >
                  <PreviewBody
                    part={key}
                    alt={t(`preview.${key}`)}
                    cover={cover}
                    grandTotal={result?.grandTotal}
                    percents={
                      shares
                        ? [
                            shares.find((s) => s.section === 'structure')?.percent ?? 0,
                            shares.find((s) => s.section === 'finishing')?.percent ?? 0,
                            shares.find((s) => s.section === 'interior')?.percent ?? 0
                          ]
                        : undefined
                    }
                  />
                  <figcaption className='mt-auto space-y-1.5 border-t px-3 py-3 text-center'>
                    <span className='block text-[13px] font-medium'>{t(`preview.${key}`)}</span>
                    {/* Hồ sơ chưa render nên chưa có file để mở — liên kết ở đây
                        chỉ báo thành phần nào sẽ có, kích hoạt sau khi render. */}
                    <button
                      type='button'
                      onClick={(event) => {
                        const card = event.currentTarget.closest('figure')
                        const rect = card?.getBoundingClientRect()
                        if (rect) {
                          setPreviewOrigin({
                            x: rect.left + rect.width / 2 - window.innerWidth / 2,
                            y: rect.top + rect.height / 2 - window.innerHeight / 2
                          })
                        }
                        setPreviewing(key)
                        setPreviewOpen(true)
                      }}
                      className='text-muted-foreground/70 hover:text-primary group-hover:text-primary focus-visible:text-primary relative z-10 inline-flex items-center gap-1.5 text-xs transition-colors'
                    >
                      <Eye data-preview-action-icon className='size-3.5' />
                      {t('previewAction')}
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        </div>

        {waitingPanelVisible && waitingPanel ? (
          <div
            data-dossier-waiting-panel
            data-collapsed={waitingPanelCollapsed}
            className='col-start-1 row-start-1 min-w-0'
          >
            {waitingPanel}
          </div>
        ) : null}
      </div>

      {/* Cột PHẢI — thẻ "Xuất hồ sơ" */}
      {/* Dưới `lg` khi ĐANG render: thẻ tiến độ lên ĐẦU, trước cẩm nang — cùng khuôn với Bước 2 (tiến độ
          rồi mới tới cẩm nang tham khảo). Trước đây nó nằm dưới cột trái; cột trái mờ đi nhưng vẫn giữ
          nguyên chiều cao nên tiến độ bị đẩy xuống sau một khoảng trống lớn. */}
      <aside
        ref={exportPanelRef}
        data-entrance-step='3'
        data-entrance-from='right'
        data-dossier-export-panel
        data-rendering={showRenderProgress}
        className={`bg-card h-fit rounded-2xl border p-5 lg:sticky lg:top-32${showRenderProgress ? ' max-lg:order-first max-lg:scroll-mt-36' : ''}`}
      >
        {showRenderProgress ? (
          <div data-dossier-inline-progress>{renderContent}</div>
        ) : (
          <div data-dossier-export-actions className='space-y-3'>
            <h2 className='font-semibold tracking-tight'>{t('exportTitle')}</h2>

            <Button
              data-render-dossier-button
              data-launching={launching}
              size='lg'
              className='h-14 w-full text-base'
              onClick={() => {
                if (launching || isRendering || renderActive) return
                setLaunching(true)
                window.setTimeout(onRender, 320)
              }}
              disabled={isRendering}
            >
              <FileText className='size-5' />
              {t('render')}
            </Button>

            {LOCKED_ACTIONS.map(({ key, icon: Icon }) => (
              <Button
                key={key}
                type='button'
                disabled
                data-locked-action
                variant='outline'
                size='lg'
                className='group relative h-12 w-full cursor-not-allowed overflow-visible disabled:pointer-events-auto disabled:opacity-50 hover:before:opacity-0 focus-visible:border-border focus-visible:ring-0'
              >
                <Icon className='size-4' />
                {t(`actions.${key}`)}
                <span
                  data-locked-hint
                  className='bg-foreground text-background pointer-events-none absolute right-full mr-2 max-w-48 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap opacity-0 shadow-md'
                >
                  {t('lockedHint')}
                </span>
              </Button>
            ))}

            <p className='text-muted-foreground flex items-start gap-2 pt-1 text-sm'>
              <Info className='mt-0.5 size-4 shrink-0' />
              {t('lockedHint')}
            </p>

            <span
              data-render-status-chip
              className='bg-warning/15 text-warning-strong inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-medium transition-[width]'
            >
              {launching ? tProgress('pageTitle') : t('statusPending')}
            </span>
          </div>
        )}
      </aside>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          data-preview-dialog
          style={
            {
              '--dialog-origin-x': `${previewOrigin.x}px`,
              '--dialog-origin-y': `${previewOrigin.y}px`
            } as CSSProperties
          }
          className='sm:max-w-4xl'
        >
          <DialogTitle>{previewing ? t(`preview.${previewing}`) : t('previewTitle')}</DialogTitle>
          {previewing ? (
            <div className='overflow-hidden rounded-xl border'>
              <PreviewBody
                part={previewing}
                alt={t(`preview.${previewing}`)}
                cover={cover}
                grandTotal={result?.grandTotal}
                percents={
                  shares
                    ? [
                        shares.find((s) => s.section === 'structure')?.percent ?? 0,
                        shares.find((s) => s.section === 'finishing')?.percent ?? 0,
                        shares.find((s) => s.section === 'interior')?.percent ?? 0
                      ]
                    : undefined
                }
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
