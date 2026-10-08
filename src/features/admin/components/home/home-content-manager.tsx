'use client'

import { useTranslations } from 'next-intl'

import { homeAdminApi } from '../../api/bmt/home.api'
import { HOME_SECTIONS } from '../../services/home-sections.service'
import { PageContentManager, type ContentLocale } from './page-content-manager'

/**
 * Bản dịch mặc định của một ngôn ngữ, đọc theo yêu cầu để không đưa cả hai file `messages` vào bundle của màn admin.
 * Đây là chữ trang chủ đang hiển thị khi khối chưa được biên tập.
 */
const loadMessages = (locale: ContentLocale): Promise<unknown> =>
  import(`../../../../../messages/${locale}.json`).then((module) => module.default as unknown)

/**
 * NỘI DUNG TRANG CHỦ. Một màn gom chữ, ảnh, icon, mẫu và video nổi bật của 12 khối trang chủ, xếp theo đúng thứ tự
 * người đọc thấy khi cuộn trang. Cách hoạt động chung của màn nằm ở `PageContentManager`.
 */
export function HomeContentManager() {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')

  return (
    <PageContentManager
      pageKey='home'
      sections={HOME_SECTIONS}
      api={homeAdminApi}
      title={t('nav.homeContent')}
      description={tc('description')}
      loadDefaults={loadMessages}
    />
  )
}
