'use client'

import { useQuery } from '@tanstack/react-query'
import { Image, Input, Select, Spin, Tag, theme } from 'antd'
import { Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'

import { lucideIconKey, type LucideIconNode } from '@/shared/cms/home-sections'
import { adminKeys } from '../../api/admin.keys'
import { homeAdminApi } from '../../api/bmt/home.api'
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

/** Một mục có thể chọn: id, tên, dòng phụ và ảnh. */
interface PickOption {
  id: string
  title: string
  subtitle?: string
  imageUrl?: string | null
}

/** Cỡ ảnh thu nhỏ của một loại mục; `round` cho ảnh đại diện. */
interface Thumb {
  width: number
  height: number
  round?: boolean
}

const TEMPLATE_THUMB: Thumb = { width: 64, height: 44 }
const GUIDE_THUMB: Thumb = { width: 78, height: 44 }
const ARTICLE_THUMB: Thumb = { width: 78, height: 44 }
const ARCHITECT_THUMB: Thumb = { width: 44, height: 44, round: true }

/** Ảnh thu nhỏ, luôn giữ khung (hàng không nhảy cao khi thiếu ảnh) và không mở xem trước khi bấm, để bấm là chọn. */
function PickThumb({ url, thumb }: { url?: string | null; thumb: Thumb }) {
  return (
    <div
      style={{
        width: thumb.width,
        height: thumb.height,
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: thumb.round ? '50%' : 6,
        background: 'var(--admin-placeholder)'
      }}
    >
      {url ? (
        <Image
          src={url}
          alt=''
          width={thumb.width}
          height={thumb.height}
          preview={false}
          style={{ objectFit: 'cover' }}
        />
      ) : null}
    </div>
  )
}

interface RichIdsSelectProps extends ControlProps<string[]> {
  max: number
  options: readonly PickOption[]
  loading: boolean
  failed: boolean
  placeholder: string
  thumb: Thumb
}

/**
 * Ô chọn nhiều có ảnh và tên ở cả danh sách lẫn mục đã chọn, để admin nhận ra mục cần chọn (chỉ tên thì rất khó phân
 * biệt mẫu hay kiến trúc sư). Thứ tự chọn là thứ tự hiện trên trang chủ. Mục đã chọn nhưng không còn trong danh sách
 * công khai (bị ẩn, bị gỡ) hiện thẻ cảnh báo thay vì mã khó hiểu.
 */
function RichIdsSelect({ value, onChange, max, options, loading, failed, placeholder, thumb }: RichIdsSelectProps) {
  const t = useTranslations('admin.homeContent')
  const byId = new Map(options.map((option) => [option.id, option]))
  // Thẻ nhỏ hơn ảnh trong danh sách để vừa một dòng của ô chọn.
  const tagThumb: Thumb = {
    width: Math.round(thumb.width / 2),
    height: Math.round(thumb.height / 2),
    round: thumb.round
  }

  return (
    <Select
      mode='multiple'
      value={value}
      onChange={onChange}
      options={options.map((option) => ({ value: option.id, label: option.title }))}
      filterOption={(input, option) => {
        const found = byId.get(String(option?.value))
        return `${found?.title ?? ''} ${found?.subtitle ?? ''}`.toLowerCase().includes(input.trim().toLowerCase())
      }}
      optionRender={(option) => {
        const found = byId.get(String(option.value))
        if (!found) return option.label
        return (
          <div className='flex items-center gap-3'>
            <PickThumb url={found.imageUrl} thumb={thumb} />
            <div className='min-w-0'>
              <div className='truncate font-medium'>{found.title}</div>
              {found.subtitle ? <div className='text-muted-foreground truncate text-xs'>{found.subtitle}</div> : null}
            </div>
          </div>
        )
      }}
      tagRender={({ value: tagValue, closable, disabled, onClose }) => {
        const found = byId.get(String(tagValue))
        return (
          <Tag
            closable={closable && !disabled}
            onClose={onClose}
            // Giữ ô chọn không bị đóng/mở khi bấm vào thẻ hoặc nút xóa của thẻ.
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            color={found || loading ? undefined : 'warning'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              maxWidth: 280,
              marginInlineEnd: 4,
              padding: '2px 6px'
            }}
          >
            {found ? <PickThumb url={found.imageUrl} thumb={tagThumb} /> : null}
            {!found && loading ? <Spin size='small' /> : null}
            <span className='truncate'>{found ? found.title : loading ? '' : t('pickMissing')}</span>
          </Tag>
        )
      }}
      listHeight={340}
      listItemHeight={thumb.height + 14}
      loading={loading}
      maxCount={max}
      allowClear
      placeholder={placeholder}
      notFoundContent={failed ? t('pickLoadError') : undefined}
    />
  )
}

