'use client'

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tooltip,
  Typography
} from 'antd'
import { useTranslations } from 'next-intl'
import { createElement, Suspense, useState, type ReactNode } from 'react'

import { isApiError } from '@/shared/lib/api'
import { HANDBOOK_TOPIC_ICON_KEYS, handbookTopicIcon } from '@/shared/lib/handbook-icons'
import type { PagedResult } from '@/shared/types'
import { adminKeys } from '../../api/admin.keys'
import { handbookAdminApi, type BmtHandbookStageAdmin } from '../../api/bmt/handbook.api'
import { newsAdminApi, type BmtNewsCategory } from '../../api/bmt/news.api'
import { useFormPage } from '../../hooks/use-form-page'
import { sameName } from '../../services/catalog.service'
import {
  canDeleteTopic,
  countArticlesPerTopic,
  instructionTopics,
  type TopicCategory
} from '../../services/handbook-topics.service'
import { ApiResourceManager } from '../common/api-resource-manager'
import { ImageUrlField } from '../common/field-kit'

const { Text, Paragraph } = Typography

const SNAPSHOT_KEY = adminKeys.bmt('handbook-snapshot')
/** Cùng khóa với màn Bài viết để cây danh mục ở đó tải lại sau khi đổi chủ đề. */
const CATEGORIES_KEY = adminKeys.bmt('news-categories', 'all')

/** Trần `pageSize` của danh sách bài quản trị. */
const MAX_PAGE_SIZE = 100

/** Mọi bài ở mọi trạng thái, đọc lần lượt từng trang — chỉ cần `categoryIds` để đếm theo chủ đề. */
async function listAllArticleCategories(): Promise<{ categoryIds: string[] }[]> {
  const all: { categoryIds: string[] }[] = []
  for (let pageIndex = 1; ; pageIndex += 1) {
    const page = await newsAdminApi.listArticles({ pageIndex, pageSize: MAX_PAGE_SIZE })
    all.push(...page.items.map((item) => ({ categoryIds: item.categoryIds })))
    if (!page.hasNextPage) break
  }
  return all
}

interface HandbookSnapshot {
  stages: BmtHandbookStageAdmin[]
  topics: TopicCategory[]
  counts: Record<string, number>
}

/**
 * Ba bước, chủ đề hướng dẫn của từng bước và số bài của mỗi chủ đề. Chủ đề là danh mục gốc bật cờ hướng dẫn nên
 * đọc từ cây danh mục (TDD-HB-001); số bài suy từ danh mục của bài.
 */
async function loadSnapshot(): Promise<HandbookSnapshot> {
  const [stages, categories, articles] = await Promise.all([
    handbookAdminApi.listStages(),
    newsAdminApi.listAllCategories(),
    listAllArticleCategories()
  ])
  const topics = instructionTopics(categories)
  return { stages, topics, counts: countArticlesPerTopic(articles, categories, topics) }
}

type StageRow = BmtHandbookStageAdmin & { topics: TopicCategory[]; counts: Record<string, number> }

/**
 * CÁC BƯỚC TRONG CẨM NANG (STORY-HB-001, BR-HB-001) — dữ liệu trên BMT API.
 *
 * Luôn đúng 3 bước cố định (Phần thô, Phần hoàn thiện, Trang trí nội thất): chỉ
 * sửa ảnh, tên, mô tả — không thêm, xóa hay đổi thứ tự. Nhóm cẩm nang quản lý
 * theo từng bước ở khối bên dưới.
 */
