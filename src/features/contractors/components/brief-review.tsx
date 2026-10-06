'use client'

import {
  AlertTriangle,
  ArrowLeft,
  CircleCheck,
  ClipboardList,
  FileText,
  House,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  Receipt
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import {
  ProjectReadyOptionsDialog,
  revealContainerVariants,
  revealEase,
  revealItemVariants
} from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { contractorBriefRoute, contractorMatchesRoute } from '@/shared/constants/routes'
import { canShowReadyProjectPopup, cn } from '@/shared/lib'
import { formatBudgetShort, formatCurrency } from '@/shared/utils'
import { useBrief, useCompleteBrief } from '../hooks/use-brief'
import { useConstructionScopes } from '../hooks/use-construction-scopes'
import { briefReadiness, formatFileSize, fullAddress, isBriefComplete } from '../services/brief.service'
import { BRIEF_STEP_TRANSITION_KEY, BriefSteps } from './brief-form'
import { MATCHES_JUST_ARRIVED_KEY } from './contractor-matches'
import { constructionSitesApi } from '../api/construction-sites.api'

interface BriefReviewProps {
  projectId: string
}

/**
 * Bước 2 — Kiểm tra hồ sơ dự án (S11).
 *
 * Bố cục: ba khối tóm tắt bên trái (mỗi khối có nút Chỉnh sửa quay lại Bước 1),
 * thẻ dự án + "Hồ sơ đã sẵn sàng" + nút hoàn tất bên phải.
 *
 * "Hoàn tất & tìm nhà thầu" chốt hồ sơ rồi mở popup ba lựa chọn dùng chung với
 * S08 (R7) — chọn "Tìm nhà thầu" mới sang S12.
 */
export function BriefReview({ projectId }: BriefReviewProps) {
  const t = useTranslations('contractors.review')
  const scopes = useConstructionScopes()
  const tScale = useTranslations('contractors.scale')
  const tCondition = useTranslations('contractors.siteCondition')
  const tStart = useTranslations('contractors.startWindow')
  const tCommon = useTranslations('contractors.common')
  const tSite = useTranslations('contractors.siteForm')
  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()

  const { data: brief, isPending, isError, refetch } = useBrief(projectId)
  const complete = useCompleteBrief(projectId)

  const [confirmed, setConfirmed] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)

  /**
   * Đến từ M02 bằng "Tiếp tục" → chuỗi tick bước 1 chạy; mở lại một nháp có
   * sẵn (gõ URL, F5…) → tick tĩnh, không hiệu ứng (mục 3).
   */
  const [justArrivedFromStep1, setJustArrivedFromStep1] = useState(false)
  useEffect(() => {
    if (window.sessionStorage.getItem(BRIEF_STEP_TRANSITION_KEY) === projectId) {
      window.sessionStorage.removeItem(BRIEF_STEP_TRANSITION_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cờ một lần đọc từ sessionStorage khi vừa mount, không phải đồng bộ dữ liệu React
      setJustArrivedFromStep1(true)
    }
  }, [projectId])

  /** Rung ô xác nhận khi bấm "Hoàn tất" lúc chưa tick (mục 8). */
  const [confirmShake, setConfirmShake] = useState(false)
  const [showConfirmHint, setShowConfirmHint] = useState(false)

  /** Nút "Hoàn tất" thở một nhịp ngay khi vừa tick xong (mục 9). */
  const wasConfirmedRef = useRef(false)
  const [submitBreathe, setSubmitBreathe] = useState(false)
  useEffect(() => {
    if (confirmed && !wasConfirmedRef.current) {
      setSubmitBreathe(true)
      const timer = window.setTimeout(() => setSubmitBreathe(false), 500)
      wasConfirmedRef.current = true
      return () => window.clearTimeout(timer)
    }
    wasConfirmedRef.current = confirmed
  }, [confirmed])

  /**
   * Sửa xong quay lại: dòng vừa đổi hiện chéo + nền vàng nhạt mờ dần; phần
   * không đổi không chạy lại (mục 4) — so với bản chụp lần trước lưu trong
   * `sessionStorage`, theo từng dự án.
   */
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!brief) return
    const snapshotKey = `savico.brief-snapshot.${projectId}`
    const current = {
      name: brief.name,
      buildingType: brief.buildingType,
      landArea: brief.landArea,
      condition: brief.siteCondition,
      scale: brief.scale,
      address: fullAddress(brief),
      budget: brief.budget,
      startWindow: brief.startWindow,
      scope: brief.scope,
      scopeNote: brief.scopeNote
    }
    const previousRaw = window.sessionStorage.getItem(snapshotKey)
    if (previousRaw) {
      try {
        const previous = JSON.parse(previousRaw) as Partial<typeof current>
        const changed = new Set<string>()
        for (const field of Object.keys(current) as (keyof typeof current)[]) {
          if (previous[field] !== current[field]) changed.add(field)
        }
        if (changed.size > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- đánh dấu một lần các dòng vừa đổi so với bản chụp trong sessionStorage, không phải đồng bộ dữ liệu React
          setChangedFields(changed)
          window.setTimeout(() => setChangedFields(new Set()), 2200)
        }
      } catch {
        // Bản chụp cũ hỏng định dạng — bỏ qua, coi như chưa có gì để so sánh.
      }
    }
    window.sessionStorage.setItem(snapshotKey, JSON.stringify(current))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so sánh một lần khi hồ sơ vừa tải/vừa lưu xong, không phải mỗi lần tham chiếu `brief` đổi
  }, [brief?.updatedAt, projectId])

  if (isError)
    return (
      <div className='mx-auto max-w-[90rem] space-y-4 px-4 py-8' role='alert'>
        <p>{tSite('errors.generic')}</p>
        <Button onClick={() => void refetch()}>{tSite('retry')}</Button>
      </div>
    )
  if (isPending || !brief) {
    return (
      <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
        <Skeleton className='h-[32rem] rounded-2xl' />
      </div>
    )
  }

  const readiness = briefReadiness(brief)
  const site = brief.constructionSite
  const scaleLabel = site
    ? site.profile.floorCount === null
      ? ''
      : tSite('floorLabel', { count: site.profile.floorCount })
    : tScale(brief.scale)
  const budgetLabel = site ? `${BigInt(site.budgetVnd).toLocaleString(locale)} ₫` : formatCurrency(brief.budget, locale)
  async function downloadFile(attachmentId: string, name: string) {
    if (!site) return
    try {
      const blob = await constructionSitesApi.download(site.constructionSiteId, attachmentId)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = name
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      toast.error(tSite('files.downloadError'))
    }
  }

  const siteRows = [
    { key: 'name', label: t('labels.name'), value: brief.name },
    { key: 'buildingType', label: t('labels.buildingType'), value: brief.buildingType },
    { key: 'landArea', label: t('labels.landArea'), value: `${site?.profile.areaM2 ?? brief.landArea} m²` },
    { key: 'condition', label: t('labels.condition'), value: site?.conditionName ?? tCondition(brief.siteCondition) },
    { key: 'scale', label: t('labels.scale'), value: scaleLabel },
    ...(site?.profile.hasTum !== null && site?.profile.hasTum !== undefined
      ? [{ key: 'tum', label: tSite('tum'), value: tSite(site.profile.hasTum ? 'yesTum' : 'noTum') }]
      : []),
    ...(site?.architectureStyleName
      ? [{ key: 'architecture', label: tSite('architecture'), value: site.architectureStyleName }]
      : []),
    ...(site?.interiorStyleName ? [{ key: 'interior', label: tSite('interior'), value: site.interiorStyleName }] : []),
    ...(site?.sourceEstimateId ? [{ key: 'source', label: tSite('source'), value: tSite('linkedSource') }] : []),
    { key: 'address', label: t('labels.address'), value: fullAddress(brief) },
    { key: 'budget', label: t('labels.budget'), value: budgetLabel },
    { key: 'startWindow', label: t('labels.startWindow'), value: tStart(brief.startWindow) }
  ]

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
      className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-6 px-4 py-5 lg:px-8'
    >
      {/* Hình S11: link quay lại màu XANH, và ngay cạnh nó là viên nhãn
          "HỒ SƠ TỰ TẠO" — bản trước không có viên nhãn này. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className='flex flex-wrap items-center gap-3'
      >
        <Link
          href={contractorBriefRoute(projectId)}
          className='text-primary-strong hover:text-primary inline-flex items-center gap-1.5 text-sm font-medium'
        >
          <ArrowLeft className='size-4' />
          {t('back')}
        </Link>
        <span className='bg-accent text-primary-strong inline-flex items-center gap-1.5 rounded-full px-3 py-1 max-md:text-xs text-[11px] font-semibold tracking-wide uppercase'>
          <ClipboardList className='size-3.5' />
          {brief.selfCreated ? tCommon('selfCreated') : tSite('linkedSource')}
        </span>
      </motion.div>

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: revealEase }}
        className='space-y-1'
      >
        <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>{t('title')}</h1>
        <p className='text-muted-foreground text-pretty'>{t('subtitle')}</p>
      </motion.header>

      <BriefSteps current={2} progress={1} animateDoneCheck={justArrivedFromStep1} />

      <motion.div
        variants={revealContainerVariants}
        initial='hidden'
        animate='show'
        className='grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]'
      >
        <motion.div variants={revealItemVariants} className='min-w-0 space-y-4'>
          <SummaryCard
            title={t('siteTitle')}
            editHref={`${contractorBriefRoute(projectId)}?focus=site`}
            editLabel={t('edit')}
            rows={siteRows}
            changedKeys={changedFields}
          />

          <SummaryCard
            title={t('needsTitle')}
            editHref={`${contractorBriefRoute(projectId)}?focus=needs`}
            editLabel={t('edit')}
            rows={[
              // Hình S11: giá trị "Phạm vi" là VIÊN NHÃN nền xanh nhạt, không
              // phải chữ trơn như các dòng khác.
              { key: 'scope', label: t('scopeLabel'), value: scopes.label(brief.scope, brief.scopeName), chip: true },
              { key: 'scopeNote', label: t('noteLabel'), value: brief.scopeNote }
            ]}
            changedKeys={changedFields}
          />

          <section className='bg-card rounded-2xl border p-5'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-sm font-semibold tracking-wide uppercase'>{t('documentsTitle')}</h2>
              <Link
                href={`${contractorBriefRoute(projectId)}?focus=documents`}
                className='text-primary-strong text-sm font-medium underline underline-offset-4'
              >
                {t('addFile')}
              </Link>
            </div>

            {brief.documents.length === 0 ? (
              // Hồ sơ "mỏng" (chưa có tài liệu nào) — gợi ý thêm, KHÔNG chặn
              // hoàn tất: `isBriefComplete` không xét tài liệu (mục 4).
              <div className='mt-3 flex items-start gap-2'>
                <AlertTriangle className='text-brand-orange mt-0.5 size-4 shrink-0' />
                <div className='text-sm'>
                  <p className='text-muted-foreground'>{t('noDocuments')}</p>
                  <p className='text-brand-orange text-xs'>{t('documentsThinHint')}</p>
                </div>
              </div>
            ) : (
              <ul className='mt-3 space-y-2'>
                {brief.documents.map((document) => (
                  <li key={document.id} className='flex items-center gap-3 rounded-lg border px-3 py-2'>
                    {/* Hình S11: icon ảnh màu xanh, icon PDF màu ĐỎ. */}
                    {document.kind === 'image' ? (
                      <ImageIcon className='text-primary size-4 shrink-0' />
                    ) : (
                      <FileText className='text-destructive size-4 shrink-0' />
                    )}
                    <span className='min-w-0 flex-1 truncate text-sm'>{document.name}</span>
                    <span className='text-muted-foreground text-xs'>{formatFileSize(document, locale)}</span>
                    {site ? (
                      <Button variant='ghost' size='sm' onClick={() => void downloadFile(document.id, document.name)}>
                        {tSite('files.download')}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </motion.div>

        {/* Hình S11: cột phải là MỘT thẻ duy nhất, không phải hai thẻ rời.
            Thứ tự trong ảnh: icon ngôi nhà + viên nhãn "HỒ SƠ TỰ TẠO" · TÊN dự
            án cỡ lớn · dòng "loại · quy mô" · địa chỉ · ngân sách (dạng gọn
            "1,85 tỷ") · kẻ ngang · "Hồ sơ đã sẵn sàng" + 3 dòng tick · ô lưu ý
            · checkbox · nút · link "Lưu nháp và thoát" gạch chân canh giữa.

            Bản trước liệt kê "Loại công trình / Quy mô / Địa chỉ" thành các
            dòng nhãn–giá trị và in mã dự án — ảnh không có mã, mà đưa TÊN dự án
            lên làm tiêu đề. */}
        <motion.aside
          variants={revealItemVariants}
          className='bg-card space-y-4 rounded-2xl border p-5 lg:sticky lg:top-24 lg:self-start'
        >
          <div className='flex items-center gap-3'>
            <span className='bg-accent text-primary flex size-11 shrink-0 items-center justify-center rounded-xl'>
              <House className='size-5' />
            </span>
            <span className='bg-accent text-primary-strong inline-flex items-center rounded-full px-2.5 py-1 max-md:text-xs text-[11px] font-semibold tracking-wide uppercase'>
              {brief.selfCreated ? tCommon('selfCreated') : tSite('linkedSource')}
            </span>
          </div>

          <div>
            <h2 className='text-xl font-bold tracking-tight text-pretty'>{brief.name}</h2>
            <p className='text-muted-foreground mt-1 text-sm'>
              {[brief.buildingType, scaleLabel].filter(Boolean).join(' · ')}
            </p>
          </div>

          <ul className='space-y-2 text-sm'>
            <li className='flex items-start gap-2'>
              <MapPin className='text-primary mt-0.5 size-4 shrink-0' />
              <span className='text-pretty'>{fullAddress(brief)}</span>
            </li>
            <li className='flex items-start gap-2'>
              <Receipt className='text-primary mt-0.5 size-4 shrink-0' />
              {/* Ngân sách rút gọn hiện chéo (mục 7). */}
              <motion.span
                initial={{ opacity: 0, x: 8, y: -6 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: revealEase }}
              >
                {t('projectCard.budgetLabel')} {site ? budgetLabel : formatBudgetShort(brief.budget, locale)}
              </motion.span>
            </li>
          </ul>

          <motion.div
            variants={revealContainerVariants}
            initial='hidden'
            animate='show'
            transition={{ delayChildren: 0.25 }}
            className='border-t pt-4'
          >
            <motion.h3 variants={revealItemVariants} className='text-primary-strong flex items-center gap-2 font-bold'>
              <CircleCheck className='size-5' />
              {t('ready')}
            </motion.h3>

            <ul className='mt-3 space-y-2 text-sm'>
              {[
                { key: 'info', ok: readiness.hasProjectInfo, label: t('readyInfo') },
                { key: 'needs', ok: readiness.hasNeeds, label: t('readyEditable') },
                { key: 'free', ok: true, label: t('readyFree') }
              ].map((item) => (
                // "Tick vẽ nét lần lượt" (mục 7) — phóng nhẹ theo thứ tự nhờ
                // `staggerChildren` của container cha.
                <motion.li variants={revealItemVariants} key={item.key} className='flex items-start gap-2'>
                  <CircleCheck
                    className={
                      item.ok ? 'text-primary mt-0.5 size-4 shrink-0' : 'text-muted-foreground mt-0.5 size-4 shrink-0'
                    }
                  />
                  <span className='text-pretty'>{item.label}</span>
                </motion.li>
              ))}
            </ul>

            {/* Ghi chú vàng hiện CUỐI cùng (mục 7) — đứng sau danh sách tick
                trong cùng chuỗi stagger. */}
            <motion.p
              variants={revealItemVariants}
              className='text-muted-foreground bg-warning/10 mt-4 flex items-start gap-2 rounded-lg p-3 text-xs'
            >
              <Info className='text-warning-strong mt-0.5 size-3.5 shrink-0' />
              <span className='text-pretty'>{t('quoteNote')}</span>
            </motion.p>
          </motion.div>

          <motion.label
            animate={confirmShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm ring-2 ring-transparent transition-colors',
              confirmShake && 'ring-brand-orange'
            )}
          >
            <Checkbox
              checked={confirmed}
              onCheckedChange={(value) => {
                setConfirmed(value === true)
                if (value === true) setShowConfirmHint(false)
              }}
            />
            <span className='text-pretty'>{t('confirm')}</span>
          </motion.label>

          <AnimatePresence>
            {showConfirmHint ? (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className='text-brand-orange -mt-2 overflow-hidden text-xs'
              >
                {t('pleaseConfirm')}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <motion.span
            animate={submitBreathe ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={{ duration: 0.5 }}
            className='block'
          >
            <Button
              className={cn('h-12 w-full', !confirmed && 'opacity-60')}
              disabled={complete.isPending || !isBriefComplete(brief)}
              onClick={() => {
                if (!confirmed) {
                  setConfirmShake(true)
                  setShowConfirmHint(true)
                  window.setTimeout(() => setConfirmShake(false), 450)
                  return
                }
                complete.mutate(undefined, {
                  onSuccess: () => {
                    if (!canShowReadyProjectPopup(projectId)) return
                    setOptionsOpen(true)
                  }
                })
              }}
            >
              {complete.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
              {t('submit')}
            </Button>
          </motion.span>

          {!isBriefComplete(brief) ? <p className='text-destructive text-xs text-pretty'>{t('incomplete')}</p> : null}

          {/* Hình S11 còn một link "Lưu nháp và thoát" ở đây — đã bỏ cùng nút
              "Lưu nháp" ở Bước 1: hồ sơ đã được ghi lại từ Bước 1 và vẫn ở
              trạng thái nháp cho tới khi bấm "Hoàn tất", nên không có gì để
              "lưu" thêm, chỉ có một lối ra làm loãng thao tác chính. */}
        </motion.aside>
      </motion.div>

      {/* Trang mờ + tối dần trong lúc chốt hồ sơ, trước khi hộp thoại M04
          phóng lên (mục 9). */}
      <AnimatePresence>
        {complete.isPending ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='bg-background/60 fixed inset-0 z-40'
          />
        ) : null}
      </AnimatePresence>

      <ProjectReadyOptionsDialog
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        projectId={projectId}
        findHref={contractorMatchesRoute(projectId)}
        // S12 dùng cờ này để biết vừa từ đây sang: thẻ đầu viền loé, tick "Vì
        // sao đề xuất" chạy chậm hơn (mục 6/10 của M05).
        onFindNavigate={() => window.sessionStorage.setItem(MATCHES_JUST_ARRIVED_KEY, projectId)}
      />
    </motion.div>
  )
}

/**
 * Một khối tóm tắt bên trái của S11.
 *
 * Hình S11: tiêu đề IN HOA, link "Chỉnh sửa" ở mép phải màu xanh và LUÔN gạch
 * chân (bản trước có icon bút chì và không gạch chân — ảnh không có icon nào).
 */
function SummaryCard({
  title,
  rows,
  editHref,
  editLabel,
  changedKeys
}: {
  title: string
  rows: { key: string; label: string; value: string; chip?: boolean }[]
  editHref: string
  editLabel: string
  /** Dòng vừa đổi sau khi sửa xong quay lại — hiện chéo + nền vàng mờ dần (mục 4). */
  changedKeys?: Set<string>
}) {
  return (
    <section className='bg-card rounded-2xl border p-5'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-sm font-semibold tracking-wide uppercase'>{title}</h2>
        <Link
          href={editHref}
          className='text-primary-strong hover:text-primary after:bg-primary-strong focus-visible:after:bg-primary relative text-sm font-medium transition-colors after:absolute after:right-0 after:-bottom-0.5 after:left-0 after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none'
        >
          {editLabel}
        </Link>
      </div>

      <dl className='mt-4 space-y-2.5'>
        {rows.map((row) => {
          const changed = changedKeys?.has(row.key) ?? false
          return (
            <div key={row.key} className='grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4'>
              <dt className='text-muted-foreground text-xs sm:text-sm'>{row.label}</dt>
              <dd className='relative isolate text-sm text-pretty'>
                <motion.span
                  key={row.value}
                  initial={changed ? { opacity: 0, x: 10, y: -6 } : false}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.35, ease: revealEase }}
                  className='relative inline-block'
                >
                  {row.chip ? (
                    <span className='bg-accent text-primary-strong inline-flex rounded-full px-3 py-1 text-xs font-medium'>
                      {row.value}
                    </span>
                  ) : (
                    row.value
                  )}
                </motion.span>
                {changed ? (
                  <motion.span
                    aria-hidden
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                    className='bg-warning/25 pointer-events-none absolute -inset-x-2 -inset-y-1 -z-10 rounded'
                  />
                ) : null}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
