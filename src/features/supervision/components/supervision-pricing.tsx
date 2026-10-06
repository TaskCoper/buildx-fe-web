'use client'

import {
  ArrowRight,
  Check,
  CircleCheck,
  ClipboardCheck,
  Construction,
  FileText,
  House,
  ImageIcon,
  MapPin,
  Minus,
  QrCode,
  Ruler,
  ShieldCheck,
  Star
} from 'lucide-react'
import { animate, AnimatePresence, motion, useInView } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { SupervisionPackage, SupervisionTier } from '@/shared/cms'
import { Photo, PricingMotionProvider, pricingEase, usePricingMotion } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { checkoutConfirmRoute } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { rememberCheckoutReturn } from '@/shared/lib/checkout-return'
import { formatCurrency } from '@/shared/utils'
import type { SupervisionPackageView } from '../api/supervision.merge'
import { useSupervisionPackages } from '../hooks/use-supervision-packages'
import {
  ADDONS,
  SUPERVISION_COMPARISON,
  SUPERVISION_TIERS,
  SUPERVISION_VALUE_ROWS,
  JOURNEY_STEPS,
  type JourneyStepKey,
  type SupervisionCell,
  type SupervisionValueKey,
  type SupervisionValueRowKey
} from '../constants/supervision.constants'

interface SupervisionPricingProps {
  /** Dự án gắn với đơn khi khách vào đây từ nút "Chọn cách quản lý thi công" (R8). */
  projectId?: string
}

/**
 * S19 — Trang Gói giám sát thi công (trang công khai, cũng là tab thứ hai của
 * trang Bảng giá).
 *
 * Thứ tự khối theo bản mô tả: 3 thẻ → dòng chi phí ước tính → bảng so sánh →
 * add-on & phụ phí → nguyên tắc phạm vi → hành trình khách hàng 8 bước → giá trị
 * khách hàng nhận được → 3 ghi chú.
 *
 * Bám quy tắc thay vì bám ảnh demo: ghi chú thanh toán chỉ còn QR chuyển khoản
 * (R10), và không có dòng nào nói tới việc xem báo giá của nhà thầu trên nền
 * tảng (R2) — bản demo có dòng đó trong thẻ "Tự quản lý".
 */
export function SupervisionPricing({ projectId }: SupervisionPricingProps) {
  return (
    <PricingMotionProvider>
      <SupervisionPricingContent projectId={projectId} />
    </PricingMotionProvider>
  )
}