export function HandbookStepManager() {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()

  return (
    <>
      <ApiResourceManager<StageRow>
        title={t('nav.handbookSteps')}
        description={t('handbookSteps.description')}
        queryKey={SNAPSHOT_KEY}
        fetchPage={async (): Promise<PagedResult<StageRow>> => {
          const snapshot = await loadSnapshot()
          const items = snapshot.stages.map((stage) => ({
            ...stage,
            topics: snapshot.topics.filter((topic) => topic.stageId === stage.id),
            counts: snapshot.counts
          }))
          return {
            items,
            pageIndex: 1,
            pageSize: Math.max(items.length, 1),
            totalCount: items.length,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }}
        rowKey={(item) => item.id}
        toFormValues={(item) => ({
          stepNumber: item.stepNumber,
          title: item.title,
          description: item.description,
          coverImageUrl: item.coverImageUrl
        })}
        onUpdate={async (values, item) => {
          await handbookAdminApi.updateStage(item.id, {
            title: String(values.title ?? '').trim(),
            description: String(values.description ?? '').trim(),
            coverImageUrl: String(values.coverImageUrl ?? '').trim(),
            expectedVersion: item.version
          })
          await queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
        }}
        renderView={(item) => (
          <Space orientation='vertical' size={16} style={{ width: '100%' }}>
            {item.coverImageUrl ? <Image src={item.coverImageUrl} alt='' style={{ borderRadius: 8 }} /> : null}
            <Descriptions
              size='small'
              column={1}
              bordered
              items={[
                {
                  key: 'order',
                  label: t('handbookSteps.step'),
                  children: t('handbookSteps.stepN', { index: item.stepNumber })
                },
                { key: 'title', label: t('handbookSteps.name'), children: item.title },
                { key: 'desc', label: t('handbookSteps.descriptionLabel'), children: item.description }
              ]}
            />
            <Table<TopicCategory>
              rowKey='id'
              size='small'
              pagination={false}
              dataSource={item.topics}
              columns={[
                {
                  title: t('handbookGroups.name'),
                  dataIndex: 'name',
                  render: (name: string, topic) => (
                    <Space>
                      {createElement(handbookTopicIcon(topic.iconKey ?? undefined), { size: 16 })}
                      {name}
                    </Space>
                  )
                },
                {
                  title: t('handbookGroups.articles'),
                  key: 'count',
                  width: 120,
                  render: (_, topic) => item.counts[topic.id] ?? 0
                }
              ]}
            />
          </Space>
        )}
        columns={[
          {
            title: t('handbookSteps.step'),
            dataIndex: 'stepNumber',
            width: 90,
            defaultSortOrder: 'ascend',
            sorter: (a, b) => a.stepNumber - b.stepNumber,
            render: (order: number) => <Text strong>{t('handbookSteps.stepN', { index: order })}</Text>
          },
          {
            title: t('handbookSteps.image'),
            dataIndex: 'coverImageUrl',
            width: 110,
            render: (url: string) =>
              url ? (
                <Image src={url} alt='' width={80} height={52} style={{ objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                '-'
              )
          },
          {
            title: t('handbookSteps.name'),
            dataIndex: 'title',
            render: (_, record) => (
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: 'block' }}>
                  {record.title}
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }} ellipsis={{ tooltip: record.description }}>
                  {record.description}
                </Text>
              </div>
            )
          },
          {
            title: t('handbookSteps.groupCount'),
            key: 'groups',
            width: 140,
            render: (_, record) => record.topics.length
          }
        ]}
        renderForm={(form) => (
          <>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                {/* `shouldUpdate`: giá trị `stepNumber` được nạp vào form SAU lần render đầu, không đăng ký thì số bước trống. */}
                <Form.Item label={t('handbookSteps.step')} shouldUpdate>
                  {() => (
                    <Text strong>
                      {t('handbookSteps.stepN', { index: (form.getFieldValue('stepNumber') as number) ?? '' })}
                    </Text>
                  )}
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item
                  name='title'
                  label={t('handbookSteps.name')}
                  rules={[
                    { required: true, whitespace: true, message: t('fields.requiredMessage') },
                    { max: 200, message: t('fields.maxLength', { max: 200 }) }
                  ]}
                >
                  <Input maxLength={200} />
                </Form.Item>
              </Col>
            </Row>
            <ImageUrlField name='coverImageUrl' label={t('handbookSteps.image')} required />
            <Form.Item
              name='description'
              label={t('handbookSteps.descriptionLabel')}
              rules={[
                { required: true, whitespace: true, message: t('fields.requiredMessage') },
                { max: 500, message: t('fields.maxLength', { max: 500 }) }
              ]}
            >
              <Input.TextArea rows={3} maxLength={500} showCount />
            </Form.Item>
          </>
        )}
      />
      {/* Khối nhóm nằm NGOÀI trang Thêm / Sửa / Xem của các bước — mở form thì ẩn, tránh một bảng
          rộng cả bề ngang nằm lệch dưới form đã căn giữa. */}
      <Suspense fallback={null}>
        <HideOnFormPage>
          <HandbookGroups />
        </HideOnFormPage>
      </Suspense>
    </>
  )
}

