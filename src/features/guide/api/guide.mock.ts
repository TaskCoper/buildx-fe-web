import { cmsDb } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import type { GuideArticle, GuideVideo } from '../types/guide.types'

/**
 * Mock của trang Hướng dẫn. Danh sách video / bài viết đọc từ kho `shared/cms`
 * nên admin thêm - sửa - chọn video nổi bật (mục X, #3) là trang này đổi theo.
 */
export const mockGuideApi = {
  /**
   * Chỉ bước Hiển thị và video còn phát nhúng được, xếp theo thời gian tạo tăng
   * dần (epic GuideStepManagement §7).
   */
  listVideos: async (): Promise<GuideVideo[]> => {
    await mockDelay(250)
    return cmsDb
      .list('guideVideos')
      .map((video, index) => ({ video, index }))
      .filter(({ video }) => video.status !== 'hidden' && !video.unavailable)
      .sort((a, b) => (a.video.createdAt ?? '').localeCompare(b.video.createdAt ?? '') || a.index - b.index)
      .map(({ video }) => video)
  },
  /** Tra một video mock theo id (deep link `?video=`); không có → `null`. */
  getGuide: async (id: string): Promise<GuideVideo | null> => {
    const videos = await mockGuideApi.listVideos()
    return videos.find((video) => video.id === id) ?? null
  },
  listArticles: async (): Promise<GuideArticle[]> => {
    await mockDelay(250)
    return cmsDb.list('guideArticles')
  }
}