function SupervisionPricingContent({ projectId }: SupervisionPricingProps) {
  const t = useTranslations('supervision.pricing')
  const packages = useSupervisionPackages()
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('plans.supervision', { offsetMs: 120 })

  // Chữ cuối tiêu đề tô cam (Hình S19) — tách ở khoảng trắng cuối như S01.
  const title = t('title')
  const splitAt = title.lastIndexOf(' ')
  const titleLead = splitAt > 0 ? title.slice(0, splitAt) : title
  const titleAccent = splitAt > 0 ? title.slice(splitAt + 1) : ''
  const [hoveredTier, setHoveredTier] = useState<SupervisionTier | null>(null)
  const cardsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const track = cardsRef.current
    if (!track || matchMedia('(min-width: 768px)').matches) return
    const control = track.querySelector<HTMLElement>('[data-tier="control"]')
    if (!control) return
    const destination = control.offsetLeft - (track.clientWidth - control.clientWidth) / 2
    track.scrollTo({ left: Math.max(0, destination), behavior: 'instant' })
  }, [packages.length])

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-12 px-4 py-5 lg:px-8'
    >
      <header data-entrance-step='0' data-entrance-from='right' className='supervision-heading space-y-2 text-center'>
        <h1 className='text-primary-strong flex items-center justify-center gap-3 text-3xl font-bold tracking-tight uppercase sm:text-4xl'>
          <motion.span
            className='text-pretty'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: pricingEase }}
          >
            {titleLead}
            {/* Dấu cách phải nằm NGOÀI span inline-block — ở đầu span nó bị nuốt
                ("THI CÔNGBUILDX"). */}
            {titleAccent ? ' ' : null}
            {titleAccent ? (
              <motion.span
                className='text-brand-orange inline-block'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.36 }}
              >
                {titleAccent}
              </motion.span>
            ) : null}
          </motion.span>
        </h1>
        <motion.p
          className='text-muted-foreground text-pretty'
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.78, ease: pricingEase }}
        >
          {t('subtitle')}
        </motion.p>
      </header>

      {/* pt đủ chỗ cho ruy-băng "Khuyến nghị" NẰM TRÊN viên nhãn nhóm gói: viên
          nhãn cưỡi lên mép trên thẻ (-mt-8) nên hai thứ này từng chồng chữ lên
          nhau ở thẻ được khuyến nghị. */}
      <ul
        ref={cardsRef}
        data-entrance-step='4'
        data-entrance-from='right'
        data-hovering={hoveredTier ? 'true' : undefined}
        className='supervision-card-track grid items-stretch gap-6 pt-5 md:grid-cols-3'
      >
        {packages.map((item, index) => (
          <PackageCard
            key={item.tier}
            item={item}
            index={index}
            projectId={projectId}
            active={hoveredTier === item.tier}
            onHover={() => setHoveredTier(item.tier)}
            onLeave={() => setHoveredTier(null)}
          />
        ))}
      </ul>

      <ComparisonTable packages={packages} projectId={projectId} />

      {/* Tỉ lệ 59% / 39% đo từ ảnh S19: bảng phụ phí có ba cột nên cần bề
          ngang, khối nguyên tắc chỉ là ba dòng chữ. Chia đôi 50/50 làm bảng bên
          trái bị bó, chữ trong ô xuống dòng lắt nhắt. */}
      <div className='grid gap-x-[2%] gap-y-5 lg:grid-cols-[59%_minmax(0,1fr)]'>
        <AddonTable />
        <ScopeRules />
      </div>

      <Journey />
      <ValueTable />

      {/* Ba ghi chú cùng MỘT kiểu với dải ghi chú của trang Gói thiết kế
          (`plan-pricing.tsx`): một khối nền nhạt, mỗi dòng một icon tròn nền
          xanh nhạt + chữ xanh đậm cỡ nhỏ — hai trang không lệch nhau. */}
      <ul className='bg-accent/30 text-primary-strong grid gap-x-8 gap-y-4 rounded-2xl border p-5 text-xs font-medium md:grid-cols-3'>
        {[
          { icon: QrCode, text: t('notes.payment') },
          { icon: Ruler, text: t('notes.scope') },
          { icon: MapPin, text: t('notes.area') }
        ].map((note, index) => (
          <motion.li
            key={note.text}
            className='hover:bg-accent/70 flex items-center gap-3 rounded-xl transition-colors duration-300'
            initial={{ opacity: 0, y: 9 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{ duration: 0.48, delay: index * 0.14, ease: pricingEase }}
          >
            <span className='bg-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-full'>
              <note.icon aria-hidden className='supervision-note-glyph size-4' />
            </span>
            <span className='text-pretty'>{note.text}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Nút gói CONTROL tô cam (Hình S19) — dùng ở thẻ gói và ở hàng chọn gói cuối
 * bảng so sánh, nên tách hằng số để hai chỗ không lệch nhau.
 */
const ORANGE_BUTTON =
  // `brand-orange-button` = gradient cam của logo (dưới đậm → trên nhạt) và ghi đè lớp gradient xanh
  // mà biến thể mặc định của Button phủ lên nền. Quầng bóng cũng cam, không toả sáng xanh.
  'brand-orange-button text-brand-orange-foreground focus-visible:ring-brand-orange/30'

/** Cột SVC CONTROL được tô nền nhạt suốt bảng để mắt bám theo một cột. */
const CONTROL_COLUMN = 'bg-brand-orange-soft/35'

/** Một thẻ lựa chọn quản lý thi công. */
function PackageCard({
  item,
  index,
  projectId,
  active,
  onHover,
  onLeave
}: {
  item: SupervisionPackageView
  index: number
  projectId?: string
  active: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const t = useTranslations('supervision.pricing')
  const tTiers = useTranslations('supervision.tiers')
  const tTags = useTranslations('supervision.tierTags')
  const isFree = item.price === 0

  return (
    <motion.li
      data-tier={item.tier}
      data-active={active || undefined}
      data-muted={isFree || undefined}
      className='supervision-package relative flex'
      initial={{ opacity: 0, y: item.recommended ? 28 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.62, delay: 1.02 + index * 0.17, ease: pricingEase }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocusCapture={onHover}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onLeave()
      }}
    >
      {item.recommended ? (
        <motion.span
          className='supervision-control-label supervision-control-label-top bg-brand-orange text-brand-orange-foreground absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-4 py-1 text-sm font-semibold tracking-wide uppercase whitespace-nowrap'
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.86, ease: pricingEase }}
        >
          <Star className='size-3' />
          {t('recommended')}
        </motion.span>
      ) : null}

      <section
        className={cn(
          'supervision-card @container bg-card flex w-full flex-col overflow-hidden rounded-2xl border',
          item.recommended ? 'border-brand-orange shadow-md' : 'border-border'
        )}
      >
        {/* Dải tiêu đề cùng chiều cao ở cả ba gói (ba khung ngang nhau): Tự quản lý / An tâm nền xanh nhạt +
            tên xanh đậm, Toàn diện nền kem + tên cam; viên nhãn nằm vắt qua mép dưới dải. */}
        <div
          className={cn(
            'relative px-5 pt-7 pb-8 text-center',
            item.recommended ? 'bg-brand-orange-soft/50' : 'bg-primary/12'
          )}
        >
          <h2
            className={cn(
              'text-[8.3cqw] leading-none font-bold tracking-wide uppercase',
              item.recommended ? 'text-brand-orange' : 'text-primary-strong'
            )}
          >
            {item.name || tTiers(item.tier)}
          </h2>
          <motion.p
            className={cn(
              'supervision-control-label absolute bottom-0 left-1/2 w-fit -translate-x-1/2 translate-y-1/2 rounded-full px-[3.5cqw] py-[1.6cqw] text-center text-sm leading-none font-semibold tracking-wide whitespace-nowrap uppercase',
              item.recommended
                ? 'bg-brand-orange text-brand-orange-foreground'
                : 'bg-primary-strong text-primary-foreground'
            )}
            initial={item.recommended ? { opacity: 0, y: -12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: item.recommended ? 2.08 : 1.02 + index * 0.17, ease: pricingEase }}
          >
            {tTags(item.tier)}
          </motion.p>
        </div>

        <div className='flex flex-1 flex-col p-5 pt-6'>
          {/* CHỖ CHỜ ASSET: Hình S19 dùng tranh minh hoạ riêng cho từng gói
            (người tự theo dõi công trình · kỹ sư SVC cầm bảng kiểm · kỹ sư
            đồng hành trọn công trình). Chưa có tranh thật thì để KHUNG NÉT
            ĐỨT — nhét ảnh kho vào đây trông như đã xong nên không ai biết là
            còn thiếu. Đội vận hành tải ảnh lên là hiện, không phải sửa code. */}
          {item.imageUrl ? (
            <motion.div
              className='mt-4'
              initial={{ opacity: 0, filter: 'blur(5px)', scale: 0.985 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              transition={{ duration: 0.72, delay: 1.3 + index * 0.17, ease: pricingEase }}
            >
              <Photo src={item.imageUrl} alt='' className='aspect-16/10 w-full rounded-xl' sizes='360px' />
            </motion.div>
          ) : (
            <div
              className='supervision-image-placeholder bg-muted/30 text-muted-foreground/50 mt-4 flex aspect-16/10 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed'
              style={{ '--placeholder-delay': `${index * 1.25}s` } as CSSProperties}
            >
              <ImageIcon aria-hidden className='size-7' />
            </div>
          )}

          <p className='text-muted-foreground mt-4 min-h-[2.75em] text-center text-sm leading-snug text-pretty'>
            {item.fitLine}
          </p>

          <p className='mt-3 text-center'>
            <span
              className={cn(
                'text-[10cqw] font-bold tracking-tight',
                item.recommended ? 'text-brand-orange' : 'text-primary-strong'
              )}
            >
              {isFree ? (
                <motion.span
                  className='inline-block'
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.48, delay: 1.5, ease: pricingEase }}
                >
                  {t('free')}
                </motion.span>
              ) : (
                <SupervisionPrice value={item.price} index={index} />
              )}
            </span>
            {isFree ? (
              // Chừa đúng chỗ dòng "/ dự án · tối đa N tháng" của hai gói trả phí để các hàng bên dưới ngang nhau.
              <span aria-hidden className='block text-sm opacity-0 select-none'>
                &nbsp;
              </span>
            ) : (
              <motion.span
                className='text-muted-foreground block text-sm'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.42, delay: item.recommended ? 3.05 : 2.8 }}
              >
                {t('perProject')} · {t('duration', { months: item.durationMonths })}
              </motion.span>
            )}
          </p>

          <InspectionBand item={item} />

          {/* Ba gói ba kiểu dấu tick, đúng Hình S19: gói miễn phí là vòng tròn
            RỖNG (quyền lợi có sẵn, không phải thứ mua thêm), hai gói trả phí là
            vòng tròn TÔ ĐẶC theo màu gói. */}
          <motion.ul
            className='supervision-benefits mt-4 flex-1 space-y-2'
            onViewportEnter={(entry) => {
              if (entry) (entry.target as HTMLElement).dataset.seen = 'true'
            }}
            viewport={{ once: true, amount: 0.35 }}
            data-control={item.recommended || undefined}
            data-empty={!item.inspections || undefined}
          >
            {item.benefits.map((benefit, benefitIndex) => (
              <li
                key={benefit}
                data-upgrade={isFree && benefitIndex === item.benefits.length - 1 ? 'true' : undefined}
                className='supervision-benefit flex items-start gap-[2cqw] text-sm leading-snug'
                style={{ '--benefit-index': benefitIndex } as CSSProperties}
              >
                {/* Cùng `strokeWidth` cho mọi gói: gói Miễn phí là vòng tròn outline (không tô nền),
                  màu xanh đặc như nét của gói trả phí — trước đây `text-primary/70` làm nét mảnh hơn. */}
                <CircleCheck
                  aria-hidden
                  strokeWidth={2}
                  className={cn(
                    'mt-[0.5cqw] size-[4.3cqw] shrink-0',
                    isFree && 'text-primary',
                    !isFree &&
                      (item.recommended
                        ? 'fill-brand-orange text-brand-orange-foreground'
                        : 'fill-primary text-primary-foreground')
                  )}
                />
                <span className='text-pretty'>{benefit}</span>
              </li>
            ))}
          </motion.ul>

          {/* Gói miễn phí KHÔNG có nút: Hình S19 để thẻ này kết thúc ở danh sách
            quyền lợi. Tự quản lý là trạng thái mặc định của mọi dự án, không có
            gì để "chọn" — nút ở đây chỉ tạo một thao tác thừa.
            Hai nút trả phí đều TÔ ĐẶC — CHECK xanh, CONTROL cam. */}
          {isFree ? null : (
            <Button
              asChild
              size='lg'
              className={cn('mt-5 h-[11cqw] w-full text-[5cqw] font-bold', item.recommended && ORANGE_BUTTON)}
            >
              <Link
                href={checkoutConfirmRoute(item.id, projectId, item.offerKey)}
                onClick={() => rememberCheckoutReturn(item.id, projectId)}
                className={cn('supervision-buy group justify-between', item.recommended && 'supervision-buy-control')}
              >
                {t('choose', { tier: item.name || tTiers(item.tier) })}
                <ArrowRight className='size-4 transition-transform duration-300 group-hover:translate-x-1.5' />
              </Link>
            </Button>
          )}
        </div>
      </section>
    </motion.li>
  )
}