function HideOnFormPage({ children }: { children: ReactNode }) {
  const { mode } = useFormPage()
  return mode ? null : children
}

interface GroupDraft {
  topic: TopicCategory | null
  stageId: string
}

interface GroupFormValues {
  title: string
  icon: string
  stage: string
}

/**
 * Nhóm cẩm nang theo từng Bước: thêm, sửa tên / icon, xóa khi không còn bài.
 *
 * Một nhóm (chủ đề hướng dẫn) là một danh mục gốc bật cờ hướng dẫn và gắn bước (BR-HB-001), nên mỗi thao tác là
 * một hoặc hai lệnh trên cây danh mục: tạo/đổi tên danh mục rồi đặt bước + biểu tượng.
 */
function HandbookGroups() {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({ queryKey: SNAPSHOT_KEY, queryFn: loadSnapshot, staleTime: 0 })
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<GroupDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<GroupFormValues>()

  const stages = data?.stages ?? []
  const sorted = [...stages].sort((a, b) => a.stepNumber - b.stepNumber)
  const activeId = selected ?? sorted[0]?.id ?? null
  const topics = (data?.topics ?? []).filter((topic) => topic.stageId === activeId)
  const countIn = (topicId: string) => data?.counts[topicId] ?? 0

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    ])

  const fail = (err: unknown) => message.error(isApiError(err) ? err.message : t('feedback.apiError'))

  const open = (next: GroupDraft) => {
    form.setFieldsValue({
      title: next.topic?.name ?? '',
      icon: next.topic?.iconKey ?? undefined,
      stage: next.stageId
    })
    setDraft(next)
  }

  const submit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values || !draft) return
    const stageId = draft.topic ? (draft.topic.stageId ?? values.stage) : values.stage
    const title = values.title.trim()

    // Tên không được trùng với nhóm khác trong cùng Bước. Backend còn kiểm trùng ở cả cấp gốc.
    const siblings = (data?.topics ?? []).filter((topic) => topic.stageId === stageId)
    if (siblings.some((topic) => topic.id !== draft.topic?.id && sameName(topic.name, title))) {
      form.setFields([{ name: 'title', errors: [t('handbookGroups.duplicate')] }])
      return
    }

    setSaving(true)
    try {
      if (draft.topic) await editTopic(draft.topic, title, stageId, values.icon)
      else await createTopic(title, stageId, values.icon)
      await refresh()
      message.success(t('feedback.saved'))
      setDraft(null)
    } catch (err) {
      fail(err)
      // Dữ liệu có thể đã đổi một phần (tạo xong nhưng chưa đặt bước): tải lại để màn khớp với backend.
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (topic: TopicCategory) => {
    try {
      await newsAdminApi.deleteCategory(topic.id, topic.version)
      await refresh()
      message.success(t('handbookGroups.deletedToast', { name: topic.name }))
    } catch (err) {
      fail(err)
      await refresh()
    }
  }

  if (isPending) return <Skeleton active />
  if (error && !data) {
    return <Alert type='error' showIcon title={isApiError(error) ? error.message : t('feedback.apiError')} />
  }

  return (
    <Card
      title={t('handbookGroups.title')}
      extra={
        <Button
          type='primary'
          icon={<PlusOutlined />}
          disabled={!activeId}
          onClick={() => activeId && open({ topic: null, stageId: activeId })}
        >
          {t('handbookGroups.add')}
        </Button>
      }
    >
      <Segmented<string>
        value={activeId ?? undefined}
        onChange={setSelected}
        options={sorted.map((item) => ({
          value: item.id,
          label: t('handbookSteps.stepValue', { index: item.stepNumber, name: item.title })
        }))}
        style={{ marginBottom: 16 }}
      />
      <Table<TopicCategory>
        rowKey='id'
        pagination={false}
        dataSource={topics}
        locale={{ emptyText: t('handbookGroups.empty') }}
        columns={[
          {
            title: t('handbookGroups.icon'),
            key: 'icon',
            width: 70,
            render: (_, topic) => createElement(handbookTopicIcon(topic.iconKey ?? undefined), { size: 18 })
          },
          { title: t('handbookGroups.name'), dataIndex: 'name' },
          { title: t('handbookGroups.articles'), key: 'count', width: 120, render: (_, topic) => countIn(topic.id) },
          {
            title: t('table.actions'),
            key: 'actions',
            width: 110,
            render: (_, topic) => {
              const used = countIn(topic.id)
              return (
                <Space size={0}>
                  <Button
                    type='text'
                    icon={<EditOutlined />}
                    aria-label={t('actions.edit')}
                    onClick={() => open({ topic, stageId: topic.stageId ?? activeId ?? '' })}
                  />
                  {!canDeleteTopic(topic, used) ? (
                    <Tooltip title={t('handbookGroups.inUse', { count: used })}>
                      <Button type='text' danger disabled icon={<DeleteOutlined />} aria-label={t('actions.delete')} />
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title={t('handbookGroups.deleteConfirm', { name: topic.name })}
                      okText={t('actions.delete')}
                      okButtonProps={{ danger: true }}
                      cancelText={t('actions.cancel')}
                      onConfirm={() => remove(topic)}
                    >
                      <Button type='text' danger icon={<DeleteOutlined />} aria-label={t('actions.delete')} />
                    </Popconfirm>
                  )}
                </Space>
              )
            }
          }
        ]}
      />

      <Modal
        open={draft !== null}
        title={draft?.topic ? t('handbookGroups.editTitle') : t('handbookGroups.add')}
        okText={t('actions.save')}
        cancelText={t('actions.cancel')}
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setDraft(null)}
        forceRender
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='stage'
            label={t('handbookGroups.stage')}
            rules={[{ required: true, message: t('fields.requiredMessage') }]}
          >
            {/* Không chuyển nhóm sang Bước khác khi cập nhật (§4). */}
            <Select
              disabled={Boolean(draft?.topic)}
              options={sorted.map((item) => ({
                value: item.id,
                label: t('handbookSteps.stepValue', { index: item.stepNumber, name: item.title })
              }))}
            />
          </Form.Item>
          <Form.Item
            name='title'
            label={t('handbookGroups.name')}
            rules={[
              { required: true, whitespace: true, message: t('fields.requiredMessage') },
              { max: 100, message: t('fields.maxLength', { max: 100 }) }
            ]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name='icon'
            label={t('handbookGroups.icon')}
            rules={[{ required: true, message: t('handbookGroups.iconRequired') }]}
          >
            <Select
              options={HANDBOOK_TOPIC_ICON_KEYS.map((key) => ({
                value: key,
                label: (
                  <Space>
                    {createElement(handbookTopicIcon(key), { size: 16 })}
                    {key}
                  </Space>
                )
              }))}
            />
          </Form.Item>
        </Form>
        <Paragraph type='secondary' style={{ fontSize: 12, marginBottom: 0 }}>
          {t('handbookGroups.hint')}
        </Paragraph>
      </Modal>
    </Card>
  )
}

