'use client'

import { Check, Copy, Loader2, Send } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState, type CSSProperties } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { shareRoute } from '@/shared/constants/routes'
import { useMounted } from '@/shared/hooks'
import { formatDisplayDate } from '@/shared/utils'
import { vietnamDate } from '../services/estimate-result.logic'

/** Cửa sổ nào đang mở — `null` là đóng hết. */
export type ShareMode = 'link' | 'qr' | 'email' | null

/** Kết quả gửi email: BE nhận (SMTP đã nhận) hay không biết thư đã nhận chưa. */
export type EmailOutcome = 'accepted' | 'unknown' | void

interface DossierShareDialogProps {
  mode: ShareMode
  onOpenChange: (open: boolean) => void
  /** Token chia sẻ do backend cấp; chưa có thì các cửa sổ hiện trạng thái chờ. */
  token: string | null
  /** Link ĐẦY ĐỦ do BE cấp; có thì dùng nguyên thay vì dựng từ `token`. */
  url?: string | null
  onSendEmail: (email: string) => Promise<EmailOutcome>
  origin?: { x: number; y: number }
  /**
   * Dự toán THẬT: chủ bản chọn ngày hết hạn trước khi có link (BR-PROJ-006 khoản 1, không có hạn mặc định),
   * thấy hạn đang có và thu hồi được. Bỏ trống = dự án mock (link tạo sẵn, không hạn).
   */
  manage?: {
    /** Ngày hết hạn của link hiện hành (`YYYY-MM-DD`). */
    expiryDate: string | null
    onCreate: (expiryDate: string) => Promise<void>
    onRevoke: () => Promise<void>
    /** Ảnh QR do BE vẽ cho đúng link hiện hành (PNG). */
    qrSrc: string | null
  }
}

/**
 * Ba thao tác chia sẻ bộ hồ sơ (mục III.4c): tạo link, QR code và gửi email.
 * Gộp một cửa sổ vì cả ba đều xoay quanh cùng một đường dẫn chia sẻ.
 */
