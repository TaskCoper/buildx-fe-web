'use client'

import { DeleteOutlined, EyeInvisibleOutlined, FolderOpenOutlined, SendOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  App,
  Button,
  Descriptions,
  Form,
  Image,
  Input,
  InputNumber,
  Segmented,
  Space,
  Spin,
  Tag,
  TreeSelect,
  Typography
} from 'antd'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import {
  NEWS_LIMITS,
  newsAdminApi,
  type BmtAdminArticleItem,
  type BmtArticleWrite,
  type NewsArticleState
} from '../../api/bmt/news.api'
import { buildCategoryTree, categoryPath } from '../../services/news-category.service'
import { ArticleCategoryDrawer } from './article-category-drawer'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { ImageUrlField } from '../common/field-kit'
import { StatusTag, type StatusTone } from '../common/status-tag'
import { TableThumb } from '../common/table-thumb'
import { HtmlContentEditor, HtmlPreview } from './html-content-editor'

const { Text, Paragraph } = Typography

type StateFilter = 'all' | NewsArticleState

const STATE_TONE: Record<NewsArticleState, StatusTone> = {
  Draft: 'warning',
  Published: 'success',
  Hidden: 'off'
}

const RESOURCE = 'news-articles'
const CATEGORIES_KEY = adminKeys.bmt('news-categories', 'all')

interface ArticleFormValues {
  expectedVersion?: number
  title?: string
  readingTimeMinutes?: number | null
  coverImageUrl?: string
  contentHtml?: string
  categoryIds?: string[]
}

/** Chuỗi rỗng / toàn khoảng trắng → `null` (API hiểu là "chưa nhập"). */
const textOrNull = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toWrite(values: ArticleFormValues): BmtArticleWrite {
  return {
    title: textOrNull(values.title),
    readingTimeMinutes: values.readingTimeMinutes ?? null,
    coverImageUrl: textOrNull(values.coverImageUrl),
    contentHtml: textOrNull(values.contentHtml),
    categoryIds: values.categoryIds ?? []
  }
}

/** Các thành phần còn thiếu để công bố mà danh sách đã biết (nội dung chỉ backend kiểm). */
function missingForPublish(item: BmtAdminArticleItem): ('title' | 'cover' | 'category')[] {
  const missing: ('title' | 'cover' | 'category')[] = []
  if (!item.title?.trim()) missing.push('title')
  if (!item.coverImageUrl) missing.push('cover')
  if (!item.categoryIds.length) missing.push('category')
  return missing
}

/**
 * BÀI VIẾT TIN TỨC (STORY-NEWS-001, BR-NEWS-001) — dữ liệu trên BMT API.
 *
 * Vòng đời Nháp → Công bố ⇄ Ẩn; xóa được ở mọi trạng thái (không khôi phục).
 * Bài mới luôn là Nháp và được thiếu mọi trường; chỉ công bố khi đủ năm thành
 * phần: tiêu đề, ảnh đại diện, mô tả ngắn, nội dung, ít nhất một danh mục. Sửa
 * bài đang công bố cũng phải giữ đủ năm thành phần. Mỗi thao tác ghi gửi kèm
 * `version` đã đọc; bản cũ thì backend trả lỗi xung đột và màn hiện nguyên thông báo.
 */
