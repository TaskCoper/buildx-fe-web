'use client'

import { resumeProjectRoute, useDesignStore } from '@/features/design'
import { HomeCta, type HomeCtaResumeProject } from '@/features/landing'
import { useHomePageStore } from './home-page.store'
import { useActiveProject } from './use-active-project'

/**
 * App-layer glue: nút của dải CTA cuối trang mở modal Tạo dự án — trừ khi có
 * dự án dở thì đổi thành "Mở tiếp dự án" (mục II.2, vùng 13). Vệt sáng của nút
 * không lặp lại nếu khách đã bấm "Tạo dự án" ở hero/dải 5 bước rồi.
 */
export function HomeCtaSection() {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)
  const createProjectClicked = useHomePageStore((s) => s.createProjectClicked)
  const markCreateProjectClicked = useHomePageStore((s) => s.markCreateProjectClicked)
  const activeProject = useActiveProject()

  const resumeProject: HomeCtaResumeProject | null =
    activeProject && activeProject.status !== 'completed'
      ? {
          id: activeProject.id,
          name: activeProject.name,
          href: resumeProjectRoute(activeProject),
          status: activeProject.status
        }
      : null

  return (
    <HomeCta
      onCreateProject={() => {
        markCreateProjectClicked()
        openCreateDialog()
      }}
      resumeProject={resumeProject}
      skipShine={createProjectClicked}
    />
  )
}
