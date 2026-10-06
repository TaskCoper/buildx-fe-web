'use client'

import { resumeProjectRoute, useDesignStore } from '@/features/design'
import { HomeJourney, type HomeJourneyStep } from '@/features/landing'
import { useHomePageStore } from './home-page.store'
import { useActiveProject } from './use-active-project'

/** Bước Nhập liệu/Nhận dự toán của luồng thiết kế đều thuộc dải "Thiết kế & Dự
 * toán" của trang chủ; chỉ Bước 3 mới sang "Hồ sơ thi công" (mục II.2). */
function journeyStepOf(currentStep: number): HomeJourneyStep {
  return currentStep >= 3 ? 'dossier' : 'design'
}

/**
 * App-layer glue giống `home-hero-section`: nút "Tạo dự án mới" cuối dải 5 bước
 * mở modal Tạo dự án của `features/design`, mà `features/landing` thì không được
 * import feature kia. Có dự án dở thì bước hiện tại của NÓ tự sáng thay vì nút
 * tạo dự án (mục II.2).
 */
export function HomeJourneySection() {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)
  const markCreateProjectClicked = useHomePageStore((s) => s.markCreateProjectClicked)
  const activeProject = useActiveProject()

  return (
    <HomeJourney
      onCreateProject={() => {
        markCreateProjectClicked()
        openCreateDialog()
      }}
      activeProject={
        activeProject
          ? {
              name: activeProject.name,
              href: resumeProjectRoute(activeProject),
              currentStep: journeyStepOf(activeProject.currentStep)
            }
          : null
      }
    />
  )
}