export function ArticleManager() {
  const t = useTranslations('admin')
  const tn = useTranslations('admin.newsArticles')
  const { modal, message } = App.useApp()
  const locale = useLocale() as Locale
  const [state, setState] = useState<StateFilter>('all')
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const { data: categories = [] } = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: newsAdminApi.listAllCategories
  })

  const stateLabel = (value: NewsArticleState) => tn(`states.${value}`)
  const date = (value?: string | null) => (value ? formatDisplayDate(value, locale) : '-')

  return (
    <>
      <ApiResourceManager<BmtAdminArticleItem>
        title={t('nav.articles')}
        description={tn('description')}
        queryKey={adminKeys.bmt(RESOURCE, state)}
        fetchPage={(params) => newsAdminApi.listArticles({ ...params, state: state === 'all' ? undefined : state })}
        rowKey={(item) => item.id}
        searchable
        drawerWidth={820}
        extraActions={
          <Button icon={<FolderOpenOutlined />} onClick={() => setCategoriesOpen(true)}>
            {tn('manageCategories')}
          </Button>
        }
        banner={
          <Segmented<StateFilter>
            value={state}
            onChange={setState}
            options={(['all', 'Draft', 'Published', 'Hidden'] as const).map((value) => ({
              value,
              label: value === 'all' ? tn('states.all') : stateLabel(value)
            }))}
          />
        }
        columns={[
          {
            title: tn('title'),
            key: 'title',
            render: (_, record) => (
              <Space size={10}>
                <TableThumb src={record.coverImageUrl} />
                <div style={{ minWidth: 0, maxWidth: 420 }}>
                  <Text strong style={{ display: 'block' }}>
                    {record.title || <Text type='secondary'>{tn('untitled')}</Text>}
                  </Text>
                </div>
              </Space>
            )
          },
          {
            title: tn('readingTimeMinutes'),
            dataIndex: 'readingTimeMinutes',
            width: 120,
            render: (value?: number | null) => (value == null ? <Text type='secondary'>-</Text> : <Text>{value}</Text>)
          },
          {
            title: tn('categories'),
            key: 'categories',
            width: 240,
            render: (_, record) =>
              record.categoryIds.length ? (
                <Space size={4} wrap>
                  {record.categoryIds.map((id) => (
                    <Tag key={id}>{categoryPath(categories, id)}</Tag>
                  ))}
                </Space>
              ) : (
                <Text type='secondary'>-</Text>
              )
          },
          {
            title: tn('state'),
            dataIndex: 'state',
            width: 130,
            render: (value: NewsArticleState) => <StatusTag tone={STATE_TONE[value]}>{stateLabel(value)}</StatusTag>
          },
          {
            title: tn('firstPublishedAt'),
            dataIndex: 'firstPublishedAtUtc',
            width: 140,
            render: (value?: string | null) => date(value)
          },
          {
            title: tn('modifiedAt'),
            dataIndex: 'modifiedAtUtc',
            width: 140,
            render: (value: string) => date(value)
          }
        ]}
        createValues={() => ({
          title: '',
          readingTimeMinutes: null,
          coverImageUrl: '',
          contentHtml: '',
          categoryIds: []
        })}
        onCreate={(values) => newsAdminApi.createArticle(toWrite(values as ArticleFormValues))}
        toFormValues={async (item) => {
          const detail = await newsAdminApi.getArticle(item.id)
          return {
            expectedVersion: detail.version,
            title: detail.title ?? '',
            readingTimeMinutes: detail.readingTimeMinutes ?? null,
            coverImageUrl: detail.coverImageUrl ?? '',
            contentHtml: detail.contentHtml ?? '',
            categoryIds: detail.categoryIds
          }
        }}
        onUpdate={(values, item) => {
          const form = values as ArticleFormValues
          return newsAdminApi.updateArticle(item.id, {
            ...toWrite(form),
            expectedVersion: form.expectedVersion ?? item.version
          })
        }}
        renderForm={(_form, { item }) => (
          <ArticleFields categories={categories} published={item?.state === 'Published'} />
        )}
        rowActions={(item, ctx) => {
          // Công bố / Ẩn / Xóa — mỗi thao tác gửi `version` đang có của dòng.
          const name = item.title || tn('untitled')
          const run = async (action: () => Promise<unknown>, done: string) => {
            try {
              await action()
              await ctx.refresh()
              message.success(done)
            } catch (err) {
              message.error(isApiError(err) ? err.message : t('feedback.apiError'))
            }
          }
          const missing = missingForPublish(item)
          const actions: RowAction[] = []

          if (item.state === 'Published') {
            actions.push({
              key: 'hide',
              label: tn('hide'),
              icon: <EyeInvisibleOutlined />,
              onClick: () =>
                modal.confirm({
                  title: tn('hideTitle', { name }),
                  content: <div style={{ maxWidth: 300 }}>{tn('hideBody')}</div>,
                  okText: tn('hide'),
                  cancelText: t('actions.cancel'),
                  onOk: () => run(() => newsAdminApi.hideArticle(item.id, item.version), tn('hidden'))
                })
            })
          } else if (missing.length) {
            actions.push({
              key: 'publish',
              label: tn('missing', { fields: missing.map((key) => tn(`parts.${key}`)).join(', ') }),
              icon: <SendOutlined />,
              disabled: true,
              onClick: () => {}
            })
          } else {
            actions.push({
              key: 'publish',
              label: tn('publish'),
              icon: <SendOutlined />,
              onClick: () =>
                modal.confirm({
                  title: tn('publishTitle', { name }),
                  content: <div style={{ maxWidth: 300 }}>{tn('publishBody')}</div>,
                  okText: tn('publish'),
                  cancelText: t('actions.cancel'),
                  onOk: () => run(() => newsAdminApi.publishArticle(item.id, item.version), tn('published'))
                })
            })
          }

          actions.push({
            key: 'delete',
            label: t('actions.delete'),
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () =>
              modal.confirm({
                title: tn('deleteTitle', { name }),
                content: <div style={{ maxWidth: 300 }}>{tn('deleteBody')}</div>,
                okText: t('actions.delete'),
                okButtonProps: { danger: true },
                cancelText: t('actions.cancel'),
                onOk: () => run(() => newsAdminApi.deleteArticle(item.id, item.version), t('feedback.deleted'))
              })
          })

          return actions
        }}
        renderView={(item) => <ArticleView id={item.id} categories={categories} />}
      />
      <ArticleCategoryDrawer open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </>
  )
}

