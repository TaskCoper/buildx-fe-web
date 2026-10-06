'use client'

import { ArrowRight, Check, Download, Link2, Mail, MessageCircle, Phone, QrCode, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { useRouter } from '@/i18n/navigation'
import { siteConfig } from '@/shared/config/site'
import { EstimateSheet, HotlineLink, Photo, PlanDrawing, ProjectReadyOptionsDialog } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { useSiteImage } from '@/shared/cms'
import { useMounted, usePageEntrance } from '@/shared/hooks'
import { canShowReadyProjectPopup, cn } from '@/shared/lib'
import { formatNumber } from '@/shared/utils'
import { ROUTES, contractorMatchesRoute, shareRoute } from '@/shared/constants/routes'
import { useDownloadDossier } from '../hooks/use-download-dossier'
import { costShares } from '../services/estimate.service'
import type { Dossier, EstimateResult } from '../types/design.types'
import type { DossierProjectInfo } from './dossier-overview'
import { estimateGenerationApi } from '../api/estimate-generation.api'
import { ResultImage } from './result-image'
import { DossierShareDialog, type EmailOutcome, type ShareMode } from './dossier-share-dialog'

interface DossierReadyProps {
  dossier: Dossier
  /** Kết quả Bước 2 — nguồn của bảng dự toán in trong hồ sơ PDF. */
  result: EstimateResult | undefined
  info: DossierProjectInfo
  /** Đoạn văn tư vấn ở Bước 2, in kèm vào hồ sơ. */
  advisory: string[]
  /** Gọi khi cần token chia sẻ mà `dossier.shareToken` còn trống. */
  onRequestShareLink: () => void
  onSendEmail: (email: string) => Promise<EmailOutcome>
  /** Dự toán THẬT: tạo link theo ngày chủ bản chọn, thu hồi link. Bỏ trống = dự án mock. */
  onCreateLink?: (expiryDate: string) => Promise<void>
  onRevokeLink?: () => Promise<void>
  /** Chỉ true khi render vừa hoàn tất trong phiên hiện tại; project cũ mở lại giữ final state. */
  animateCompletion?: boolean
  fromRender?: boolean
  filesEntering?: boolean
  onFilesEntered?: () => void
}

/**
 * Bốn tệp của bộ hồ sơ (mục IV.8, Hình 11). Danh mục chốt theo mục XII.1 —
 * mục đó chưa có trong bản v2.0 nên tạm giữ đúng thứ tự và tên trong Hình 11.
 */
const FILES = [
  { key: 'exterior', kind: 'pdf' },
  { key: 'architecture', kind: 'pdf' },
  { key: 'structure', kind: 'pdf' },
  { key: 'estimate', kind: 'xlsx' }
] as const

type FileKey = (typeof FILES)[number]['key']

/**
 * Bước 3 — trạng thái ĐÃ render xong (mục IV.8, Hình 11).
 *
 * Dấu tích lớn + lời cảm ơn, rồi hai cột: "Tệp hồ sơ" (lưới 4 thẻ tệp kèm dòng
 * bảo mật) và "Tải xuống & chia sẻ". Cuối trang là dải chuyển đổi liên hệ KTS.
 */
export function DossierReady({
  dossier,
  result,
  info,
  advisory,
  onRequestShareLink,
  onSendEmail,
  onCreateLink,
  onRevokeLink,
  animateCompletion = false,
  fromRender = false,
  filesEntering = false,
  onFilesEntered
}: DossierReadyProps) {
  const t = useTranslations('design.dossier')
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced && filesEntering) onFilesEntered?.()
  }, [filesEntering, onFilesEntered, reduced])
  // Ảnh phối cảnh mẫu — admin thay ở màn "Hình ảnh site".
  const exteriorImage = useSiteImage('render.villa')
  // Bản vẽ mặt bằng mẫu, cùng nguồn với thẻ xem trước ở màn chưa render.
  const planImage = useSiteImage('plan.garden675x10')
  const locale = useLocale() as Locale
  const router = useRouter()
  const { contact } = siteConfig
  const [shareMode, setShareMode] = useState<ShareMode>(null)
  const [linkExpanded, setLinkExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [celebrate] = useState(() => animateCompletion || fromRender || filesEntering)
  const [dialogOrigin, setDialogOrigin] = useState({ x: 0, y: 0 })
  const pdf = useDownloadDossier({ dossier, result, info, advisory })
  const mounted = useMounted()
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`design.${info.projectId}.dossier-ready`, {
    // M09 dùng cùng một choreography cho mọi đường vào. Riêng success mark vẫn
    // được `celebrate` gate để reload/mở hồ sơ cũ không vẽ lại vòng + tick.
    replayOnMount: true,
    offsetMs: 220,
    settleAfterMs: 3100
  })

  const sizeMb = pdf.size ? formatNumber(pdf.size / 1_000_000, locale, { maximumFractionDigits: 1 }) : null
  // Link do BE cấp (dự toán thật) dùng nguyên; chỉ dự án mock mới tự dựng từ token.
  const shareUrl =
    dossier.shareUrl ??
    (dossier.shareToken && mounted ? `${window.location.origin}/${locale}${shareRoute(dossier.shareToken)}` : '')

  const shares = result ? costShares(result.sections) : null

  useEffect(() => {
    if (animateCompletion) sessionStorage.setItem('savico.just-completed-project', info.projectId)
  }, [animateCompletion, info.projectId])

  // Popup 2/3: nhánh A gặp nhánh B tại mốc "Dự án sẵn sàng".
  // QA mode ở shared/constants bỏ suppression để có thể F5 và test lặp lại.
  useEffect(() => {
    if (shareMode || !canShowReadyProjectPopup(info.projectId)) return
    const timer = window.setTimeout(() => setOptionsOpen(true), 1_500)
    return () => window.clearTimeout(timer)
  }, [info.projectId, shareMode])

  // Header/account menu nằm ngoài feature này. Chặn riêng link quay về /design
  // để M09 có một exit slide-right ngắn trước khi route bị unmount; các link
  // khác vẫn điều hướng bình thường.
  useEffect(() => {
    const handleDesignReturn = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        leaving
      )
        return

      const element = event.target instanceof Element ? event.target.closest('a') : null
      if (!(element instanceof HTMLAnchorElement) || element.target === '_blank' || element.hasAttribute('download'))
        return

      const url = new URL(element.href, window.location.href)
      const localPath = url.pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/'
      if (localPath !== ROUTES.DESIGN) return

      event.preventDefault()
      sessionStorage.setItem('savico.just-completed-project', info.projectId)
      setLeaving(true)
      window.setTimeout(() => router.push(ROUTES.DESIGN), reduced ? 0 : 320)
    }

    document.addEventListener('click', handleDesignReturn, true)
    return () => document.removeEventListener('click', handleDesignReturn, true)
  }, [info.projectId, leaving, locale, reduced, router])
  const percents: [number, number, number] | undefined = shares
    ? [
        shares.find((s) => s.section === 'structure')?.percent ?? 0,
        shares.find((s) => s.section === 'finishing')?.percent ?? 0,
        shares.find((s) => s.section === 'interior')?.percent ?? 0
      ]
    : undefined

  /** Ảnh thu nhỏ của từng tệp — dùng lại chính artefact mà hồ sơ chứa. */
  function thumbnail(key: FileKey) {
    switch (key) {
      case 'exterior': {
        // Dự toán thật: ảnh phối cảnh (hoặc ảnh bìa) do AI tạo; dự án mock dùng ảnh mẫu của site.
        const real = dossier.images?.perspective ?? dossier.images?.cover
        return real ? (
          <ResultImage className='size-full' src={real} alt={t(`files.${key}`)} />
        ) : (
          <Photo className='size-full' src={exteriorImage} alt={t(`files.${key}`)} sizes='140px' />
        )
      }
      case 'architecture':
        return dossier.images?.floorPlan ? (
          <ResultImage className='size-full' src={dossier.images.floorPlan} alt={t(`files.${key}`)} fit='contain' />
        ) : (
          <Photo className='size-full' src={planImage} alt={t(`files.${key}`)} sizes='140px' fit='contain' />
        )
      case 'structure':
        // Chưa có bản vẽ kết cấu riêng nên tạm dùng lại nét vẽ kỹ thuật — đúng
        // thể loại hơn là mượn trang bìa. Backend sẽ trả thumbnail thật.
        return <PlanDrawing className='size-full' />
      case 'estimate':
        return <EstimateSheet className='size-full' total={result?.grandTotal} percents={percents} />
    }
  }

  function openShare(mode: Exclude<ShareMode, null>, trigger?: HTMLElement) {
    if (!onCreateLink && !dossier.shareToken && !dossier.shareUrl) onRequestShareLink()
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      setDialogOrigin({
        x: rect.left + rect.width / 2 - window.innerWidth / 2,
        y: rect.top + rect.height / 2 - window.innerHeight / 2
      })
    }
    setShareMode(mode)
  }

  async function downloadPdf() {
    try {
      await pdf.download()
      setDownloaded(true)
      window.setTimeout(() => setDownloaded(false), 900)
    } catch {
      toast.error(t('exportError'))
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      data-dossier-ready
      data-celebrating={celebrate}
      data-dossier-handoff={fromRender}
      data-files-entering={filesEntering}
      data-m09-leaving={leaving}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] space-y-5 px-4 py-5 lg:px-8'
    >
      <header className='space-y-3 text-center'>
        <motion.span
          data-entrance-step={celebrate ? '0' : undefined}
          data-entrance-from={celebrate ? 'soft-scale' : undefined}
          data-dossier-success-circle
          className='bg-primary text-primary-foreground relative mx-auto flex size-14 items-center justify-center rounded-full'
        >
          <svg
            data-dossier-success-ring
            viewBox='0 0 56 56'
            className='text-primary pointer-events-none absolute inset-0 size-full -rotate-90'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
            aria-hidden
          >
            <circle cx='28' cy='28' r='25.5' pathLength='1' />
          </svg>
          <svg
            data-dossier-success-check
            viewBox='0 0 24 24'
            className='size-7'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden
          >
            {/* Path order is intentional: draw the short down-stroke first,
                then the long up-stroke. Lucide's Check path is reversed for
                stroke-dash animation, which made the tick look backwards. */}
            <path d='M4 12 L9 17 L20 6' />
          </svg>
        </motion.span>
        <h1 data-entrance-step='1' className='text-2xl font-semibold tracking-tight text-balance sm:text-3xl'>
          {t('readyTitle')}
        </h1>
        <p data-entrance-step='1' data-entrance-order='1' className='text-muted-foreground text-pretty'>
          {t('readyThanks')}
        </p>
      </header>

      <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        {/* Cột TRÁI — Tệp hồ sơ */}
        <section data-entrance-step='2' className='bg-card rounded-2xl border p-5'>
          <h2 className='mb-4 font-semibold tracking-tight'>{t('filesTitle')}</h2>

          <ul className='grid gap-4 sm:grid-cols-2'>
            {FILES.map(({ key, kind }, index) => (
              <motion.li
                key={key}
                data-dossier-file-card
                initial={!reduced ? { opacity: 0, y: -30, scale: 0.96 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: reduced ? 0 : 0.62,
                  delay: reduced ? 0 : 1.12 + index * 0.18,
                  ease: [0.22, 1, 0.36, 1]
                }}
                onAnimationComplete={index === FILES.length - 1 && filesEntering ? onFilesEntered : undefined}
                className='group/file flex gap-3 rounded-xl border p-3'
              >
                <motion.span
                  data-file-thumbnail
                  className='bg-muted size-24 shrink-0 overflow-hidden rounded-lg'
                  initial={!reduced ? { opacity: 0.4, filter: 'blur(10px)' } : false}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{
                    duration: reduced ? 0 : 0.5,
                    delay: reduced ? 0 : 1.24 + index * 0.18,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                >
                  {thumbnail(key)}
                </motion.span>

                <div className='flex min-w-0 flex-col gap-1'>
                  <div className='flex items-start gap-2'>
                    <span
                      data-file-kind
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 max-md:text-xs text-[10px] font-semibold text-white transition-[font-weight]',
                        kind === 'pdf' ? 'bg-destructive' : 'bg-primary'
                      )}
                    >
                      {kind.toUpperCase()}
                    </span>
                    <span className='text-[13px] leading-snug font-semibold'>
                      {String(index + 1).padStart(2, '0')}. {t(`files.${key}`)}
                    </span>
                  </div>

                  {/* Số trang và dung lượng do backend trả khi có file thật —
                      mock chưa dựng file nên chỉ nêu định dạng, không bịa số. */}
                  <span className='text-muted-foreground text-xs'>{kind.toUpperCase()}</span>

                  <span className='text-primary mt-auto inline-flex items-center gap-1 text-xs font-medium'>
                    {t('previewAction')}
                    <ArrowRight className='size-3' />
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>

          <p className='bg-muted/50 text-muted-foreground mt-4 flex items-center gap-2 rounded-xl p-3 text-sm'>
            <ShieldCheck className='text-primary size-4 shrink-0' />
            {t('privacyNote')}
          </p>
        </section>

        {/* Cột PHẢI — Tải xuống & chia sẻ */}
        <aside
          inert={filesEntering}
          data-entrance-step='3'
          data-entrance-from='right'
          className='bg-card h-fit space-y-3 rounded-2xl border p-5'
        >
          <h2 className='font-semibold tracking-tight'>{t('downloadTitle')}</h2>

          <Button
            data-dossier-pdf
            data-entrance-step='3'
            data-entrance-order='1'
            size='lg'
            className='h-12 w-full overflow-hidden'
            onClick={() => void downloadPdf()}
            disabled={pdf.isPending}
          >
            {pdf.isPending ? (
              <Download data-download-arrow className='size-4' />
            ) : downloaded ? (
              <Check data-download-complete className='size-4' />
            ) : (
              <Download className='size-4' />
            )}
            {/* Hình 11: "Tải hồ sơ PDF ~46 MB" — cỡ nằm cùng dòng, cùng cỡ chữ,
                dấu "~" báo đây là số ước tính cho tới khi file được dựng. */}
            {t('actions.downloadPdf')}
            {sizeMb && !pdf.isPending ? <span>{t('pdfSize', { size: sizeMb })}</span> : null}
          </Button>

          {linkExpanded ? (
            <div data-share-link-expanded className='flex items-center gap-2'>
              <Input
                readOnly
                value={shareUrl || t('share.preparing')}
                className='min-w-0 font-mono text-xs'
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                className={cn(
                  'h-9 shrink-0 overflow-hidden transition-[width,padding] duration-200',
                  copied ? 'w-20 px-2' : 'w-9 px-0'
                )}
                onClick={() => void copyShareLink()}
                disabled={!shareUrl}
                aria-label={t('share.link.copy')}
              >
                {copied ? (
                  <span data-copied-label className='text-primary text-xs font-semibold whitespace-nowrap'>
                    {t('share.link.copied')}
                  </span>
                ) : (
                  <Link2 className='size-4' />
                )}
              </Button>
            </div>
          ) : (
            <Button
              size='lg'
              variant='outline'
              className='h-12 w-full'
              onClick={(event) => {
                // Dự toán thật chưa có link: hỏi ngày hết hạn trong cửa sổ chia sẻ thay vì tạo ngầm.
                if (onCreateLink && !dossier.shareUrl) {
                  openShare('link', event.currentTarget)
                  return
                }
                if (!dossier.shareToken && !dossier.shareUrl) onRequestShareLink()
                setLinkExpanded(true)
              }}
            >
              <Link2 className='size-4' />
              {t('actions.shareLink')}
            </Button>
          )}
          <Button
            size='lg'
            variant='outline'
            className='h-12 w-full'
            onClick={(event) => openShare('email', event.currentTarget)}
          >
            <Mail className='size-4' />
            {t('actions.email')}
          </Button>
          <Button
            size='lg'
            variant='outline'
            className='h-12 w-full'
            onClick={(event) => openShare('qr', event.currentTarget)}
          >
            <QrCode className='size-4' />
            {t('actions.qr')}
          </Button>

          <p className='text-muted-foreground pt-1 text-center text-xs'>{t('packagedNote')}</p>
        </aside>
      </div>

      <DossierShareDialog
        mode={shareMode}
        onOpenChange={(open) => setShareMode(open ? shareMode : null)}
        token={dossier.shareToken}
        url={dossier.shareUrl ?? null}
        origin={dialogOrigin}
        onSendEmail={onSendEmail}
        manage={
          onCreateLink && onRevokeLink
            ? {
                expiryDate: dossier.shareExpiry ?? null,
                onCreate: onCreateLink,
                onRevoke: onRevokeLink,
                qrSrc: dossier.shareToken ? estimateGenerationApi.shareQrUrl(info.projectId, dossier.shareToken) : null
              }
            : undefined
        }
      />

      <ProjectReadyOptionsDialog
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        projectId={info.projectId}
        findHref={contractorMatchesRoute(info.projectId)}
      />

      {/* Dải chuyển đổi cuối trang. */}
      <section
        data-contact-strip
        data-entrance-step='4'
        className='bg-accent/60 border-primary/20 flex flex-col items-center gap-4 rounded-2xl border p-6 sm:flex-row sm:justify-between'
      >
        <h2 className='text-primary-strong font-semibold text-balance'>{t('ctaTitle')}</h2>
        <div className='flex shrink-0 flex-col gap-3 sm:flex-row'>
          <Button data-call-now asChild size='lg'>
            <HotlineLink hotline={contact.hotline}>
              <Phone className='size-4' />
              {t('ctaCall')}
            </HotlineLink>
          </Button>
          <Button asChild size='lg' variant='outline'>
            <a href={contact.zaloUrl} target='_blank' rel='noreferrer'>
              <MessageCircle className='size-4' />
              {t('ctaZalo')}
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
