'use client'

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, LoadingOutlined, SwapOutlined } from '@ant-design/icons'
import { App, Alert, Button, Form, Image, Input, Space, Tooltip, Typography, type FormInstance } from 'antd'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import { guidesAdminApi, type AdminGuide, type GuideVideoPreview } from '../../api/bmt/guides.api'
import { ApiResourceManager, type ApiRowContext } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag, type StatusTone } from '../common/status-tag'
import { TableThumb } from '../common/table-thumb'

const { Text } = Typography

const TITLE_MAX = 100
const DESCRIPTION_MAX = 1000
/** Guides ít (các bước hướng dẫn) nên tải một trang lớn để sắp xếp trong trang. */
const PAGE_SIZE = 50

function durationLabel(seconds?: number): string {
  if (!seconds) return '—'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

const STATE_TONE: Record<string, StatusTone> = {
  Published: 'success',
  Draft: 'warning',
  Hidden: 'off'
}

interface GuideFormValues {
  title?: string
  description?: string
  youtubeUrl?: string
  expectedVersion?: number
}

const trimOrNull = (value?: string) => {
  const next = value?.trim()
  return next ? next : null
}

/**
 * HƯỚNG DẪN (video YouTube) trên BMT API — thay kho CMS cũ. Admin chỉ nhập URL
 * YouTube + tiêu đề + mô tả; BE tự lấy ảnh đại diện, thời lượng và cảnh báo nếu
 * video lỗi. Vòng đời: tạo là Nháp → Công bố (khách thấy) → Ẩn. Sắp xếp thứ tự
 * bằng nút lên/xuống (khóa lạc quan theo `orderVersion` của cả danh sách).
 */
export function GuideVideoManager() {
  const t = useTranslations('admin')
  const g = useTranslations('admin.guideSteps')
  const { message, modal } = App.useApp()
  const listKey = adminKeys.bmt('guides')

  // `move` cần orderVersion của cả danh sách + id các hàng lân cận → giữ lại từ
  // lần tải gần nhất (ApiResourceManager chỉ trả PagedResult cho bảng).
  const orderRef = useRef(0)
  const rowsRef = useRef<AdminGuide[]>([])

  async function run(action: () => Promise<unknown>, ctx: ApiRowContext, success = t('feedback.saved')) {
    try {
      await action()
      message.success(success)
    } catch (err) {
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      await ctx.refresh()
    }
  }

  /** Đưa guide lên/xuống một bậc: đặt TRƯỚC hàng phù hợp (null = xuống cuối). */
  function move(item: AdminGuide, direction: -1 | 1, ctx: ApiRowContext) {
    const rows = rowsRef.current
    const index = rows.findIndex((row) => row.id === item.id)
    if (index < 0) return
    const beforeId = direction === -1 ? (rows[index - 1]?.id ?? null) : (rows[index + 2]?.id ?? null)
    void run(
      () =>
        guidesAdminApi.move(item.id, {
          expectedVersion: item.version,
          expectedOrderVersion: orderRef.current,
          beforeId
        }),
      ctx
    )
  }

  return (
    <ApiResourceManager<AdminGuide>
      title={t('nav.guideVideos')}
      description={g('description')}
      queryKey={listKey}
      searchable
      drawerWidth={640}
      pageSize={PAGE_SIZE}
      fetchPage={async ({ pageIndex, pageSize, keyword }) => {
        const res = await guidesAdminApi.list({ pageIndex, pageSize, keyword: keyword || undefined })
        orderRef.current = res.orderVersion
        rowsRef.current = res.page.items
        return res.page
      }}
      rowKey={(item) => item.id}
      createValues={() => ({ title: '', description: '', youtubeUrl: '' })}
      onCreate={(values) => {
        const form = values as GuideFormValues
        return guidesAdminApi.create({
          title: trimOrNull(form.title),
          description: trimOrNull(form.description),
          youtubeUrl: trimOrNull(form.youtubeUrl)
        })
      }}
      toFormValues={async (item) => {
        const detail = await guidesAdminApi.get(item.id)
        return {
          title: detail.title ?? '',
          description: detail.description ?? '',
          youtubeUrl: detail.youtubeUrl ?? '',
          expectedVersion: detail.version
        }
      }}
      onUpdate={(values, item) => {
        const form = values as GuideFormValues
        return guidesAdminApi.update(item.id, {
          title: trimOrNull(form.title),
          description: trimOrNull(form.description),
          youtubeUrl: trimOrNull(form.youtubeUrl),
          expectedVersion: form.expectedVersion ?? item.version
        })
      }}
      renderForm={(form) => <GuideFields form={form} />}
      renderView={(item) => <GuideView item={item} />}
      rowActions={(item, ctx): RowAction[] => [
        {
          key: 'moveUp',
          label: g('moveUp'),
          icon: <ArrowUpOutlined />,
          disabled: rowsRef.current[0]?.id === item.id,
          onClick: () => move(item, -1, ctx)
        },
        {
          key: 'moveDown',
          label: g('moveDown'),
          icon: <ArrowDownOutlined />,
          disabled: rowsRef.current[rowsRef.current.length - 1]?.id === item.id,
          onClick: () => move(item, 1, ctx)
        },
        {
          key: 'status',
          label: t('actions.switchStatus'),
          icon: <SwapOutlined />,
          onClick: () =>
            modal.confirm({
              title: t('actions.switchStatusTitle', { name: item.title ?? '' }),
              content: t('actions.switchStatusBody', {
                current: g(`states.${item.state === 'Published' ? 'Published' : 'Hidden'}`),
                next: g(`states.${item.state === 'Published' ? 'Hidden' : 'Published'}`)
              }),
              okText: t('actions.confirm'),
              cancelText: t('actions.cancel'),
              onOk: () =>
                run(
                  () =>
                    item.state === 'Published'
                      ? guidesAdminApi.hide(item.id, item.version)
                      : guidesAdminApi.publish(item.id, item.version),
                  ctx
                )
            })
        },
        {
          key: 'delete',
          label: t('actions.delete'),
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () =>
            modal.confirm({
              title: g('deleteAsk', { title: item.title ?? '' }),
              okText: t('actions.confirm'),
              cancelText: t('actions.cancel'),
              okButtonProps: { danger: true },
              onOk: () => run(() => guidesAdminApi.remove(item.id, item.version), ctx, t('feedback.deleted'))
            })
        }
      ]}
      columns={[
        {
          title: g('thumbnail'),
          key: 'thumbnail',
          width: 72,
          render: (_, record) => <TableThumb src={record.metadata?.thumbnailUrl} />
        },
        {
          title: g('title'),
          key: 'title',
          render: (_, record) => (
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ display: 'block' }}>
                {record.title || <Text type='secondary'>{g('untitled')}</Text>}
              </Text>
              {record.description ? (
                <Text type='secondary' style={{ fontSize: 12 }} ellipsis={{ tooltip: record.description }}>
                  {record.description}
                </Text>
              ) : null}
            </div>
          )
        },
        {
          title: g('duration'),
          key: 'duration',
          width: 90,
          align: 'right',
          render: (_, record) => durationLabel(record.metadata?.durationSeconds)
        },
        {
          title: g('statusLabel'),
          key: 'state',
          width: 160,
          render: (_, record) => (
            <Space size={4} wrap>
              <StatusTag tone={STATE_TONE[record.state] ?? 'off'}>
                {record.state === 'Published' || record.state === 'Draft' || record.state === 'Hidden'
                  ? g(`states.${record.state}`)
                  : record.state}
              </StatusTag>
              {record.videoWarning ? (
                <Tooltip title={record.videoWarning}>
                  <StatusTag tone='danger'>{g('warning')}</StatusTag>
                </Tooltip>
              ) : null}
            </Space>
          )
        }
      ]}
    />
  )
}