function ArticleFields({
  categories,
  published
}: {
  categories: Awaited<ReturnType<typeof newsAdminApi.listAllCategories>>
  published: boolean
}) {
  const t = useTranslations('admin')
  const tn = useTranslations('admin.newsArticles')
  // Bài đang công bố: bản sửa vẫn phải đủ năm thành phần (BR-NEWS-001 khoản 5).
  const required = published ? [{ required: true, whitespace: true, message: t('fields.requiredMessage') }] : []

  return (
    <>
      <Form.Item name='expectedVersion' hidden>
        <Input />
      </Form.Item>
      {published ? (
        <Paragraph type='warning' style={{ marginTop: 0 }}>
          {tn('publishedEditHint')}
        </Paragraph>
      ) : (
        <Paragraph type='secondary' style={{ marginTop: 0 }}>
          {tn('draftHint')}
        </Paragraph>
      )}
      <ImageUrlField name='coverImageUrl' label={tn('cover')} required={published} />
      <Form.Item
        name='title'
        label={tn('title')}
        rules={[...required, { max: NEWS_LIMITS.title, message: t('fields.maxLength', { max: NEWS_LIMITS.title }) }]}
      >
        <Input maxLength={NEWS_LIMITS.title} showCount />
      </Form.Item>
      <Form.Item name='readingTimeMinutes' label={tn('readingTimeMinutes')}>
        <InputNumber min={0} max={NEWS_LIMITS.readingTimeMinutesMax} precision={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        name='categoryIds'
        label={tn('categories')}
        extra={tn('categoriesHint')}
        rules={published ? [{ required: true, type: 'array', min: 1, message: tn('categoryRequired') }] : []}
      >
        <TreeSelect
          multiple
          allowClear
          treeDefaultExpandAll
          showSearch={{ treeNodeFilterProp: 'title' }}
          treeData={buildCategoryTree(categories)}
          placeholder={tn('pickCategories')}
        />
      </Form.Item>
      <Form.Item
        name='contentHtml'
        label={tn('content')}
        rules={[
          ...required,
          {
            max: NEWS_LIMITS.contentHtml,
            message: t('fields.maxLength', { max: NEWS_LIMITS.contentHtml.toLocaleString() })
          }
        ]}
      >
        <HtmlContentEditor maxLength={NEWS_LIMITS.contentHtml} />
      </Form.Item>
    </>
  )
}

/** Ngăn kéo xem: đọc bản chi tiết (danh sách không kèm nội dung). */
function ArticleView({
  id,
  categories
}: {
  id: string
  categories: Awaited<ReturnType<typeof newsAdminApi.listAllCategories>>
}) {
  const t = useTranslations('admin')
  const tn = useTranslations('admin.newsArticles')
  const locale = useLocale() as Locale
  const { data, isPending, error } = useQuery({
    queryKey: adminKeys.bmt(RESOURCE, 'detail', id),
    queryFn: () => newsAdminApi.getArticle(id),
    staleTime: 0
  })

  if (isPending) return <Spin />
  if (!data) return <Text type='danger'>{isApiError(error) ? error.message : t('feedback.apiError')}</Text>

  const date = (value?: string | null) => (value ? formatDisplayDate(value, locale, { time: true }) : '-')

  return (
    <Space orientation='vertical' size={16} style={{ width: '100%' }}>
      {data.coverImageUrl ? <Image src={data.coverImageUrl} alt='' style={{ borderRadius: 8 }} /> : null}
      <Descriptions
        size='small'
        column={1}
        bordered
        items={[
          { key: 'title', label: tn('title'), children: data.title || '-' },
          {
            key: 'readingTimeMinutes',
            label: tn('readingTimeMinutes'),
            children: data.readingTimeMinutes ?? '-'
          },
          {
            key: 'categories',
            label: tn('categories'),
            children: data.categoryIds.length
              ? data.categoryIds.map((categoryId) => <Tag key={categoryId}>{categoryPath(categories, categoryId)}</Tag>)
              : '-'
          },
          {
            key: 'state',
            label: tn('state'),
            children: <StatusTag tone={STATE_TONE[data.state]}>{tn(`states.${data.state}`)}</StatusTag>
          },
          { key: 'firstPublished', label: tn('firstPublishedAt'), children: date(data.firstPublishedAtUtc) },
          { key: 'created', label: tn('createdAt'), children: date(data.createdAtUtc) },
          { key: 'modified', label: tn('modifiedAt'), children: date(data.modifiedAtUtc) }
        ]}
      />
      {data.contentHtml ? (
        <HtmlPreview html={data.contentHtml} title={tn('content')} height={520} />
      ) : (
        <Text type='secondary'>{tn('noContent')}</Text>
      )}
    </Space>
  )
}
