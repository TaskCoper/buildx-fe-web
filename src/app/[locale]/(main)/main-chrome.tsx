'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { useAccountPlan } from '@/features/account'
import { AuthDialog, useLogout } from '@/features/auth'
import { CreateProjectDialog, resumeProjectRoute, useDesignStore } from '@/features/design'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useAuth, useAuthDialogStore } from '@/shared/auth'
import { AccountMenu } from '@/shared/components/account-menu'
import { ROUTES } from '@/shared/constants/routes'
import { SiteHeader } from '@/shared/layouts'
import { JourneyPopupHost } from './journey-popup-host'
import { useActiveProject } from './use-active-project'

/**
 * Signed-in account dropdown, wired with the auth feature's logout flow.
 *
 * `resumeProject` (chấm xanh trên avatar + "Mở tiếp dự án" đầu menu, mục II.2)
 * chỉ tính khi đã đăng nhập — dự án là dữ liệu riêng của tài khoản.
 */
function UserMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { user } = useAuth()
  const logout = useLogout()
  const active = useActiveProject()
  if (!user) return null

  const resumeProject = active ? { name: active.name, href: resumeProjectRoute(active) } : null

  return (
    <AccountMenu
      user={user}
      onLogout={() => logout.mutate()}
      onOpenChange={onOpenChange}
      resumeProject={resumeProject}
    />
  )
}

/**
 * Cầu nối app-layer cho CTA ở feature khác muốn "Tạo dự án mới" mà không được
 * import trực tiếp feature/design. URL là contract trung gian, sau khi mở modal
 * thì query được dọn để refresh/back không tự bật lại.
 */
function CreateProjectQueryBridge() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)

  useEffect(() => {
    if (searchParams.get('createProject') !== '1') return

    openCreateDialog()
    const params = new URLSearchParams(searchParams.toString())
    params.delete('createProject')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [openCreateDialog, pathname, router, searchParams])

  return null
}

/** Mở đăng nhập trước mọi yêu cầu tạo dự án của khách, rồi tiếp tục sau khi đăng nhập. */
function CreateProjectAuthGate() {
  const { isAuthenticated, isInitialized } = useAuth()
  const isCreateOpen = useDesignStore((s) => s.isCreateDialogOpen)
  const closeCreateDialog = useDesignStore((s) => s.closeCreateDialog)
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)
  const openAuthDialog = useAuthDialogStore((s) => s.open)

  useEffect(() => {
    if (!isCreateOpen || !isInitialized || isAuthenticated) return
    closeCreateDialog()
    openAuthDialog('login', openCreateDialog)
  }, [isCreateOpen, isInitialized, isAuthenticated, closeCreateDialog, openAuthDialog, openCreateDialog])

  // Chờ kiểm tra phiên trước khi hiện form; mọi nút tạo dự án cùng đi qua cổng này.
  if (!isInitialized || !isAuthenticated) return null
  return <CreateProjectDialog />
}

/**
 * Chặn tạo hồ sơ thi công khi tài khoản CHƯA MUA GÓI (không còn tạo miễn phí):
 * mở cửa sổ Tạo dự án mà `/me/design-subscription` trả rỗng → đóng modal và đá
 * về trang Bảng giá. Đặt ở app-layer vì phải đọc gói (`features/account`) lẫn cờ
 * mở modal (`features/design`) cùng lúc. Gói được nạp sẵn khi đăng nhập để lúc
 * mở modal đã biết ngay, tránh nháy form. `plan === null` chỉ đúng khi ĐÃ gọi
 * xong API và không có gói — lỗi / đang tải (`undefined`) thì KHÔNG chặn, để
 * backend tự quyết. Bản mock luôn trả gói nên dev vẫn tạo được.
 */
function DesignPlanGate() {
  const t = useTranslations('design.createProject')
  const router = useRouter()
  const isCreateOpen = useDesignStore((s) => s.isCreateDialogOpen)
  const closeCreateDialog = useDesignStore((s) => s.closeCreateDialog)
  const { user, isAuthenticated, isInitialized } = useAuth()
  const { data: plan } = useAccountPlan(isAuthenticated && isInitialized && user?.accountKind === 'Customer')
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return
    if (!isCreateOpen) {
      redirectedRef.current = false
      return
    }
    // Chỉ chặn khi CHẮC CHẮN chưa có gói (API đã trả `null`), tránh chặn nhầm lúc
    // đang tải hoặc lỗi (`undefined`).
    if (plan !== null || redirectedRef.current) return
    redirectedRef.current = true
    closeCreateDialog()
    toast.info(t('needPlan'))
    router.push(ROUTES.PLANS)
  }, [isInitialized, isAuthenticated, isCreateOpen, plan, closeCreateDialog, router, t])

  return null
}

/**
 * App-layer glue for the shared toolbar (mục II.1).
 *
 * Lives in `app/` because only this layer may import `features/auth` and
 * `features/design` at the same time. Also mounts the global auth, create-project
 * and customer-journey dialogs.
 */
export function MainChrome() {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)

  return (
    <>
      <SiteHeader UserMenu={UserMenu} onCreateProject={openCreateDialog} />
      {/* `AuthDialog` đọc `?auth=` và `?redirect=` bằng `useSearchParams`, nên nó
          phải nằm trong ranh giới Suspense của RIÊNG mình. Trước đây ranh giới
          đó do `app/[locale]/loading.tsx` vô tình đảm nhiệm — mà chính file ấy
          lại làm treo mọi route có đoạn cuối động khi tải thẳng URL. Bỏ file
          kia thì phải khai báo ranh giới ở đúng chỗ cần, là đây. */}
      <Suspense fallback={null}>
        <AuthDialog />
        <CreateProjectQueryBridge />
      </Suspense>
      <CreateProjectAuthGate />
      <DesignPlanGate />
      <JourneyPopupHost />
    </>
  )
}