function InspectionBand({ item }: { item: SupervisionPackage }) {
  const t = useTranslations('supervision.pricing')
  const [count, setCount] = useState(0)
  const done = useRef(false)

  return (
    <motion.p
      className={cn(
        'supervision-inspection-band mt-3 rounded-lg px-3 py-2 text-center text-sm font-medium',
        !item.inspections && 'bg-muted text-muted-foreground',
        item.inspections &&
          (item.recommended ? 'bg-brand-orange-soft text-brand-orange' : 'bg-accent text-primary-strong')
      )}
      data-control={item.recommended || undefined}
      data-empty={!item.inspections || undefined}
      onViewportEnter={(entry) => {
        if (!entry || done.current) return
        const target = entry.target as HTMLElement
        target.dataset.seen = 'true'
        if (!item.inspections) return
        done.current = true
        const controls = animate(0, item.inspections, {
          duration: item.recommended ? 0.5 : 0.36,
          delay: item.recommended ? 1.3 : 0.9,
          ease: 'easeOut',
          onUpdate: (value) => setCount(Math.round(value))
        })
        return () => controls.stop()
      }}
      viewport={{ once: true, amount: 0.65 }}
    >
      <span className='supervision-inspection-text'>
        {item.inspections ? t('inspections', { count }) : t('noInspection')}
      </span>
    </motion.p>
  )
}

