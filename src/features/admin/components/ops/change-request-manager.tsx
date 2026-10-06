'use client'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Alert, App, Button, Empty, Form, Input, Modal, Space, Table, Tag, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import type { Locale } from '@/i18n/routing'
import type { CmsSupervisionProject } from '@/shared/cms'
import { useSaveAdminItem } from '../../hooks/use-admin-data'
import {
  decideChangeRequest,
  nextVersion,
  pendingChangeRequests,
  relativeTime,
  type PendingChangeRequest
} from '../../services/ops.service'

const { Text, Paragraph } = Typography

/**
 * YÊU CẦU SỬA ĐỔI của MỘT dự án giám sát (S23, R5) — mở từ dòng dự án ở màn
 * Dự án giám sát, vì duyệt phiên bản hồ sơ giai đoạn là một phần của "cập nhật
 * tiến độ" (spec admin #15), không phải một màn riêng.
 *
 * CR nằm lồng trong từng giai đoạn nên danh sách dựng thẳng từ bản ghi dự án;
 * duyệt xong ghi lại cả dự án, bảng điều khiển của khách thấy ngay phiên bản
 * mới. CR do Giám sát đề xuất (`by: 'GS'`) không có ở đây — cái đó khách duyệt.
 */
export function ChangeRequestModal({
  project,
  onClose
}: {
  project: CmsSupervisionProject | null
  onClose: () => void
}) {
  const t = useTranslations('admin')
  const tStage = useTranslations('supervision.stages')
  const locale = useLocale() as Locale
  const { message } = App.useApp()
  const [form] = Form.useForm<{ response: string }>()

  const save = useSaveAdminItem('supervisionProjects')
  const [target, setTarget] = useState<{ request: PendingChangeRequest; approve: boolean } | null>(null)

  const rows = useMemo(
    () => (project ? pendingChangeRequests([project]).sort((a, b) => a.proposedAt.localeCompare(b.proposedAt)) : []),
    [project]
  )

  function open(request: PendingChangeRequest, approve: boolean) {
    form.setFieldsValue({ response: '' })
    setTarget({ request, approve })
  }

  async function submit() {
    if (!target || !project) return
    // Form sai thì antd reject kèm lỗi từng ô — đã hiện dưới ô, không cần ném tiếp.
    const values = await form.validateFields().catch(() => null)
    if (!values) return

    await save.mutateAsync(
      decideChangeRequest(
        project,
        { stageKey: target.request.stageKey, changeRequestId: target.request.changeRequestId },
        { approve: target.approve, response: values.response }
      )
    )
    message.success(
      t(target.approve ? 'changeRequests.approvedToast' : 'changeRequests.rejectedToast', {
        code: target.request.changeRequestId,
        project: target.request.projectName
      })
    )
    setTarget(null)
  }

  return (
    <Modal
      open={project !== null}
      onCancel={onClose}
      footer={null}
      width={960}
      title={project ? t('changeRequests.modalListTitle', { project: project.projectName }) : ''}
      destroyOnHidden
    >
      <Table<PendingChangeRequest>
        rowKey={(row) => `${row.stageKey}:${row.changeRequestId}`}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={false}
        locale={{ emptyText: <Empty description={t('changeRequests.empty')} /> }}
        columns={[
          {
            title: t('changeRequests.code'),
            dataIndex: 'changeRequestId',
            width: 110,
            render: (id: string, row) => (
              <div>
                <Text code>{id}</Text>
                <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                  {relativeTime(row.proposedAt, locale)}
                </Text>
              </div>
            )
          },
          {
            title: t('changeRequests.stage'),
            key: 'stage',
            width: 230,
            render: (_, row) => (
              <Space orientation='vertical' size={2}>
                <Text>{t('changeRequests.stageLabel', { index: row.stageIndex, name: tStage(row.stageKey) })}</Text>
                <Tag>{t('changeRequests.version', { from: row.stageVersion, to: nextVersion(row.stageVersion) })}</Tag>
              </Space>
            )
          },
          {
            title: t('changeRequests.reason'),
            dataIndex: 'reason',
            render: (reason: string) => (
              <Paragraph style={{ margin: 0, maxWidth: 320 }} ellipsis={{ rows: 3, tooltip: reason }}>
                {reason}
              </Paragraph>
            )
          },
          {
            title: t('changeRequests.due'),
            dataIndex: 'dueAt',
            width: 110,
            render: (dueAt?: string) => (dueAt ? <Text>{dueAt.slice(0, 10)}</Text> : <Text type='secondary'>-</Text>)
          },
          {
            title: t('table.actions'),
            key: 'decide',
            width: 200,
            render: (_, row) => (
              <Space size={6}>
                <Button size='small' type='primary' icon={<CheckOutlined />} onClick={() => open(row, true)}>
                  {t('changeRequests.approve')}
                </Button>
                <Button size='small' danger icon={<CloseOutlined />} onClick={() => open(row, false)}>
                  {t('changeRequests.reject')}
                </Button>
              </Space>
            )
          }
        ]}
      />

      <Modal
        open={target !== null}
        onCancel={() => setTarget(null)}
        onOk={submit}
        confirmLoading={save.isPending}
        okText={target?.approve ? t('changeRequests.approve') : t('changeRequests.reject')}
        okButtonProps={{ danger: target?.approve === false }}
        cancelText={t('actions.cancel')}
        title={target ? t('changeRequests.modalTitle', { code: target.request.changeRequestId }) : ''}
        destroyOnHidden
      >
        {target ? (
          <Form form={form} layout='vertical'>
            <Alert
              type={target.approve ? 'info' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              title={
                target.approve
                  ? t('changeRequests.approveHint', { version: nextVersion(target.request.stageVersion) })
                  : t('changeRequests.rejectHint', { version: target.request.stageVersion })
              }
              description={target.request.reason}
            />
            <Form.Item
              name='response'
              label={t('changeRequests.response')}
              rules={target.approve ? [] : [{ required: true, message: t('changeRequests.responseRequired') }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </Modal>
  )
}
