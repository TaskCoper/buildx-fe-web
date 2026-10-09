'use client'

import { useState } from 'react'

import { resumeProjectRoute, useDesignStore } from '@/features/design'
import { useGuideVideos, VideoLightbox } from '@/features/guide'
import { HomeHero } from '@/features/landing'
import { useHomeSections } from '@/shared/cms/home-content'
import { pickByIds, sectionIds } from '@/shared/cms/home-sections'
import { useHomePageStore } from './home-page.store'
import { useActiveProject } from './use-active-project'

/**
 * App-layer glue: hero cần ba thứ mà `features/landing` không được biết —
 * modal Tạo dự án (`features/design`), video "1 phút" mở tại chỗ
 * (`features/guide`), và dự án dở của tài khoản để đổi nút chính thành "Mở
 * tiếp dự án →" (mục II.2).
 */
export function HomeHeroSection() {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)
  const markCreateProjectClicked = useHomePageStore((s) => s.markCreateProjectClicked)
  const activeProject = useActiveProject()

  const sections = useHomeSections()
  const { data: videos } = useGuideVideos()
  const [introVideoOpen, setIntroVideoOpen] = useState(false)
  // Video do admin chọn cho nút phụ; video đã ẩn hoặc không còn công khai thì bỏ qua. Không chọn gì thì "video 1
  // phút" = video nổi bật đầu danh sách; chưa có video nào được đánh dấu nổi bật thì lấy video đầu tiên — luôn có
  // gì đó để mở thay vì im lặng.
  const chosenVideo = pickByIds(videos ?? [], sectionIds(sections, 'hero', 'guideIds'), (video) => video.id, 1)?.[0]
  const introVideo =
    chosenVideo ?? [...(videos ?? [])].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))[0]

  const startCreateProject = () => {
    markCreateProjectClicked()
    openCreateDialog()
  }

  return (
    <>
      <HomeHero
        onCreateProject={startCreateProject}
        onWatchIntro={introVideo ? () => setIntroVideoOpen(true) : undefined}
        resumeProject={
          activeProject ? { name: activeProject.name, href: resumeProjectRoute(activeProject) } : undefined
        }
      />
      <VideoLightbox
        video={introVideoOpen ? (introVideo ?? null) : null}
        onClose={() => setIntroVideoOpen(false)}
        onCreateProject={startCreateProject}
      />
    </>
  )
}
