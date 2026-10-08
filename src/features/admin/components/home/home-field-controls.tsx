'use client'

import { QuestionCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Input, Select, Spin, Tooltip } from 'antd'
import { Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState, type ComponentProps } from 'react'

import { previewIconNodes } from '@/shared/cms/icon-preview.action'
import { lucideIconKey } from '@/shared/cms/home-sections'
import { adminKeys } from '../../api/admin.keys'
import { guidesAdminApi } from '../../api/bmt/guides.api'
import { listAllLibraryTemplates } from '../../api/bmt/library.api'
import { ICON_NAME_PATTERN } from '../../services/home-sections.service'

/** Đợi người dùng gõ xong rồi mới tra icon, để không gọi server ở mỗi phím bấm. */
const ICON_PREVIEW_DELAY_MS = 400

interface ControlProps<T> {
  value?: T
  onChange?: (value: T) => void
}

/**
 * Ô nhập tên icon lucide-react (`Camera` hoặc `pencil-ruler`) có xem trước ngay trong ô. Tra ở server vì bảng 1500+
 * icon quá nặng để đưa xuống trình duyệt admin; tên không tồn tại thì hiện dấu hỏi và trang chủ dùng icon mặc định.
 */
export function IconNameInput({ value, onChange }: ControlProps<string>) {
  const t = useTranslations('admin.homeContent')
  const [settled, setSettled] = useState((value ?? '').trim())

  useEffect(() => {
    const timer = setTimeout(() => setSettled((value ?? '').trim()), ICON_PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [value])

  const name = ICON_NAME_PATTERN.test(settled) ? settled : ''
  const key = lucideIconKey(name) ?? ''
  const preview = useQuery({
    queryKey: adminKeys.bmt('home-icon', key),
    queryFn: () => previewIconNodes([key]),
    enabled: key !== '',
    staleTime: Infinity
  })
  const node = key ? preview.data?.[key] : undefined

  let prefix = <span className='inline-block size-4' />
  if (key && preview.isFetching) prefix = <Spin size='small' />
  else if (node) prefix = <Icon iconNode={node as ComponentProps<typeof Icon>['iconNode']} size={16} />
  else if (key && preview.isSuccess)
    prefix = (
      <Tooltip title={t('iconNotFound')}>
        <QuestionCircleOutlined />
      </Tooltip>
    )

  return (
    <Input
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      maxLength={64}
      allowClear
      placeholder='Camera'
      prefix={prefix}
    />
  )
}

/** Chọn nhiều mẫu thư viện đã công khai; thứ tự chọn là thứ tự hiện trên trang chủ. */
export function TemplateIdsSelect({ value, onChange, max }: ControlProps<string[]> & { max: number }) {
  const t = useTranslations('admin.homeContent')
  const templates = useQuery({
    queryKey: adminKeys.bmt('home-template-options'),
    queryFn: listAllLibraryTemplates,
    staleTime: 60_000
  })

  const options = (templates.data ?? [])
    .filter((template) => !template.isHidden && template.currentVersionId)
    .map((template) => ({ value: template.templateId, label: template.currentName || template.templateId }))

  return (
    <Select
      mode='multiple'
      value={value}
      onChange={onChange}
      options={options}
      optionFilterProp='label'
      loading={templates.isPending}
      maxCount={max}
      allowClear
      placeholder={t('pickTemplates', { max })}
      notFoundContent={templates.isError ? t('pickLoadError') : undefined}
    />
  )
}

/** Chọn nhiều video hướng dẫn đã đăng; thứ tự chọn là thứ tự hiện trên trang chủ. */
export function GuideIdsSelect({ value, onChange, max }: ControlProps<string[]> & { max: number }) {
  const t = useTranslations('admin.homeContent')
  const guides = useQuery({
    queryKey: adminKeys.bmt('home-guide-options'),
    queryFn: () => guidesAdminApi.list({ pageIndex: 1, pageSize: 100 }),
    staleTime: 60_000
  })

  const options = (guides.data?.page.items ?? [])
    .filter((guide) => guide.state.toLowerCase() === 'published')
    .map((guide) => ({ value: guide.id, label: guide.title || guide.id }))

  return (
    <Select
      mode='multiple'
      value={value}
      onChange={onChange}
      options={options}
      optionFilterProp='label'
      loading={guides.isPending}
      maxCount={max}
      allowClear
      placeholder={t('pickGuides', { max })}
      notFoundContent={guides.isError ? t('pickLoadError') : undefined}
    />
  )
}
