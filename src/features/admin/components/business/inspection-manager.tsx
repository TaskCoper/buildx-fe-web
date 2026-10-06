'use client'

import { DiffOutlined, PhoneOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { App, Alert, Badge, Button, Form, Input, Modal, Space, Switch, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import type { CmsProjectOwner, CmsStageEvent, CmsSupervisionProject, CmsSupervisionStage } from '@/shared/cms'
import { useAdminCollection, useSaveAdminItem } from '../../hooks/use-admin-data'
import { pendingChangeRequests } from '../../services/ops.service'
import { ResourceManager } from '../common/resource-manager'
import { ChangeRequestModal } from '../ops/change-request-manager'

const { Text } = Typography

interface InspectionFormValues {
  engineer: string
  onSite: boolean
  note: string
}

/** Giai đoạn đang chờ Giám sát xác nhận — mỗi dự án chỉ có tối đa một. */
function activeStage(project: CmsSupervisionProject): CmsSupervisionStage | null {
  return project.stages.find((stage) => stage.status === 'inProgress') ?? null
}

function event(actor: CmsStageEvent['actor'], text: string, at: string, milestone = true): CmsStageEvent {
  return { id: `${Date.now()}-${actor}-${text.length}`, at, actor, text, milestone }
}

/**
 * GIÁM SÁT THI CÔNG — màn của kỹ sư Giám sát SAVICO (R5).
 *
 * R5 nói giai đoạn chỉ KHÓA khi Giám sát xác nhận, và sau khi khóa mọi thay đổi
 * phải đi qua Yêu cầu sửa đổi. Bảng điều khiển của khách (S20–S23) dựng sẵn cả
 * hai nhánh đó, nhưng phía Giám sát thì chưa có chỗ bấm — nên trong bản demo
 * giai đoạn "Đang thực hiện" đứng nguyên mãi và không giai đoạn nào sang được
 * giai đoạn kế.
 *
 * Xác nhận một giai đoạn làm ba việc cùng lúc, vì trong thực tế chúng là một:
 * ghi kết quả kiểm tra và khóa giai đoạn, mở giai đoạn kế tiếp, và ghi mốc vào
 * lịch sử. Tách ra thành ba nút thì sớm muộn cũng có dự án khóa giai đoạn 3 mà
 * giai đoạn 4 vẫn "Sắp tới".
 *
 * `inspectionsUsed` chỉ tăng khi kỹ sư CÓ tới công trình: con số trên thẻ dự án
 * là "lượt kiểm tra hiện trường" của gói, xét hồ sơ từ xa không tiêu lượt nào.
 */
export function InspectionManager() {
  const t = useTranslations('admin')
  const tStageFallback = useTranslations('supervision.stages')
  const { data: stageDefs = [] } = useAdminCollection('supervisionStages')
  // Tên giai đoạn theo danh mục admin quản lý (spec admin #15), trống thì rơi về bản dịch.
  const tStage = (key: CmsSupervisionStage['key']) =>
    stageDefs.find((item) => item.id === key)?.name.trim() || tStageFallback(key)
  const tTier = useTranslations('supervision.tierAlias')
  const { message } = App.useApp()
  const save = useSaveAdminItem('supervisionProjects')

  const [form] = Form.useForm<InspectionFormValues>()

  /**
   * Dự án này của ai. Backend trả sẵn `customer`; bản ghi cũ thiếu thì tra người
   * mua trong đơn gói giám sát gắn với đúng dự án (R8: đơn giám sát luôn có
   * `projectId`).
   */
  const { data: orders = [] } = useAdminCollection('orders')
  const ownerOf = useMemo(() => {
    const buyers = new Map<string, CmsProjectOwner>()
    for (const order of orders) {
      if (order.product.kind === 'supervision' && order.projectId && !buyers.has(order.projectId)) {
        buyers.set(order.projectId, order.buyer)
      }
    }
    return (project: CmsSupervisionProject) => project.customer ?? buyers.get(project.id)
  }, [orders])
  const [target, setTarget] = useState<CmsSupervisionProject | null>(null)
  /** Dự án đang mở danh sách yêu cầu sửa đổi — giữ id để luôn đọc bản mới nhất sau khi duyệt. */
  const [crProjectId, setCrProjectId] = useState<string | null>(null)
  const { data: projects = [] } = useAdminCollection('supervisionProjects')
  const crProject = projects.find((item) => item.id === crProjectId) ?? null

  const stage = target ? activeStage(target) : null

  function open(project: CmsSupervisionProject) {
    const current = activeStage(project)
    if (!current) return
    setTarget(project)
    form.setFieldsValue({ engineer: project.engineer, onSite: true, note: '' })
  }

  async function confirm() {
    if (!target || !stage) return
    // Form sai thì antd reject kèm lỗi từng ô — đã hiện dưới ô, không cần ném tiếp.
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const at = new Date().toISOString()

    const stages = target.stages.map<CmsSupervisionStage>((item) => {
      if (item.key === stage.key) {
        return {
          ...item,
          status: 'confirmed',
          // Khách chưa bấm hoàn thành thì lấy luôn thời điểm xác nhận làm ngày
          // kết thúc thực tế — giai đoạn đã khóa mà không có ngày kết thúc sẽ
          // hiện "đang chạy" trên dòng thời gian của S20.
          actualEnd: item.actualEnd ?? at,
          inspection: { confirmedAt: at, engineer: values.engineer, onSite: values.onSite, note: values.note },
          history: [
            ...item.history,
            event('GS', `Giám sát xác nhận giai đoạn ${item.index} – hồ sơ khóa ở ${item.version}`, at)
          ]
        }
      }

      // Giai đoạn kế tiếp mở ra ngay: xác nhận xong mà còn phải vào sửa tay thì
      // trước sau cũng có dự án đứng im giữa hai giai đoạn.
      if (item.index === stage.index + 1 && item.status === 'upcoming') {
        return {
          ...item,
          status: 'inProgress',
          actualStart: item.actualStart ?? at,
          history: [...item.history, event('SYS', `Bắt đầu giai đoạn ${item.index}`, at)]
        }
      }

      return item
    })

    await save.mutateAsync({
      ...target,
      stages,
      inspectionsUsed: values.onSite
        ? Math.min(target.inspectionsUsed + 1, target.inspectionsTotal)
        : target.inspectionsUsed
    })

    message.success(t('inspections.confirmedToast', { stage: tStage(stage.key) }))
    setTarget(null)
  }

  return (
    <>
      <ResourceManager
        collection='supervisionProjects'
        title={t('nav.inspections')}
        description={t('inspections.description')}
        allowDelete={false}
        allowEdit={false}
        searchText={(item) => {
          const owner = ownerOf(item)
          return `${item.id} ${item.projectName} ${item.engineer} ${item.packageCode} ${owner?.name ?? ''} ${owner?.phone ?? ''} ${owner?.email ?? ''}`
        }}
        columns={[
          {
            title: t('inspections.project'),
            dataIndex: 'projectName',
            render: (_, record) => (
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: 'block' }}>
                  {record.projectName}
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {record.id} · {record.packageCode}
                </Text>
              </div>
            )
          },
          {
            title: t('inspections.customer'),
            key: 'customer',
            width: 220,
            render: (_, record) => {
              const owner = ownerOf(record)
              if (!owner) return <Text type='warning'>{t('inspections.noCustomer')}</Text>
              return (
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: 'block' }}>
                    {owner.name}
                  </Text>
                  {owner.phone ? (
                    <Text copyable={{ text: owner.phone }} type='secondary' style={{ display: 'block', fontSize: 12 }}>
                      <PhoneOutlined /> {owner.phone}
                    </Text>
                  ) : null}
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {owner.email}
                  </Text>
                </div>
              )
            }
          },
          {
            title: t('inspections.package'),
            dataIndex: 'packageTier',
            width: 140,
            render: (tier: CmsSupervisionProject['packageTier']) => <Tag color='blue'>{tTier(tier)}</Tag>
          },
          {
            title: t('inspections.engineer'),
            dataIndex: 'engineer',
            width: 190
          },
          {
            title: t('inspections.currentStage'),
            key: 'stage',
            width: 260,
            render: (_, record) => {
              const current = activeStage(record)
              if (!current) return <Tag color='green'>{t('inspections.allConfirmed')}</Tag>
              return (
                <div style={{ minWidth: 0 }}>
                  <Text style={{ display: 'block' }}>{tStage(current.key)}</Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {t('inspections.stageOf', { index: current.index, total: record.stages.length })} ·{' '}
                    {current.actualEnd ? t('inspections.readyToConfirm') : t('inspections.pendingUpload')}
                  </Text>
                </div>
              )
            }
          },
          {
            title: t('inspections.visits'),
            key: 'visits',
            width: 110,
            render: (_, record) => (
              <div>
                <Text style={{ display: 'block' }}>
                  {t('inspections.visitsUsed', { used: record.inspectionsUsed, total: record.inspectionsTotal })}
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {t('inspections.visitsLeft', {
                    left: Math.max(0, record.inspectionsTotal - record.inspectionsUsed)
                  })}
                </Text>
              </div>
            )
          },
          {
            title: t('table.actions'),
            key: 'confirm',
            width: 360,
            // Nút luôn có mặt, cùng bề ngang — dự án đã xong 6 giai đoạn thì mờ đi
            // chứ không biến thành một dấu gạch làm cột nhảy.
            render: (_, record) => {
              const pending = pendingChangeRequests([record]).length
              return (
                <Space size={6}>
                  <Button
                    size='small'
                    type='primary'
                    icon={<SafetyCertificateOutlined />}
                    disabled={!activeStage(record)}
                    style={{ width: 168 }}
                    onClick={() => open(record)}
                  >
                    {t('inspections.confirm')}
                  </Button>
                  <Badge count={pending} size='small'>
                    <Button size='small' icon={<DiffOutlined />} onClick={() => setCrProjectId(record.id)}>
                      {t('inspections.changeRequests')}
                    </Button>
                  </Badge>
                </Space>
              )
            }
          }
        ]}
        renderForm={() => null}
      />

      <Modal
        open={Boolean(target)}
        title={stage ? t('inspections.confirmTitle', { stage: tStage(stage.key) }) : ''}
        okText={t('inspections.confirm')}
        cancelText={t('actions.cancel')}
        confirmLoading={save.isPending}
        onOk={confirm}
        onCancel={() => setTarget(null)}
        destroyOnHidden
      >
        {stage && !stage.actualEnd ? (
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 16 }}
            message={t('inspections.pendingUpload')}
            description={t('inspections.pendingUploadBody')}
          />
        ) : null}

        <Form form={form} layout='vertical' requiredMark={false}>
          <Form.Item
            name='engineer'
            label={t('inspections.engineerLabel')}
            rules={[{ required: true, message: t('inspections.engineerRequired') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name='onSite'
            label={t('inspections.onSiteLabel')}
            valuePropName='checked'
            extra={t('inspections.onSiteHint')}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name='note'
            label={t('inspections.noteLabel')}
            rules={[{ required: true, message: t('inspections.noteRequired') }]}
          >
            <Input.TextArea rows={3} maxLength={500} placeholder={t('inspections.notePlaceholder')} />
          </Form.Item>
        </Form>

        <Text type='secondary' style={{ fontSize: 12 }}>
          {t('inspections.lockNote')}
        </Text>
      </Modal>
      <ChangeRequestModal project={crProject} onClose={() => setCrProjectId(null)} />
    </>
  )
}
