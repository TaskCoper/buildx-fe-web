'use client'

import { Check, Copy, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, type ComponentProps, type MouseEvent } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/components/ui/popover'
import { siteConfig } from '@/shared/config/site'
import { ZaloIcon } from './brand-icons'

interface HotlineLinkProps extends Omit<ComponentProps<'a'>, 'href'> {
  /** Số hiển thị, ví dụ "0934 888 881" — mặc định là hotline của site. */
  hotline?: string
}

/**
 * Liên kết gọi hotline dùng chung (góp ý BG25).
 *
 * `tel:` chỉ có nghĩa trên điện thoại: trên máy tính trình duyệt bật hộp chọn ứng
 * dụng / "tải ứng dụng trên điện thoại" thay vì gọi. Nên trên thiết bị có chuột
 * (`pointer: fine`) bấm vào chỉ MỞ một ô nhỏ hiện số, nút sao chép và nút nhắn
 * Zalo; thiết bị cảm ứng vẫn đi `tel:` như cũ. Là thẻ `<a>` thật nên dùng được
 * trong `<Button asChild>`.
 */
export function HotlineLink({ hotline = siteConfig.contact.hotline, onClick, children, ...props }: HotlineLinkProps) {
  const t = useTranslations('common.hotlinePopover')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const digits = hotline.replace(/\s/g, '')

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    event.preventDefault()
    setCopied(false)
    setOpen(true)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(digits)
      setCopied(true)
    } catch {
      // Trình duyệt chặn clipboard — số vẫn hiện to trong ô để khách chép tay.
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <a href={`tel:${digits}`} onClick={handleClick} {...props}>
          {children}
        </a>
      </PopoverAnchor>
      <PopoverContent align='end' className='w-64 space-y-3'>
        <div>
          <p className='text-muted-foreground text-xs'>{t('title')}</p>
          <p className='text-primary-strong mt-0.5 flex items-center gap-2 text-xl font-bold tracking-tight'>
            <Phone className='size-4 shrink-0' />
            {hotline}
          </p>
          <p className='text-muted-foreground mt-1 text-xs text-pretty'>{t('hint')}</p>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <Button type='button' size='sm' variant='outline' onClick={copy}>
            {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
            {copied ? t('copied') : t('copy')}
          </Button>
          <Button asChild size='sm'>
            <a href={siteConfig.contact.zaloUrl} target='_blank' rel='noreferrer'>
              <ZaloIcon className='size-4' />
              {t('zalo')}
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
