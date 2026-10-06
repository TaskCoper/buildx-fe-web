'use client'

import { Alert } from 'antd'
import { useTranslations } from 'next-intl'

import { DEFAULT_LOCALE } from '@/i18n/routing'
import { useCmsLocaleStore } from '../../store/cms-locale.store'

/**
 * Nhắc đang biên tập bản dịch nào.
 *
 * Chỉ hiện khi KHÔNG phải ngôn ngữ mặc định — lúc đó dữ liệu trên màn có thể là
 * bản tiếng Việt đang được dùng đỡ (kho rơi về bản mặc định khi ngôn ngữ này
 * chưa có bản riêng), nên lưu một bản ghi là tạo bản dịch mới chứ không phải sửa
 * bản gốc. Không nói rõ thì rất dễ tưởng mình đang sửa bản tiếng Việt.
 */
export function ContentLocaleBanner() {
  const t = useTranslations('admin')
  const locale = useCmsLocaleStore((state) => state.locale)

  if (locale === DEFAULT_LOCALE) return null

  return (
    <Alert
      type='info'
      showIcon
      title={t('shell.translationBannerTitle', { locale: locale.toUpperCase() })}
      description={t('shell.translationBannerBody')}
    />
  )
}