/** Trường form: URL YouTube + xem trước (BE lấy meta), tiêu đề, mô tả. */
function GuideFields({ form }: { form: FormInstance }) {
  const t = useTranslations('admin')
  const g = useTranslations('admin.guideSteps')
  const { message } = App.useApp()
  const [preview, setPreview] = useState<GuideVideoPreview | null>(null)
  const [loading, setLoading] = useState(false)

  async function onPreview() {
    const url = (form.getFieldValue('youtubeUrl') as string | undefined)?.trim()
    if (!url) return
    setLoading(true)
    try {
      setPreview(await guidesAdminApi.previewVideo(url))
    } catch (err) {
      setPreview(null)
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Form.Item name='expectedVersion' hidden>
        <Input />
      </Form.Item>
      <Form.Item
        name='title'
        label={g('title')}
        rules={[
          { required: true, whitespace: true, message: t('fields.requiredMessage') },
          { max: TITLE_MAX, message: t('fields.maxLength', { max: TITLE_MAX }) }
        ]}
      >
        <Input maxLength={TITLE_MAX} showCount />
      </Form.Item>
      <Form.Item
        name='youtubeUrl'
        label={g('youtubeUrl')}
        extra={g('youtubeHint')}
        rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
      >
        <Input placeholder='https://www.youtube.com/watch?v=…' onChange={() => setPreview(null)} />
      </Form.Item>
      <div style={{ marginBottom: 16 }}>
        <Button size='small' loading={loading} onClick={onPreview}>
          {g('preview')}
        </Button>
        {loading ? (
          <Text type='secondary' style={{ marginLeft: 8 }}>
            <LoadingOutlined /> {g('loadingMeta')}
          </Text>
        ) : preview ? (
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 8,
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              background: 'var(--admin-surface)'
            }}
          >
            <Image
              src={preview.metadata.thumbnailUrl}
              alt=''
              width={160}
              height={90}
              preview={false}
              style={{ objectFit: 'cover', borderRadius: 6, display: 'block', flexShrink: 0 }}
            />
            <Text type='secondary' style={{ fontSize: 13 }}>
              {g('metaLine', { duration: durationLabel(preview.metadata.durationSeconds) })}
            </Text>
          </div>
        ) : null}
      </div>
      <Form.Item
        name='description'
        label={g('descriptionLabel')}
        rules={[
          { required: true, whitespace: true, message: t('fields.requiredMessage') },
          { max: DESCRIPTION_MAX, message: t('fields.maxLength', { max: DESCRIPTION_MAX }) }
        ]}
      >
        <Input.TextArea rows={4} maxLength={DESCRIPTION_MAX} showCount />
      </Form.Item>
    </>
  )
}

/** Chi tiết: nhúng video + cảnh báo nếu BE báo video lỗi. */
function GuideView({ item }: { item: AdminGuide }) {
  const g = useTranslations('admin.guideSteps')
  return (
    <Space orientation='vertical' size={16} style={{ width: '100%' }}>
      {item.videoWarning ? <Alert type='warning' showIcon title={item.videoWarning} /> : null}
      {item.youtubeVideoId ? (
        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden' }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}`}
            title={item.title ?? ''}
            allow='accelerometer; encrypted-media; gyroscope; picture-in-picture'
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      ) : null}
      <div>
        <Text strong style={{ display: 'block' }}>
          {item.title}
        </Text>
        {item.description ? (
          <Text type='secondary' style={{ whiteSpace: 'pre-wrap' }}>
            {item.description}
          </Text>
        ) : null}
      </div>
      <Text type='secondary' style={{ fontSize: 12 }}>
        {g('duration')}: {durationLabel(item.metadata?.durationSeconds)}
      </Text>
    </Space>
  )
}
