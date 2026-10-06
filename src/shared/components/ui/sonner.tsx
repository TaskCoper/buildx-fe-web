'use client'

import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Theme-aware toast portal. Rendered once in {@link AppProviders}.
 * Trigger toasts anywhere via `import { toast } from 'sonner'`.
 */
function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()
  const pathname = usePathname()
  const inHandbook = /\/handbook(?:\/|$)/.test(pathname)

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      // Góc phải TRÊN theo Hình 16 (mục VIII.3), nhưng hạ xuống DƯỚI thanh menu (cao
      // 64px) để không che menu/avatar (góp ý BuildX, PC21); tự tắt sau 4 giây, có nút đóng.
      position={inHandbook ? 'bottom-left' : 'top-right'}
      duration={inHandbook ? 4200 : 4000}
      offset={inHandbook ? { bottom: 24, left: 24 } : { top: 80, right: 24 }}
      mobileOffset={inHandbook ? { bottom: 112, left: 16, right: 16 } : { top: 76, left: 16, right: 16 }}
      toastOptions={inHandbook ? { className: 'handbook-toast' } : undefined}
      richColors
      closeButton
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
