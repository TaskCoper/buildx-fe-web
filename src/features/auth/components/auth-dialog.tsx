'use client'

import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { type AuthDialogMode, useAuthDialogStore } from '@/shared/auth'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

/**
 * Guest auth popup: login and register in one dialog with tabs, so the public
 * site never navigates to a separate page. Open-state is global
 * (`useAuthDialogStore`) so any trigger opens it — mount this once per public
 * layout.
 */
export function AuthDialog() {
  const t = useTranslations('auth')
  const { isOpen, mode, open, setOpen, setMode } = useAuthDialogStore()
  // `useSearchParams`, không phải `window.location`: guard chuyển hướng bằng
  // `router.replace` nên dialog đã mounted sẵn — đọc URL một lần lúc mount thì
  // lần bị đá về sau đó sẽ không mở popup nữa.
  const searchParams = useSearchParams()
  const authParam = searchParams.get('auth')

  // Deep-link support: a redirect from a protected route (or any CTA) lands on a
  // public page with `?auth=login|register` to auto-open the popup. The embedded
  // LoginForm reads `?redirect` to route on success (see proxy.ts).
  useEffect(() => {
    if (authParam === 'login' || authParam === 'register') open(authParam)
  }, [authParam, open])

  /**
   * Đóng popup thì xóa luôn `?auth` khỏi URL.
   *
   * Nếu để nguyên, mọi trigger dạng liên kết `?auth=login` đều trỏ về đúng URL
   * hiện tại → không có điều hướng, `authParam` không đổi nên effect không chạy
   * lại và popup không mở nữa. `?redirect` giữ lại vì đích đến sau khi đăng nhập
   * vẫn còn đúng khi người dùng mở lại popup.
   */
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next || !authParam) return

      // `history.replaceState` chứ không `router.replace`: chỉ cần bỏ `?auth` khỏi
      // thanh địa chỉ (Next đồng bộ `useSearchParams` theo history), không cần
      // điều hướng. `router.replace` làm trang gọi lại máy chủ ngay lúc popup đang
      // đóng — trang trắng và Radix kẹt `pointer-events: none` trên body.
      const params = new URLSearchParams(searchParams)
      params.delete('auth')
      const query = params.toString()
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    },
    [authParam, searchParams, setOpen]
  )

  // Lưới an toàn: Radix khóa `body` (`pointer-events: none`) khi popup mở và chỉ
  // trả lại khi nội dung popup tháo ra. Nếu popup bị tháo giữa chừng (chuyển
  // route lúc đang đóng) thì cả trang không bấm được nữa — menu, tab đều chết.
  // Popup đã đóng mà không còn hộp thoại nào mở → trả khóa lại.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (document.body.style.pointerEvents === 'none') document.body.style.pointerEvents = ''
      document.body.removeAttribute('data-scroll-locked')
    }, 500)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='items-center text-center'>
          <DialogTitle className='text-title'>{t(`${mode}.title`)}</DialogTitle>
          <DialogDescription>{t(`${mode}.subtitle`)}</DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(value) => setMode(value as AuthDialogMode)}>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='login'>{t('login.submit')}</TabsTrigger>
            <TabsTrigger value='register'>{t('register.submit')}</TabsTrigger>
          </TabsList>
          <TabsContent value='login' className='mt-4'>
            <LoginForm embedded />
          </TabsContent>
          <TabsContent value='register' className='mt-4'>
            <RegisterForm embedded onSwitchToLogin={() => setMode('login')} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
