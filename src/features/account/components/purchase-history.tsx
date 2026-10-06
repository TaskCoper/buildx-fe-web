'use client'

import { Download, FileText, Info, Loader2, Mail, QrCode, ReceiptText } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useAuth } from '@/shared/auth'
import { useChatContextStore } from '@/shared/chat-context'
import { revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { CmsTransaction, CmsTransactionStatus } from '@/shared/cms'
import { checkoutPaymentRoute, ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatCurrency, formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from '@/shared/utils'
import { usePurchaseHistory } from '../hooks/use-purchase-history'

type FilterStatus = 'all' | 'paid' | 'pending' | 'refunded'

const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Đơn chưa xác nhận thanh toán → bay thẳng vào trang QR của đơn đó để chuyển tiếp hoặc huỷ. Chỉ đơn thật
 * (id là UUID) mới có trang thanh toán; giao dịch mock không có đơn nên không hiện nút.
 */
function ContinuePaymentButton({
  transaction,
  label,
  className
}: {
  transaction: CmsTransaction
  label: string
  className?: string
}) {
  if (transaction.status !== 'pending' || !ORDER_ID_RE.test(transaction.id)) return null
  return (
    <Button asChild size='sm' className={className}>
      <Link href={checkoutPaymentRoute(transaction.id)}>
        <QrCode className='size-3.5' />
        {label}
      </Link>
    </Button>
  )
}

const STATUS_TONE: Record<CmsTransactionStatus, string> = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-warning/20 text-warning-strong',
  failed: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground'
}

function StatusPill({
  status,
  label,
  pulsePending = false,
  reduceMotion = false
}: {
  status: CmsTransactionStatus
  label: string
  pulsePending?: boolean
  reduceMotion?: boolean
}) {
  const dotClass =
    status === 'paid'
      ? 'bg-success'
      : status === 'pending'
        ? 'bg-warning-strong'
        : status === 'failed'
          ? 'bg-destructive'
          : 'bg-muted-foreground'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 max-md:text-xs text-[11px] font-medium',
        STATUS_TONE[status]
      )}
    >
      {status === 'pending' && pulsePending ? (
        <motion.span
          className={cn('size-1.5 rounded-full', dotClass)}
          animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
          transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <span className={cn('size-1.5 rounded-full', dotClass)} />
      )}
      {label}
    </span>
  )
}

function ReceiptRow({
  label,
  children,
  emphasized = false
}: {
  label: string
  children: React.ReactNode
  emphasized?: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 px-4 py-3 text-sm',
        emphasized && 'bg-accent/35'
      )}
    >
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className={cn('min-w-0 text-right font-medium', emphasized && 'text-primary-strong text-base font-bold')}>
        {children}
      </dd>
    </div>
  )
}

