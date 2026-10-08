'use client'

import { useQuery } from '@tanstack/react-query'
import { Input, Select, Spin, theme } from 'antd'
import { Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'

import { lucideIconKey, type LucideIconNode } from '@/shared/cms/home-sections'
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

/** Tra dữ liệu vẽ icon ở server (`/api/icon-preview`); `null` khi tên không phải icon lucide. */
async function fetchIconNode(name: string): Promise<LucideIconNode | null> {
  const response = await fetch(`/api/icon-preview?name=${encodeURIComponent(name)}`)
  if (!response.ok) throw new Error(`icon-preview ${response.status}`)
  const body = (await response.json()) as { node?: LucideIconNode | null }
  return body.node ?? null
}

/**
 * Ô nhập tên icon lucide-react (`Camera`, `pencil-ruler`, kể cả biệt danh như `Home`) có xem trước ngay trong ô. Tra ở
 * server vì bảng 1500+ icon quá nặng để đưa xuống trình duyệt admin. Tên không tìm thấy hoặc không xem trước được thì
 * báo bằng chữ dưới ô (trang chủ khi đó dùng icon mặc định), không để ô trống khó hiểu.
 */
export function IconNameInput({ value, onChange }: ControlProps<string>) {
  const t = useTranslations('admin.homeContent')
  const { token } = theme.useToken()
  const typed = (value ?? '').trim()
  const [settled, setSettled] = useState(typed)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(typed), ICON_PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [typed])

  const name = ICON_NAME_PATTERN.test(settled) ? settled : ''
  const preview = useQuery({
    queryKey: adminKeys.bmt('home-icon', lucideIconKey(name) ?? name),
    queryFn: () => fetchIconNode(name),
    enabled: name !== '',
    staleTime: Infinity,
    retry: 1
  })

  // Đang gõ dở hoặc đang tra thì hiện vòng quay, chưa kết luận gì.
  const waiting = typed !== settled || (name !== '' && preview.isFetching)

  let prefix: ReactNode = <span className='inline-block size-[18px]' />
  if (waiting && ICON_NAME_PATTERN.test(typed)) prefix = <Spin size='small' />
  else if (name && preview.data) {
    prefix = <Icon iconNode={preview.data as ComponentProps<typeof Icon>['iconNode']} size={18} />
  }

  const problem =
    waiting || name === ''
      ? null
      : preview.isError
        ? 'iconPreviewFailed'
        : preview.isSuccess && !preview.data
          ? 'iconNotFound'
          : null

  return (
    <>
      <Input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        maxLength={64}
        allowClear
        placeholder='Camera'
        prefix={prefix}
        status={problem ? 'warning' : undefined}
      />
      {problem ? (
        <div className='mt-1 text-xs' style={{ color: token.colorWarningText }}>
          {t(problem)}
        </div>
      ) : null}
    </>
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