export function DossierShareDialog({
  mode,
  onOpenChange,
  token,
  url,
  onSendEmail,
  origin,
  manage
}: DossierShareDialogProps) {
  const t = useTranslations('design.dossier.share')
  const locale = useLocale() as Locale

  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<EmailOutcome>(undefined)
  const [expiry, setExpiry] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [revoking, setRevoking] = useState(false)

  // Đường dẫn tuyệt đối chỉ dựng được sau khi mount (cần origin thật).
  const mounted = useMounted()
  const shareUrl = url ?? (token && mounted ? `${window.location.origin}/${locale}${shareRoute(token)}` : '')
  /** Dự toán thật chưa có link: hỏi ngày hết hạn thay vì chờ link tự có. */
  const needsSetup = Boolean(manage) && !shareUrl
  const today = mounted ? vietnamDate(0) : undefined

  function handleOpenChange(open: boolean) {
    if (!open) {
      setCopied(false)
      setOutcome(undefined)
      setConfirmRevoke(false)
    }
    onOpenChange(open)
  }

  async function copy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  async function send() {
    if (!email.trim() || sending) return
    setSending(true)
    // Xoá kết quả của lần gửi trước: nếu không, thông báo cũ vẫn hiện (kèm địa chỉ mới) khi lần này lỗi.
    setOutcome(undefined)
    try {
      setOutcome(await onSendEmail(email.trim()))
    } catch {
      // Hook đã báo lỗi bằng toast; giữ form để thử lại.
    } finally {
      setSending(false)
    }
  }

  async function create() {
    if (!manage || !expiry || creating) return
    setCreating(true)
    try {
      await manage.onCreate(expiry)
    } catch {
      // Hook đã báo lỗi (ngày không hợp lệ, dịch vụ chưa sẵn sàng…).
    } finally {
      setCreating(false)
    }
  }

  async function revoke() {
    if (!manage || revoking) return
    setRevoking(true)
    try {
      await manage.onRevoke()
      setConfirmRevoke(false)
      setCopied(false)
    } catch {
      // Hook đã báo lỗi.
    } finally {
      setRevoking(false)
    }
  }

  const heading = needsSetup ? 'setup' : (mode ?? 'link')

  return (
    <Dialog open={mode !== null} onOpenChange={handleOpenChange}>
      <DialogContent
        data-origin-dialog
        data-dossier-share-dialog
        style={
          { '--dialog-origin-x': `${origin?.x ?? 0}px`, '--dialog-origin-y': `${origin?.y ?? 0}px` } as CSSProperties
        }
        className='sm:max-w-md'
      >
        <DialogHeader>
          <DialogTitle>{t(`${heading}.title`)}</DialogTitle>
          <DialogDescription>{t(`${heading}.description`)}</DialogDescription>
        </DialogHeader>

        {needsSetup ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
            className='space-y-3'
          >
            <label htmlFor='share-expiry' className='text-sm font-medium'>
              {t('setup.expiryLabel')}
            </label>
            <Input
              id='share-expiry'
              type='date'
              required
              min={today}
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
            <p className='text-muted-foreground text-xs'>{t('setup.expiryHint')}</p>
            <Button type='submit' className='w-full' disabled={creating || !expiry}>
              {creating ? <Loader2 className='size-4 animate-spin' /> : null}
              {t('setup.create')}
            </Button>
          </form>
        ) : !shareUrl ? (
          <p className='text-muted-foreground flex items-center gap-2 py-6 text-sm'>
            <Loader2 className='size-4 animate-spin' />
            {t('preparing')}
          </p>
        ) : mode === 'qr' ? (
          <div className='flex flex-col items-center gap-4 py-2'>
            <div className='rounded-2xl border bg-white p-4'>
              {manage?.qrSrc ? (
                // Ảnh QR do BE vẽ cho đúng link hiện hành (cookie đăng nhập đi kèm, không dùng dịch vụ ngoài).
                // eslint-disable-next-line @next/next/no-img-element
                <img src={manage.qrSrc} alt={t('qrAlt')} width={192} height={192} className='size-48' />
              ) : (
                <QRCodeSVG value={shareUrl} size={192} level='M' />
              )}
            </div>
            <p className='text-muted-foreground text-center text-xs break-all'>{shareUrl}</p>
          </div>
        ) : mode === 'email' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
            className='space-y-3'
          >
            <Input
              type='email'
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('email.placeholder')}
              autoComplete='email'
            />
            <Button type='submit' className='w-full' disabled={sending || !email.trim()}>
              {sending ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
              {t('email.submit')}
            </Button>
            {outcome === 'accepted' ? <p className='text-primary text-sm'>{t('email.sent', { email })}</p> : null}
            {outcome === 'unknown' ? (
              <p className='text-warning-strong text-sm'>{t('email.unknown', { email })}</p>
            ) : null}
          </form>
        ) : (
          <div className='flex items-center gap-2'>
            <Input readOnly value={shareUrl} className='font-mono text-xs' onFocus={(e) => e.currentTarget.select()} />
            <Button variant='outline' size='icon' onClick={() => void copy()} aria-label={t('link.copy')}>
              {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
            </Button>
          </div>
        )}

        {manage && shareUrl ? (
          <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-3'>
            <p className='text-muted-foreground text-xs'>
              {manage.expiryDate
                ? t('expiry', { date: formatDisplayDate(manage.expiryDate, locale) })
                : t('expiryUnknown')}
            </p>
            {confirmRevoke ? (
              <span className='flex items-center gap-2'>
                <Button size='sm' variant='destructive' onClick={() => void revoke()} disabled={revoking}>
                  {revoking ? <Loader2 className='size-3.5 animate-spin' /> : null}
                  {t('revoke.confirm')}
                </Button>
                <Button size='sm' variant='ghost' onClick={() => setConfirmRevoke(false)} disabled={revoking}>
                  {t('revoke.cancel')}
                </Button>
              </span>
            ) : (
              <Button size='sm' variant='outline' onClick={() => setConfirmRevoke(true)}>
                {t('revoke.button')}
              </Button>
            )}
          </div>
        ) : null}

        <p className='text-muted-foreground text-xs'>{t('privacyNote')}</p>
      </DialogContent>
    </Dialog>
  )
}