export function PurchaseHistory() {
  const t = useTranslations('account.purchaseHistory')
  const locale = useLocale() as Locale
  const reduceMotion = Boolean(useReducedMotion())
  const { user } = useAuth()
  const setAssistantOpen = useChatContextStore((s) => s.setPanelOpen)
  const setAssistantSuppressed = useChatContextStore((s) => s.setDockSuppressed)
  const { data: history, isPending } = usePurchaseHistory()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [receipt, setReceipt] = useState<CmsTransaction | null>(null)
  const [resendingReceiptId, setResendingReceiptId] = useState<string | null>(null)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null)

  const transactions = useMemo(
    () => [...(history?.transactions ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [history?.transactions]
  )
  const counts = useMemo(
    () => ({
      all: transactions.length,
      paid: transactions.filter((item) => item.status === 'paid').length,
      pending: transactions.filter((item) => item.status === 'pending').length,
      refunded: transactions.filter((item) => item.status === 'refunded').length
    }),
    [transactions]
  )
  const visible = filter === 'all' ? transactions : transactions.filter((item) => item.status === filter)

  useEffect(
    () => () => {
      setAssistantSuppressed(false)
    },
    [setAssistantSuppressed]
  )

  const handleOpenReceipt = (transaction: CmsTransaction) => {
    setAssistantOpen(false)
    setAssistantSuppressed(true)
    setReceipt(transaction)
  }

  const handleResendReceipt = async () => {
    if (!receipt || !user?.email) return
    setResendingReceiptId(receipt.id)
    await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 150 : 650))
    toast.success(t('receiptDialog.emailQueued', { email: user.email }))
    setResendingReceiptId(null)
  }

  const handleDownloadReceipt = async () => {
    if (!receipt) return
    setDownloadingReceiptId(receipt.id)

    try {
      const { generateReceiptPdf } = await import('../services/pdf/generate-receipt-pdf')
      const amount = formatCurrency(receipt.amount, locale)
      const vatIssued = receipt.note?.toLocaleLowerCase(locale).includes('vat')

      await generateReceiptPdf(
        {
          code: receipt.id,
          receiptHeading: t('receiptDialog.receiptHeading', { code: receipt.id }),
          issuedAt: formatDisplayDateTime(receipt.createdAt, locale),
          buyerName: user?.name ?? receipt.customerName,
          ...(user?.phone ? { buyerPhone: user.phone } : {}),
          buyerEmail: user?.email ?? receipt.customerEmail,
          planName: receipt.planName ?? t(`tier.${receipt.tier}`),
          planDetail: t(`receiptDialog.planDetail.${receipt.tier}`),
          subtotal: amount,
          discount: t('receiptDialog.noDiscount'),
          total: amount,
          method: t(`methodValue.${receipt.method}`),
          ...(receipt.method === 'bank-qr' ? { transferContent: receipt.id.replace(/-/g, '') } : {}),
          status: t(`status.${receipt.status}`),
          vat: vatIssued ? t('receiptDialog.vatIssued') : t('receiptDialog.vatNotRequested'),
          supportNote: t('receiptDialog.note', { code: receipt.id })
        },
        {
          documentTitle: t('receiptDialog.title'),
          time: t('receiptDialog.time'),
          buyer: t('receiptDialog.buyer'),
          plan: t('table.plan'),
          subtotal: t('receiptDialog.subtotal'),
          discount: t('receiptDialog.discount'),
          total: t('receiptDialog.total'),
          method: t('method'),
          transferContent: t('receiptDialog.transferContent'),
          status: t('table.status'),
          vatInvoice: t('receiptDialog.vatInvoice')
        },
        `savico-receipt-${receipt.id}.pdf`
      )

      toast.success(t('receiptDialog.downloadSuccess'))
    } catch {
      toast.error(t('receiptDialog.downloadError'))
    } finally {
      setDownloadingReceiptId(null)
    }
  }

  if (isPending) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-9 w-80 rounded-full' />
        <Skeleton className='h-72 rounded-xl' />
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.03, ease: revealEase }}
        className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
      >
        <p className='text-muted-foreground text-sm text-pretty'>{t('description')}</p>
        <Button
          asChild
          variant='outline'
          size='sm'
          className='shrink-0 hover:bg-accent/70 motion-reduce:transition-none'
        >
          <Link href={ROUTES.PLANS}>{t('viewPlans')}</Link>
        </Button>
      </motion.div>

      <div className='flex flex-wrap items-center gap-2 pt-1'>
        <span className='text-muted-foreground mr-1 text-xs'>{t('filterLabel')}</span>
        {(['all', 'paid', 'pending', 'refunded'] as const).map((status) => (
          <button
            key={status}
            type='button'
            onClick={() => setFilter(status)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === status
                ? 'border-primary-strong bg-primary-strong text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            {t(`filter.${status}`)} {counts[status]}
          </button>
        ))}
      </div>

      <AnimatePresence mode='wait'>
        {visible.length > 0 ? (
          <motion.div
            key={`transactions-${filter}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: revealEase }}
            className='bg-card overflow-hidden rounded-xl border'
          >
            <div className='hidden overflow-x-auto md:block'>
              <table className='w-full min-w-[720px] border-collapse text-left'>
                <thead className='bg-muted/50 text-muted-foreground max-md:text-xs text-[11px] uppercase'>
                  <tr>
                    <th className='px-4 py-3 font-medium'>{t('table.code')}</th>
                    <th className='px-4 py-3 font-medium'>{t('table.date')}</th>
                    <th className='px-4 py-3 font-medium'>{t('table.plan')}</th>
                    <th className='px-4 py-3 text-right font-medium'>{t('table.amount')}</th>
                    <th className='px-4 py-3 font-medium'>{t('table.status')}</th>
                    <th className='px-4 py-3 text-right font-medium'>{t('table.receipt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: 0.26, delay: 0.04 + index * 0.055, ease: revealEase }
                      }
                      className='border-t align-top transition-colors duration-200 hover:bg-primary/5 motion-reduce:transition-none'
                    >
                      <td className='px-4 py-3 font-mono text-xs font-semibold'>#{transaction.id}</td>
                      <td className='px-4 py-3 text-xs'>
                        <div>{formatDisplayDate(transaction.createdAt, locale)}</div>
                        <div className='text-muted-foreground mt-0.5'>
                          {formatDisplayTime(transaction.createdAt, locale)}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='text-xs font-semibold'>
                          {transaction.planName ?? t(`tier.${transaction.tier}`)}
                        </div>
                        {transaction.note ? (
                          <div className='text-muted-foreground mt-0.5 max-w-[230px] max-md:text-xs text-[11px] text-pretty'>
                            {transaction.note}
                          </div>
                        ) : null}
                      </td>
                      <td className='px-4 py-3 text-right text-xs font-semibold'>
                        {formatCurrency(transaction.amount, locale)}
                      </td>
                      <td className='px-4 py-3'>
                        <StatusPill
                          status={transaction.status}
                          label={t(`status.${transaction.status}`)}
                          pulsePending
                          reduceMotion={reduceMotion}
                        />
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='flex flex-wrap justify-end gap-2'>
                          <ContinuePaymentButton
                            transaction={transaction}
                            label={t('continuePayment')}
                            className='h-8 text-xs'
                          />
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                            onClick={() => handleOpenReceipt(transaction)}
                          >
                            <FileText className='size-3.5' />
                            {t('receipt')}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='divide-y md:hidden'>
              {visible.map((transaction, index) => (
                <motion.article
                  key={transaction.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.04 + index * 0.055, ease: revealEase }
                  }
                  className='space-y-3 p-4 transition-colors duration-200 hover:bg-primary/5 motion-reduce:transition-none'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='font-mono text-xs font-semibold'>#{transaction.id}</p>
                      <p className='mt-1 text-sm font-semibold'>
                        {transaction.planName ?? t(`tier.${transaction.tier}`)}
                      </p>
                    </div>
                    <StatusPill
                      status={transaction.status}
                      label={t(`status.${transaction.status}`)}
                      pulsePending
                      reduceMotion={reduceMotion}
                    />
                  </div>
                  <div className='flex items-end justify-between gap-3'>
                    <div className='text-muted-foreground text-xs'>
                      <p>{formatDisplayDateTime(transaction.createdAt, locale)}</p>
                      {transaction.note ? <p className='mt-1 text-pretty'>{transaction.note}</p> : null}
                    </div>
                    <p className='shrink-0 text-sm font-semibold'>{formatCurrency(transaction.amount, locale)}</p>
                  </div>
                  <ContinuePaymentButton transaction={transaction} label={t('continuePayment')} className='w-full' />
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full hover:bg-accent/70 motion-reduce:transition-none'
                    onClick={() => handleOpenReceipt(transaction)}
                  >
                    <FileText className='size-3.5' />
                    {t('receipt')}
                  </Button>
                </motion.article>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`transactions-empty-${filter}`}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: revealEase }}
            className='bg-card rounded-xl border px-6 py-10 text-center'
          >
            <ReceiptText className='text-primary mx-auto size-8' strokeWidth={1.5} />
            <p className='mt-3 font-semibold'>{t('empty.title')}</p>
            <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm text-pretty'>{t('empty.description')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        key={`payment-note-${filter}`}
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.26, delay: 0.12 + Math.min(visible.length, 6) * 0.055, ease: revealEase }
        }
        className='text-muted-foreground flex items-start gap-1.5 px-0.5 max-md:text-xs text-[11px] leading-relaxed'
      >
        <Info className='mt-0.5 size-3.5 shrink-0' />
        {t('paymentNote')}
      </motion.p>

      <Sheet
        open={Boolean(receipt)}
        onOpenChange={(open) => {
          if (!open) {
            setReceipt(null)
            setResendingReceiptId(null)
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              setAssistantSuppressed(false)
            }
          }
        }}
      >
        <SheetContent
          side='right'
          className='w-[min(100vw,38rem)] gap-0 p-0 sm:max-w-xl'
          onAnimationEnd={(event) => {
            if (event.currentTarget.dataset.state === 'closed') {
              setAssistantSuppressed(false)
            }
          }}
        >
          <SheetHeader className='border-b px-5 py-4 pr-12 text-left'>
            <SheetTitle className='text-base sm:text-lg'>
              {receipt ? t('receiptDialog.titleWithCode', { code: receipt.id }) : t('receiptDialog.title')}
            </SheetTitle>
            <SheetDescription className='sr-only'>{t('receiptDialog.description')}</SheetDescription>
          </SheetHeader>
          {receipt ? (
            <div className='flex min-h-0 flex-1 flex-col'>
              <div className='min-h-0 flex-1 overflow-y-auto px-5 py-4'>
                <div className='bg-card overflow-hidden rounded-xl border shadow-sm'>
                  <div className='bg-accent/25 flex items-center justify-between gap-3 border-b px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <span className='bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full'>
                        <ReceiptText className='size-4' />
                      </span>
                      <p className='max-md:text-xs text-[11px] font-bold tracking-[0.12em] uppercase'>
                        {t('receiptDialog.receiptHeading', { code: receipt.id })}
                      </p>
                    </div>
                  </div>

                  <dl className='divide-y'>
                    <ReceiptRow label={t('receiptDialog.time')}>
                      {formatDisplayDateTime(receipt.createdAt, locale)}
                    </ReceiptRow>

                    <ReceiptRow label={t('receiptDialog.buyer')}>
                      <div className='space-y-0.5'>
                        <p className='font-semibold'>
                          {user?.name ?? receipt.customerName}
                          {user?.phone ? ` · ${user.phone}` : ''}
                        </p>
                        <p className='text-muted-foreground text-xs font-normal'>
                          {user?.email ?? receipt.customerEmail}
                        </p>
                      </div>
                    </ReceiptRow>

                    <ReceiptRow label={t('table.plan')}>
                      <div className='space-y-0.5'>
                        <p className='font-semibold'>{receipt.planName ?? t(`tier.${receipt.tier}`)}</p>
                        <p className='text-muted-foreground text-xs font-normal'>
                          {t(`receiptDialog.planDetail.${receipt.tier}`)}
                        </p>
                      </div>
                    </ReceiptRow>

                    <ReceiptRow label={t('receiptDialog.subtotal')}>
                      {formatCurrency(receipt.amount, locale)}
                    </ReceiptRow>
                    <ReceiptRow label={t('receiptDialog.discount')}>{t('receiptDialog.noDiscount')}</ReceiptRow>
                    <ReceiptRow label={t('receiptDialog.total')} emphasized>
                      {formatCurrency(receipt.amount, locale)}
                    </ReceiptRow>

                    <ReceiptRow label={t('method')}>
                      <span className='font-semibold'>{t(`methodValue.${receipt.method}`)}</span>
                    </ReceiptRow>

                    {receipt.method === 'bank-qr' ? (
                      <ReceiptRow label={t('receiptDialog.transferContent')}>
                        <span className='font-mono font-semibold'>{receipt.id.replace(/-/g, '')}</span>
                      </ReceiptRow>
                    ) : null}

                    <ReceiptRow label={t('table.status')}>
                      <div className='flex justify-end'>
                        <StatusPill status={receipt.status} label={t(`status.${receipt.status}`)} />
                      </div>
                    </ReceiptRow>

                    <ReceiptRow label={t('receiptDialog.vatInvoice')}>
                      <span className='font-semibold'>
                        {receipt.note?.toLocaleLowerCase(locale).includes('vat')
                          ? t('receiptDialog.vatIssued')
                          : t('receiptDialog.vatNotRequested')}
                      </span>
                    </ReceiptRow>
                  </dl>
                </div>

                <p className='text-muted-foreground mt-3 max-md:text-xs text-[11px] leading-relaxed text-pretty'>
                  {t('receiptDialog.note', { code: receipt.id })}
                </p>
              </div>

              <div className='bg-background flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => void handleResendReceipt()}
                  disabled={resendingReceiptId === receipt.id}
                >
                  {resendingReceiptId === receipt.id ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Mail className='size-4' />
                  )}
                  {resendingReceiptId === receipt.id ? t('receiptDialog.sendingEmail') : t('receiptDialog.resendEmail')}
                </Button>
                <Button
                  size='sm'
                  onClick={() => void handleDownloadReceipt()}
                  disabled={downloadingReceiptId === receipt.id}
                >
                  {downloadingReceiptId === receipt.id ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Download className='size-4' />
                  )}
                  {downloadingReceiptId === receipt.id
                    ? t('receiptDialog.generatingPdf')
                    : t('receiptDialog.downloadPdf')}
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
