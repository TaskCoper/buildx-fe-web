'use client'

import { useState } from 'react'

import { resumeProjectRoute, useDesignStore } from '@/features/design'
import { useGuideVideos, VideoLightbox } from '@/features/guide'
import { HomeHero } from '@/features/landing'
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

  const { data: videos } = useGuideVideos()
  const [introVideoOpen, setIntroVideoOpen] = useState(false)
  // "Video 1 phút" = video nổi bật đầu danh sách; chưa có video nào được đánh
  // dấu nổi bật thì lấy video đầu tiên — luôn có gì đó để mở thay vì im lặng.
  const introVideo = [...(videos ?? [])].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))[0]

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