/** Chọn nhiều mẫu thư viện công khai thuộc loại 2D hoặc 3D; thứ tự chọn là thứ tự hiện trên trang chủ. */
export function TemplateIdsSelect({
  value,
  onChange,
  max,
  kind
}: ControlProps<string[]> & { max: number; kind: '2D' | '3D' }) {
  const t = useTranslations('admin.homeContent')
  const templates = useQuery({
    queryKey: adminKeys.bmt('home-public-templates'),
    queryFn: homeAdminApi.listPublicTemplates,
    staleTime: 60_000
  })

  const options = (templates.data ?? [])
    .filter((template) => template.drawingKind === kind)
    .map<PickOption>((template) => ({
      id: template.templateId,
      title: template.name || template.templateId,
      imageUrl: template.thumbnailUrl,
      subtitle: [
        template.buildingTypeName,
        template.areaM2 ? `${template.areaM2} m²` : '',
        template.floorCount ? t('floors', { count: template.floorCount }) : ''
      ]
        .filter(Boolean)
        .join(' · ')
    }))

  return (
    <RichIdsSelect
      value={value}
      onChange={onChange}
      max={max}
      options={options}
      loading={templates.isPending}
      failed={templates.isError}
      placeholder={t('pickTemplates', { max })}
      thumb={TEMPLATE_THUMB}
    />
  )
}

/** Chọn nhiều bài viết Cẩm nang công khai; thứ tự chọn là thứ tự hiện trên trang chủ. */
export function ArticleIdsSelect({ value, onChange, max }: ControlProps<string[]> & { max: number }) {
  const t = useTranslations('admin.homeContent')
  const articles = useQuery({
    queryKey: adminKeys.bmt('home-public-articles'),
    queryFn: homeAdminApi.listPublicArticles,
    staleTime: 60_000
  })

  const options = (articles.data ?? []).map<PickOption>((article) => ({
    id: article.id,
    title: article.title || article.id,
    imageUrl: article.coverImageUrl,
    subtitle: [
      article.categories?.[0]?.name,
      article.firstPublishedAtUtc ? new Date(article.firstPublishedAtUtc).toLocaleDateString() : ''
    ]
      .filter(Boolean)
      .join(' · ')
  }))

  return (
    <RichIdsSelect
      value={value}
      onChange={onChange}
      max={max}
      options={options}
      loading={articles.isPending}
      failed={articles.isError}
      placeholder={t('pickArticles', { max })}
      thumb={ARTICLE_THUMB}
    />
  )
}

/** "m:ss" của một độ dài tính bằng giây; rỗng khi không có. */
function durationText(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return ''
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
}

/** Chọn nhiều video hướng dẫn công khai; thứ tự chọn là thứ tự hiện trên trang chủ. */
export function GuideIdsSelect({ value, onChange, max }: ControlProps<string[]> & { max: number }) {
  const t = useTranslations('admin.homeContent')
  const guides = useQuery({
    queryKey: adminKeys.bmt('home-public-guides'),
    queryFn: homeAdminApi.listPublicGuides,
    staleTime: 60_000
  })

  const options = (guides.data ?? []).map<PickOption>((guide) => ({
    id: guide.id,
    title: guide.title || guide.id,
    imageUrl:
      guide.metadata?.thumbnailUrl ||
      (guide.youtubeVideoId ? `https://i.ytimg.com/vi/${guide.youtubeVideoId}/hqdefault.jpg` : null),
    subtitle: durationText(guide.metadata?.durationSeconds)
  }))

  return (
    <RichIdsSelect
      value={value}
      onChange={onChange}
      max={max}
      options={options}
      loading={guides.isPending}
      failed={guides.isError}
      placeholder={t('pickGuides', { max })}
      thumb={GUIDE_THUMB}
    />
  )
}

/** Chọn nhiều kiến trúc sư đang hiển thị công khai; thứ tự chọn là thứ tự hiện trên trang chủ. */
export function ArchitectIdsSelect({ value, onChange, max }: ControlProps<string[]> & { max: number }) {
  const t = useTranslations('admin.homeContent')
  const architects = useQuery({
    queryKey: adminKeys.bmt('home-public-architects'),
    queryFn: homeAdminApi.listPublicArchitects,
    staleTime: 60_000
  })

  const options = (architects.data ?? []).map<PickOption>((architect) => ({
    id: architect.id,
    title: architect.fullName || architect.id,
    imageUrl: architect.avatarUrl,
    subtitle: [architect.title, architect.companyName].filter(Boolean).join(' · ')
  }))

  return (
    <RichIdsSelect
      value={value}
      onChange={onChange}
      max={max}
      options={options}
      loading={architects.isPending}
      failed={architects.isError}
      placeholder={t('pickArchitects', { max })}
      thumb={ARCHITECT_THUMB}
    />
  )
}
