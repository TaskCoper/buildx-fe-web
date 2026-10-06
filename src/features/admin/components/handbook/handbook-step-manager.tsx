'use client'

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tooltip,
  Typography
} from 'antd'
import { useTranslations } from 'next-intl'
import { createElement, useState } from 'react'

import type { HandbookStage, HandbookStageId, HandbookTopic } from '@/shared/cms'
import { HANDBOOK_TOPIC_ICON_KEYS, handbookTopicIcon } from '@/shared/lib/handbook-icons'
import { useAdminCollection, useSaveAdminItem } from '../../hooks/use-admin-data'
import { newAdminId } from '../../services/admin.service'
import { sameName } from '../../services/catalog.service'
import { ImageUrlField } from '../common/field-kit'
import { ResourceManager } from '../common/resource-manager'

const { Text, Paragraph } = Typography

/**
 * CÁC BƯỚC TRONG CẨM NANG (epic HandbookStepManagement).
 *
 * Luôn đúng 3 bước cố định (Phần thô, Phần hoàn thiện, Trang trí nội thất): chỉ
 * sửa ảnh, tên, mô tả — không thêm, xóa hay đổi thứ tự. Nhóm cẩm nang quản lý
 * theo từng bước ở khối bên dưới.
 */
export function HandbookStepManager() {
  const t = useTranslations('admin')
  const { data: articles = [] } = useAdminCollection('handbookArticles')
  const countIn = (topicId: string) => articles.filter((article) => article.topicId === topicId).length

  return (
    <>
      <ResourceManager
        collection='handbookStages'
        title={t('nav.handbookSteps')}
        description={t('handbookSteps.description')}
        allowDelete={false}
        fromFormValues={(values, current): HandbookStage => ({
          ...current,
          imageUrl: String(values.imageUrl ?? current.imageUrl).trim(),
          title: String(values.title ?? current.title).trim(),
          description: String(values.description ?? current.description).trim()
        })}
        renderView={(item) => (
          <Space orientation='vertical' size={16} style={{ width: '100%' }}>
            {item.imageUrl ? <Image src={item.imageUrl} alt='' style={{ borderRadius: 8 }} /> : null}
            <Descriptions
              size='small'
              column={1}
              bordered
              items={[
                {
                  key: 'order',
                  label: t('handbookSteps.step'),
                  children: t('handbookSteps.stepN', { index: item.order })
                },
                { key: 'title', label: t('handbookSteps.name'), children: item.title },
                { key: 'desc', label: t('handbookSteps.descriptionLabel'), children: item.description }
              ]}
            />
            <Table<HandbookTopic>
              rowKey='id'
              size='small'
              pagination={false}
              dataSource={item.topics}
              columns={[
                {
                  title: t('handbookGroups.name'),
                  dataIndex: 'title',
                  render: (title: string, topic) => (
                    <Space>
                      {createElement(handbookTopicIcon(topic.icon), { size: 16 })}
                      {title}
                    </Space>
                  )
                },
                {
                  title: t('handbookGroups.articles'),
                  key: 'count',
                  width: 120,
                  render: (_, topic) => countIn(topic.id)
                }
              ]}
            />
          </Space>
        )}
        columns={[
          {
            title: t('handbookSteps.step'),
            dataIndex: 'order',
            width: 90,
            defaultSortOrder: 'ascend',
            sorter: (a, b) => a.order - b.order,
            render: (order: number) => <Text strong>{t('handbookSteps.stepN', { index: order })}</Text>
          },
          {
            title: t('handbookSteps.image'),
            dataIndex: 'imageUrl',
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
            <Form.Item label={t('handbookSteps.step')}>
              <Text strong>{t('handbookSteps.stepN', { index: (form.getFieldValue('order') as number) ?? '' })}</Text>
            </Form.Item>
            <ImageUrlField name='imageUrl' label={t('handbookSteps.image')} required />
            <Form.Item
              name='title'
              label={t('handbookSteps.name')}
              rules={[
                { required: true, whitespace: true, message: t('fields.requiredMessage') },
                { max: 100, message: t('fields.maxLength', { max: 100 }) }
              ]}
            >
              <Input maxLength={100} />
            </Form.Item>
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
      <HandbookGroups />
    </>
  )
}

interface GroupDraft {
  topic: HandbookTopic | null
  stage: HandbookStageId
}

/** Nhóm cẩm nang theo từng Bước (§4): thêm, sửa tên / icon, xóa khi không còn bài. */
function HandbookGroups() {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const { data: stages = [] } = useAdminCollection('handbookStages')
  const { data: articles = [] } = useAdminCollection('handbookArticles')
  const save = useSaveAdminItem('handbookStages')
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  const [selected, setSelected] = useState<HandbookStageId>('structure')
  const [draft, setDraft] = useState<GroupDraft | null>(null)
  const [form] = Form.useForm<{ title: string; icon: string; stage: HandbookStageId }>()
  const stage = sorted.find((item) => item.id === selected)
  const countIn = (topicId: string) => articles.filter((article) => article.topicId === topicId).length

  const open = (next: GroupDraft) => {
    form.setFieldsValue({ title: next.topic?.title ?? '', icon: next.topic?.icon, stage: next.stage })
    setDraft(next)
  }

  const submit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values || !draft) return
    const target = stages.find((item) => item.id === (draft.topic ? draft.topic.stage : values.stage))
    if (!target) return
    const title = values.title.trim()
    // Tên không được trùng với nhóm khác trong cùng Bước.
    if (target.topics.some((topic) => topic.id !== draft.topic?.id && sameName(topic.title, title))) {
      form.setFields([{ name: 'title', errors: [t('handbookGroups.duplicate')] }])
      return
    }
    const topics = draft.topic
      ? target.topics.map((topic) => (topic.id === draft.topic?.id ? { ...topic, title, icon: values.icon } : topic))
      : [...target.topics, { id: newAdminId('grp'), stage: target.id, title, icon: values.icon }]
    await save.mutateAsync({ ...target, topics })
    message.success(t('feedback.saved'))
    setDraft(null)
  }

  const remove = async (topic: HandbookTopic) => {
    if (!stage) return
    await save.mutateAsync({ ...stage, topics: stage.topics.filter((item) => item.id !== topic.id) })
    message.success(t('handbookGroups.deletedToast', { name: topic.title }))
  }

  return (
    <Card
      title={t('handbookGroups.title')}
      extra={
        <Button type='primary' icon={<PlusOutlined />} onClick={() => open({ topic: null, stage: selected })}>
          {t('handbookGroups.add')}
        </Button>
      }
    >
      <Segmented<HandbookStageId>
        value={selected}
        onChange={setSelected}
        options={sorted.map((item) => ({
          value: item.id,
          label: t('handbookSteps.stepValue', { index: item.order, name: item.title })
        }))}
        style={{ marginBottom: 16 }}
      />
      <Table<HandbookTopic>
        rowKey='id'
        pagination={false}
        dataSource={stage?.topics ?? []}
        locale={{ emptyText: t('handbookGroups.empty') }}
        columns={[
          {
            title: t('handbookGroups.icon'),
            key: 'icon',
            width: 70,
            render: (_, topic) => createElement(handbookTopicIcon(topic.icon), { size: 18 })
          },
          { title: t('handbookGroups.name'), dataIndex: 'title' },
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
                    onClick={() => open({ topic, stage: topic.stage })}
                  />
                  {used ? (
                    <Tooltip title={t('handbookGroups.inUse', { count: used })}>
                      <Button type='text' danger disabled icon={<DeleteOutlined />} aria-label={t('actions.delete')} />
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title={t('handbookGroups.deleteConfirm', { name: topic.title })}
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
        confirmLoading={save.isPending}
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
                label: t('handbookSteps.stepValue', { index: item.order, name: item.title })
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