function SupervisionPrice({ value, index }: { value: number; index: number }) {
  const locale = useLocale() as Locale
  const final = formatCurrency(value, locale)

  return (
    <motion.span
      className='supervision-price inline-block tabular-nums'
      initial={{ opacity: 0, y: 6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: index === 2 ? 2.05 : 1.84, ease: [0.22, 1, 0.36, 1] }}
    >
      {final}
    </motion.span>
  )
}

/** Bảng "So sánh chi tiết 3 lựa chọn". */
function ComparisonTable({ packages, projectId }: { packages: SupervisionPackageView[]; projectId?: string }) {
  const t = useTranslations('supervision.pricing.comparison')
  const tTiers = useTranslations('supervision.tiers')
  const tRows = useTranslations('supervision.pricing.comparison.rows')
  const tValues = useTranslations('supervision.pricing.comparison.values')
  const tPricing = useTranslations('supervision.pricing')
  const locale = useLocale() as Locale
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<SupervisionTier | null>(null)
  const [headerStuck, setHeaderStuck] = useState(false)
  const [headerBounds, setHeaderBounds] = useState({ left: 0, width: 0 })
  const tableRef = useRef<HTMLDivElement>(null)

  const byTier = (tier: SupervisionTier) => packages.find((item) => item.tier === tier)

  useEffect(() => {
    const update = () => {
      const rect = tableRef.current?.getBoundingClientRect()
      setHeaderStuck(Boolean(rect && rect.top <= 66 && rect.bottom > 118))
      if (rect)
        setHeaderBounds((current) =>
          current.left === rect.left && current.width === rect.width ? current : { left: rect.left, width: rect.width }
        )
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section className='supervision-comparison'>
      <motion.h2
        className='text-primary-strong text-center text-2xl font-bold tracking-tight'
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: 0.52, ease: pricingEase }}
      >
        {t('title')}
      </motion.h2>

      <AnimatePresence>
        {headerStuck ? (
          <motion.div
            className='supervision-floating-head bg-card fixed top-16 z-40 hidden grid-cols-[28%_24%_24%_24%] overflow-hidden rounded-b-xl border shadow-md md:grid'
            style={{ left: headerBounds.left, width: headerBounds.width }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.26, ease: pricingEase }}
          >
            <span className='px-3 py-2 text-center text-sm font-semibold tracking-wide uppercase'>
              {t('criterion')}
            </span>
            {SUPERVISION_TIERS.map((tier) => (
              <span
                key={tier}
                className={cn(
                  'border-l px-3 py-2 text-center text-sm font-bold uppercase',
                  tier === 'control' && 'supervision-control-column bg-brand-orange-soft text-brand-orange'
                )}
              >
                {byTier(tier)?.name || tTiers(tier)}
                <small className='text-muted-foreground mt-0.5 block max-md:text-xs text-sm font-medium normal-case'>
                  {formatCurrency(byTier(tier)?.price ?? 0, locale)}
                </small>
              </span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        ref={tableRef}
        data-stuck={headerStuck || undefined}
        className='supervision-comparison-shell bg-card relative mt-5 rounded-2xl border shadow-[inset_-18px_0_20px_-24px_var(--foreground)]'
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.04 }}
        transition={{ duration: 0.52, delay: 0.2, ease: pricingEase }}
      >
        <table
          data-hovering={hoveredRow || hoveredColumn ? 'true' : undefined}
          className='supervision-comparison-table w-full min-w-[720px] table-fixed text-sm'
          onMouseLeave={() => {
            setHoveredRow(null)
            setHoveredColumn(null)
          }}
        >
          <colgroup>
            <col className='w-[28%]' />
            <col className='w-[24%]' />
            <col className='w-[24%]' />
            <col className='w-[24%]' />
          </colgroup>
          <thead className='supervision-comparison-head bg-card z-20'>
            <tr className='divide-border divide-x'>
              <th className='bg-card text-primary-strong sticky left-0 z-10 border-b px-3 py-2.5 text-center text-sm font-semibold tracking-wide uppercase'>
                {t('criterion')}
              </th>
              {SUPERVISION_TIERS.map((tier) => (
                <th
                  key={tier}
                  onMouseEnter={() => setHoveredColumn(tier)}
                  className={cn(
                    'supervision-comparison-cell border-b px-3 py-2.5 text-center',
                    tier === 'control' && 'supervision-control-column bg-brand-orange-soft',
                    hoveredColumn === tier && 'is-column-hovered'
                  )}
                >
                  <span
                    className={cn(
                      'block font-bold tracking-wide uppercase',
                      tier === 'control' ? 'text-brand-orange' : 'text-primary-strong'
                    )}
                  >
                    {byTier(tier)?.name || tTiers(tier)}
                  </span>
                  <span className='supervision-sticky-price text-muted-foreground mt-0.5 max-md:text-xs text-sm font-medium'>
                    {formatCurrency(byTier(tier)?.price ?? 0, locale)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className='divide-border divide-y'>
            <GroupRow label={t('groups.core')} />
            <CoreRow
              index={0}
              label={tRows('inspectionCount')}
              values={SUPERVISION_TIERS.map((tier) => {
                const item = byTier(tier)
                return item?.inspections ? String(item.inspections) : '—'
              })}
              hoveredRow={hoveredRow}
              onHoverRow={setHoveredRow}
              hoveredColumn={hoveredColumn}
              onHoverColumn={setHoveredColumn}
            />
            <CoreRow
              index={1}
              label={tRows('duration')}
              values={SUPERVISION_TIERS.map((tier) => {
                const item = byTier(tier)
                return tier === 'self'
                  ? t('values.unlimited')
                  : t('values.months', { count: item?.durationMonths ?? 0 })
              })}
              hoveredRow={hoveredRow}
              onHoverRow={setHoveredRow}
              hoveredColumn={hoveredColumn}
              onHoverColumn={setHoveredColumn}
            />
            <CoreRow
              index={2}
              priceRow
              label={tRows('price')}
              values={SUPERVISION_TIERS.map((tier) => byTier(tier)?.price ?? 0)}
              hoveredRow={hoveredRow}
              onHoverRow={setHoveredRow}
              hoveredColumn={hoveredColumn}
              onHoverColumn={setHoveredColumn}
            />

            {SUPERVISION_COMPARISON.map((group) => (
              <Fragment key={group.key}>
                <GroupRow label={t(`groups.${group.key}`)} />
                {group.rows.map((row, rowIndex) => (
                  <motion.tr
                    key={row.key}
                    data-hovered={hoveredRow === row.key || undefined}
                    className='supervision-comparison-row divide-border divide-x'
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.18 }}
                    transition={{ duration: 0.52, delay: 0.28 + rowIndex * 0.075, ease: pricingEase }}
                    onMouseEnter={() => setHoveredRow(row.key)}
                  >
                    <th
                      className={cn(
                        'bg-card sticky left-0 z-10 px-3 py-2 text-left text-sm font-medium transition-colors',
                        hoveredRow === row.key && 'bg-accent/80 font-semibold'
                      )}
                    >
                      {tRows(row.key)}
                    </th>
                    {SUPERVISION_TIERS.map((tier, tierIndex) => (
                      <td
                        key={tier}
                        onMouseEnter={() => setHoveredColumn(tier)}
                        className={cn(
                          'supervision-comparison-cell px-3 py-2 text-center text-sm',
                          tier === 'control' && 'supervision-control-column bg-brand-orange-soft/60',
                          hoveredColumn === tier && 'is-column-hovered',
                          hoveredRow === row.key && hoveredColumn === tier && 'is-intersection font-semibold'
                        )}
                      >
                        <Cell value={row.values[tier]} label={tValues} index={tierIndex} />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </Fragment>
            ))}
          </tbody>

          <tfoot>
            <tr className='supervision-choose-row divide-border divide-x'>
              <th className='bg-card sticky left-0 z-10 p-3 text-left text-sm font-medium'>{t('choosePlanRow')}</th>
              {SUPERVISION_TIERS.map((tier, index) => {
                const item = byTier(tier)
                return (
                  <motion.td
                    key={tier}
                    className={cn(
                      'supervision-choose-cell p-3 text-center',
                      tier === 'control' && 'supervision-control-column bg-brand-orange-soft/60'
                    )}
                    initial={{ opacity: 0, y: 9 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.65 }}
                    transition={{ duration: 0.52, delay: index * 0.16, ease: pricingEase }}
                  >
                    {item && item.price > 0 ? (
                      <Button
                        asChild
                        size='sm'
                        className={cn('supervision-table-buy text-sm', item.recommended && ORANGE_BUTTON)}
                      >
                        <Link
                          href={checkoutConfirmRoute(item.id, projectId, item.offerKey)}
                          onClick={() => rememberCheckoutReturn(item.id, projectId)}
                        >
                          {tPricing('choose', { tier: byTier(tier)?.name || tTiers(tier) })}
                        </Link>
                      </Button>
                    ) : (
                      <span className='text-muted-foreground text-sm'>—</span>
                    )}
                  </motion.td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </motion.div>
    </section>
  )
}

/** Bảng "Add-on & phụ phí". */
function AddonTable() {
  const t = useTranslations('supervision.pricing.addons')
  const packages = useSupervisionPackages()
  const months = packages.find((item) => item.tier === 'check')?.durationMonths ?? 6

  return (
    // Hình S19: hai khối này là PANEL NỀN MÀU, không viền — kem cho bảng phụ
    // phí, xanh nhạt cho phần nguyên tắc. Để `bg-card` + viền như các thẻ khác
    // thì cả dải này chìm nghỉm giữa bảng so sánh và sơ đồ hành trình.
    <motion.section
      className='supervision-addon bg-brand-orange-soft/60 rounded-2xl border p-5'
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.56, ease: pricingEase }}
    >
      <motion.h2
        className='text-primary-strong text-center text-2xl font-bold'
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.12 }}
      >
        {t('title')}
      </motion.h2>

      {/* Viền ngoài nằm ở lớp bọc chứ không đặt trên <table>: bo góc trên
          chính bảng sẽ bị các ô vuông góc của hàng đầu/cuối đè lên. */}
      <div className='mt-3 overflow-hidden rounded-lg border'>
        <table className='w-full border-collapse text-sm'>
          <thead>
            {/* `divide-x` trên hàng kẻ vạch DỌC giữa các ô — bảng phụ phí ở
                Hình S19 có lưới đủ cả ngang lẫn dọc, khác bảng so sánh phía trên
                chỉ kẻ ngang. */}
            <tr className='text-muted-foreground divide-x max-md:text-xs text-sm tracking-wide uppercase'>
              <th className='border-b p-2 text-left font-bold'>{t('item')}</th>
              <th className='border-b p-2 text-center font-bold'>{t('price')}</th>
              <th className='border-b p-2 text-center font-bold'>{t('note')}</th>
            </tr>
          </thead>
          <tbody>
            {ADDONS.map((key, index) => (
              <motion.tr
                key={key}
                className='supervision-addon-row divide-x border-b last:border-b-0'
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: 0.26 + index * 0.09, ease: pricingEase }}
              >
                <td className='p-2 text-sm font-medium'>{key === 'extend' ? t('extend', { months }) : t(key)}</td>
                <td className='p-2 text-center text-sm font-medium'>{t(`${key}Price`)}</td>
                <td className='text-muted-foreground p-2 text-center text-sm'>{t(`${key}Note`)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  )
}

/** Khối "Nguyên tắc phạm vi dịch vụ". */
function ScopeRules() {
  const t = useTranslations('supervision.pricing.scope')
  const [seen, setSeen] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const reveal = () => {
      const top = ref.current?.getBoundingClientRect().top
      // `whileInView` có thể bỏ lỡ một khối khi người dùng lướt qua thật
      // nhanh. Khi đó phải chốt ngay trạng thái cuối, không để icon vô hình.
      if (top !== undefined && top < window.innerHeight) setSeen(true)
    }
    reveal()
    window.addEventListener('scroll', reveal, { passive: true })
    return () => window.removeEventListener('scroll', reveal)
  }, [])

  return (
    <motion.section
      ref={ref}
      data-seen={seen || undefined}
      className='supervision-scope bg-info-soft flex flex-col self-start rounded-2xl border p-5'
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.56, delay: 0.28, ease: pricingEase }}
    >
      <h2 className='text-primary-strong flex items-center gap-2.5 text-2xl font-bold'>
        <ShieldCheck className='supervision-scope-icon size-5 shrink-0' strokeWidth={1.75} />
        {t('title')}
      </h2>
      <ul className='mt-3 flex flex-col gap-3'>
        {[t('r1'), t('r2'), t('r3')].map((rule, index) => (
          <motion.li
            key={rule}
            className='flex items-start gap-3 text-sm'
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.42, delay: 0.45 + index * 0.1, ease: pricingEase }}
          >
            <span aria-hidden className='bg-foreground/70 mt-2 size-1.5 shrink-0 rounded-[2px]' />
            <span className='text-pretty'>{rule}</span>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  )
}

/**
 * "Hành trình giám sát" — 4 bước viết ở ngôi "bạn", chỉ những bước thuộc về
 * giám sát (góp ý BuildX: bản cũ 8 bước, có nhánh 4A/4B, đọc như tài liệu nội bộ
 * và khác hẳn dải 5 bước của trang chủ).
 *
 * Mũi tên nối các bước; cả dải cuộn ngang trên màn hẹp thay vì xuống dòng.
 */
const JOURNEY_ICONS: Record<JourneyStepKey, typeof ShieldCheck> = {
  choose: ShieldCheck,
  inspect: Construction,
  report: FileText,
  handover: House
}
const MotionArrowRight = motion.create(ArrowRight)

function Journey() {
  const t = useTranslations('supervision.pricing.journey')
  const ref = useRef<HTMLElement>(null)
  const visible = useInView(ref, { amount: 0.15 })
  const { isScrolling } = usePricingMotion()
  const dotActive = visible && !isScrolling

  return (
    <section
      ref={ref}
      data-visible={visible || undefined}
      className='supervision-journey bg-card relative rounded-2xl border p-5'
    >
      <motion.h2
        className='text-primary-strong text-2xl font-bold tracking-wide uppercase'
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: 0.48, ease: pricingEase }}
      >
        {t('title')}
      </motion.h2>

      <div className='supervision-journey-track mt-6 flex items-stretch gap-1.5 overflow-x-auto overflow-y-hidden pt-4 pb-2 lg:justify-center'>
        {JOURNEY_STEPS.map((step, index) => (
          <Fragment key={step}>
            {index > 0 ? <FlowJoin delay={0.06 + index * 0.2} active={dotActive} /> : null}
            <JourneyCard step={step} number={index + 1} delay={0.16 + index * 0.2} />
          </Fragment>
        ))}
      </div>
    </section>
  )
}

/** Mũi tên nối hai bước đi thẳng. */
function FlowJoin({ delay, active }: { delay: number; active: boolean }) {
  return (
    <MotionArrowRight
      aria-hidden
      className='supervision-journey-join text-muted-foreground size-4 shrink-0 self-center'
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.22, delay, ease: pricingEase }}
    >
      <motion.circle
        aria-hidden
        className='supervision-journey-flow-dot'
        cx='2'
        cy='12'
        r='2.1'
        initial={false}
        animate={active ? { opacity: [0, 1, 1, 0], cx: [2, 2, 20, 20] } : { opacity: 0 }}
        transition={{ duration: 0.7, delay: 2.1 + delay, ease: 'linear', repeat: Infinity, repeatDelay: 8.2 }}
      />
    </MotionArrowRight>
  )
}

/** Một bước trên dòng chính: số ở mép trên, tên, icon, rồi mô tả. */
function JourneyCard({ step, number, delay }: { step: JourneyStepKey; number: number; delay: number }) {
  const t = useTranslations('supervision.pricing.journey')
  const Icon = JOURNEY_ICONS[step]

  return (
    <motion.div
      style={{ '--journey-delay': `${delay}s` } as CSSProperties}
      className='supervision-journey-card bg-card relative flex w-44 shrink-0 flex-col items-center rounded-xl border px-2.5 pt-5 pb-4 text-center'
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.44, delay, ease: pricingEase }}
    >
      <motion.span
        className='bg-primary text-primary-foreground absolute -top-3.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold'
        initial={{ scale: 0.55 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 360, damping: 20, delay: delay + 0.1 }}
      >
        {number}
      </motion.span>
      {/* Ô tên cao cố định bằng HAI dòng: tên một dòng và tên hai dòng đều
          chiếm chỗ như nhau, nhờ vậy icon và mô tả của tám bước nằm thẳng hàng
          thay vì chỗ lồi chỗ lõm. */}
      <p className='flex min-h-9 items-center text-sm leading-tight font-medium text-pretty'>{t(step)}</p>
      <Icon aria-hidden className='supervision-journey-icon text-primary my-3 size-8 shrink-0' strokeWidth={1.5} />
      <p className='text-muted-foreground max-md:text-xs text-sm leading-snug text-pretty'>{t(`${step}Body`)}</p>
    </motion.div>
  )
}

/** Icon đứng trước tên từng hàng giá trị (Hình S19). */
const VALUE_ICONS: Record<SupervisionValueRowKey, typeof ShieldCheck> = {
  calm: ShieldCheck,
  transparent: FileText,
  quality: ClipboardCheck,
  handover: House
}

function ValueTable() {
  const t = useTranslations('supervision.pricing.value')
  const tTiers = useTranslations('supervision.tiers')
  const packages = useSupervisionPackages()
  const byTier = (tier: SupervisionTier) => packages.find((item) => item.tier === tier)

  return (
    <section className='supervision-value'>
      <motion.h2
        className='text-primary-strong text-center text-2xl font-bold tracking-wide uppercase'
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.65 }}
        transition={{ duration: 0.5, ease: pricingEase }}
      >
        {t('title')}
      </motion.h2>

      <div className='bg-card mt-5 overflow-x-auto rounded-2xl border'>
        <table className='supervision-value-table w-full min-w-[640px] text-sm'>
          <thead>
            {/* `divide-x` kẻ vạch dọc giữa các cột, giống bảng phụ phí. */}
            <tr className='bg-muted/40 divide-x text-sm'>
              <th className='bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))] sticky left-0 z-10 border-b p-3 text-left font-medium' />
              {SUPERVISION_TIERS.map((tier) => (
                <th
                  key={tier}
                  className={cn(
                    'border-b p-3 text-center font-semibold tracking-wide uppercase',
                    tier === 'control' ? 'text-brand-orange bg-brand-orange-soft/35' : 'text-primary-strong'
                  )}
                >
                  {byTier(tier)?.name || tTiers(tier)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUPERVISION_VALUE_ROWS.map((row, index) => (
              <motion.tr
                key={row}
                className='supervision-value-row divide-x even:bg-muted/20'
                initial={{ opacity: 0, y: 7 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.44, delay: index * 0.1, ease: pricingEase }}
              >
                <th className='bg-card text-primary-strong sticky left-0 z-10 w-52 p-3.5 text-left text-sm font-medium'>
                  <motion.span
                    className='flex items-center gap-2.5'
                    initial={{ opacity: 0, x: -4 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 + 0.18 }}
                  >
                    {(() => {
                      const Icon = VALUE_ICONS[row]
                      return <Icon aria-hidden className='supervision-value-icon text-primary size-4 shrink-0' />
                    })()}
                    {t(`rows.${row}`)}
                  </motion.span>
                </th>
                {SUPERVISION_TIERS.map((tier, tierIndex) => (
                  <td
                    key={tier}
                    className={cn('p-3.5 text-center text-sm text-pretty', tier === 'control' && CONTROL_COLUMN)}
                  >
                    <motion.span
                      initial={{ opacity: 0, x: 5 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.32, delay: index * 0.1 + 0.3 + tierIndex * 0.09 }}
                    >
                      {t(`cells.${row}.${tier}`)}
                    </motion.span>
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function GroupRow({ label }: { label: string }) {
  return (
    <motion.tr
      initial={{ opacity: 0, scaleX: 0.15 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.58, delay: 0.18, ease: pricingEase }}
      style={{ transformOrigin: 'left center' }}
      className='supervision-comparison-group'
    >
      <th
        colSpan={SUPERVISION_TIERS.length + 1}
        className='bg-primary text-primary-foreground p-2.5 text-left text-sm font-semibold tracking-wide uppercase'
      >
        <span className='sticky left-3 inline-block'>{label}</span>
      </th>
    </motion.tr>
  )
}

function CoreRow({
  label,
  values,
  index,
  priceRow = false,
  hoveredRow,
  onHoverRow,
  hoveredColumn,
  onHoverColumn
}: {
  label: string
  values: Array<string | number>
  index: number
  priceRow?: boolean
  hoveredRow: string | null
  onHoverRow: (row: string) => void
  hoveredColumn: SupervisionTier | null
  onHoverColumn: (tier: SupervisionTier) => void
}) {
  const [pricesStarted, setPricesStarted] = useState(false)
  return (
    <motion.tr
      data-hovered={hoveredRow === label || undefined}
      className='supervision-comparison-row divide-border divide-x'
      onMouseEnter={() => onHoverRow(label)}
      initial={{ opacity: 0, y: 7 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => {
        if (priceRow) setPricesStarted(true)
      }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.52, delay: 0.28 + index * 0.075, ease: pricingEase }}
    >
      <th
        className={cn(
          'bg-card sticky left-0 z-10 p-3 text-left text-sm font-medium transition-colors',
          hoveredRow === label && 'bg-accent/80 font-semibold'
        )}
      >
        {label}
      </th>
      {/* `values` xếp theo SUPERVISION_TIERS nên ô cuối luôn là cột CONTROL. */}
      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          onMouseEnter={() => {
            const tier = SUPERVISION_TIERS[index]
            if (tier) onHoverColumn(tier)
          }}
          className={cn(
            'supervision-comparison-cell p-3 text-center text-sm font-medium',
            SUPERVISION_TIERS[index] === 'control' && 'supervision-control-column bg-brand-orange-soft/60',
            hoveredColumn === SUPERVISION_TIERS[index] && 'is-column-hovered',
            hoveredRow === label && hoveredColumn === SUPERVISION_TIERS[index] && 'is-intersection font-semibold'
          )}
        >
          {priceRow ? <SupervisionTablePrice value={Number(value)} index={index} started={pricesStarted} /> : value}
        </td>
      ))}
    </motion.tr>
  )
}

function SupervisionTablePrice({ value, index, started }: { value: number; index: number; started: boolean }) {
  const locale = useLocale() as Locale
  const final = formatCurrency(value, locale)
  return (
    <motion.span
      className='supervision-table-price inline-block tabular-nums'
      initial={false}
      animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
      transition={{ duration: 0.34, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      {final}
    </motion.span>
  )
}

function Cell({
  value,
  label,
  index
}: {
  value: SupervisionCell
  label: (key: SupervisionValueKey) => string
  index: number
}) {
  if (value === true)
    return (
      <Check
        className='supervision-table-tick text-primary mx-auto size-4'
        strokeWidth={2.5}
        style={{ '--tick-delay': `${index * 0.08}s` } as CSSProperties}
      />
    )
  if (value === false) return <Minus className='text-muted-foreground mx-auto size-4' />
  return <span className='text-pretty'>{label(value)}</span>
}
