'use client'

import { App } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { cmsSectionsQueryKey, type CmsLocale, type CmsPageKey } from '@/shared/cms/cms-cache'
import { cmsCacheApi } from '../api/cms-cache.api'

/** Ghi dữ liệu đã thành công: lỗi làm mới trang công khai không được báo thành lỗi lưu. */
export function useCmsCacheRefresh() {
  const { message } = App.useApp()
  const t = useTranslations('admin.cmsCache')
  const queryClient = useQueryClient()
  return async (pageKey: CmsPageKey, locale: CmsLocale) => {
    try {
      await cmsCacheApi.revalidate({ pageKey, locale })
    } catch {
      message.warning({ content: t('refreshFailed'), duration: 8 })
    }
    await queryClient.invalidateQueries({ queryKey: cmsSectionsQueryKey(pageKey, locale) })
  }
}
