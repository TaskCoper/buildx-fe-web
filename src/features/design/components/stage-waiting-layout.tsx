import type { ReactNode } from 'react'

/**
 * Bố cục màn chờ của các chặng AI: mẫu thư viện chiếm cột trái rộng, tiến độ ở cột phải hẹp và dính khi cuộn, cùng khuôn
 * với màn chờ Hồ sơ. Dưới `lg` tiến độ lên trước để khách vừa bấm chạy thấy ngay. Panel không có mẫu nào thì tự trả
 * `null`, ô trái rỗng bị ẩn và tiến độ trải hết bề rộng. Panel thu nhỏ thì vẫn mount (nó thành nút nổi) và tiến độ trải
 * hết bề rộng.
 */
export function StageWaitingLayout({
  panel,
  collapsed = false,
  children
}: {
  panel?: ReactNode
  collapsed?: boolean
  children: ReactNode
}) {
  if (!panel) return <>{children}</>
  if (collapsed)
    return (
      <>
        {panel}
        {children}
      </>
    )
  return (
    <div data-stage-waiting-layout className='flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6'>
      <div className='peer min-w-0 flex-1 empty:hidden'>{panel}</div>
      <div className='min-w-0 max-lg:order-first lg:sticky lg:top-40 lg:w-[22rem] lg:shrink-0 lg:peer-empty:w-full'>
        {children}
      </div>
    </div>
  )
}
