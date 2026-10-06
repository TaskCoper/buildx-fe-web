'use client'

import { Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useAuthStore } from '@/shared/auth'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import { isValidPhone, normalizePhone } from '@/shared/utils'

interface PhonePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chạy sau khi SĐT hợp lệ đã lưu — Bước 1 dùng để đi tiếp sang Bước 2. */
  onConfirmed: (phone: string) => void
}

/**
 * Modal "Bổ sung số điện thoại" (mục IV.3.d, Hình 05–06).
 *
 * Hiện khi tài khoản chưa có SĐT lúc bấm "Nhận dự toán ngay". Số lưu vào hồ sơ
 * tài khoản (hiện lại ở Bước 3 và dùng để gửi SMS ở mục VIII.4).
 */
export function PhonePromptDialog({ open, onOpenChange, onConfirmed }: PhonePromptDialogProps) {
  const t = useTranslations('design.phonePrompt')
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [value, setValue] = useState('')
  // Chỉ báo lỗi sau lần bấm xác nhận đầu tiên, không nhắc trong lúc đang gõ.
  const [showError, setShowError] = useState(false)
  const invalid = showError && !isValidPhone(value)

  function handleConfirm() {
    if (!isValidPhone(value)) {
      setShowError(true)
      return
    }
    const phone = normalizePhone(value)
    if (user) setUser({ ...user, phone })
    onConfirmed(phone)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader className='items-center text-center'>
          <span className='bg-accent text-primary-strong mb-1 flex size-14 items-center justify-center rounded-full'>
            <Phone className='size-6' />
          </span>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className='text-pretty'>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className='space-y-2'>
          <Input
            type='tel'
            inputMode='tel'
            autoFocus
            value={value}
            aria-label={t('title')}
            aria-invalid={invalid}
            placeholder={t('placeholder')}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleConfirm()}
            className={cn('h-11 text-center', invalid && 'border-destructive focus-visible:ring-destructive/30')}
          />
          {/* Chừa sẵn chỗ cho dòng lỗi: nếu không, lỗi tắt đi làm nút xác nhận
              nhảy lên và cú bấm tiếp theo trượt ra ngoài nút. */}
          <p className={cn('text-destructive min-h-8 text-xs', !invalid && 'invisible')}>{t('error')}</p>
        </div>

        <Button size='lg' className='w-full' onClick={handleConfirm}>
          {t('submit')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