/**
 * Tạo chủ đề: danh mục gốc mới rồi đặt bước + biểu tượng. Hai lệnh không nằm trong một giao dịch nên nếu lệnh thứ
 * hai lỗi thì gỡ danh mục vừa tạo, để không để lại một nhãn tin tức mồ côi lọt vào bộ lọc bài viết.
 */
async function createTopic(title: string, stageId: string, icon: string): Promise<void> {
  const created: BmtNewsCategory = await newsAdminApi.createCategory({ name: title, parentId: null })
  try {
    await handbookAdminApi.setCategoryHandbook(created.id, {
      stageId,
      isInstruction: true,
      iconKey: icon,
      expectedVersion: created.version
    })
  } catch (err) {
    await newsAdminApi.deleteCategory(created.id, created.version).catch(() => undefined)
    throw err
  }
}

/** Sửa chủ đề: đổi tên khi tên đổi, đặt lại bước và biểu tượng khi biểu tượng đổi. Mỗi lệnh dùng version mới nhất. */
async function editTopic(topic: TopicCategory, title: string, stageId: string, icon: string): Promise<void> {
  let version = topic.version

  if (title !== topic.name) {
    const renamed = await newsAdminApi.updateCategory(topic.id, {
      name: title,
      parentId: null,
      expectedVersion: version
    })
    version = renamed.version
  }

  if (icon !== (topic.iconKey ?? undefined) || stageId !== topic.stageId) {
    await handbookAdminApi.setCategoryHandbook(topic.id, {
      stageId,
      isInstruction: true,
      iconKey: icon,
      expectedVersion: version
    })
  }
}
