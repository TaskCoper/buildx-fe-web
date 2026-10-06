'use client'

import { CheckCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { App, Alert, Form, Input, List, Modal, Select, Switch, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { formatDisplayDateTime } from '@/shared/utils'
import { paymentConnectionsApi, type PaymentConnectionDto } from '../../api/bmt/payment-connections.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'

const { Text } = Typography

const HISTORY_ACTIONS = ['Created', 'Updated', 'Selected'] as const
type HistoryAction = (typeof HISTORY_ACTIONS)[number]
const isHistoryAction = (action: string): action is HistoryAction =>
  (HISTORY_ACTIONS as readonly string[]).includes(action)

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : value)
const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

/** Lịch sử thao tác của một connection — mở trong Modal. */
function HistoryModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const c = useTranslations('admin.paymentConnections')
  const history = useQuery({
    queryKey: ['admin', 'payment-connection-history', id],
    queryFn: () => paymentConnectionsApi.history(id as string, { pageIndex: 1, pageSize: 50 }),
    enabled: id !== null
  })

  return (
    <Modal open={id !== null} title={c('historyTitle')} onCancel={onClose} onOk={onClose} footer={null}>
      <List
        loading={history.isPending}
        dataSource={history.data?.items ?? []}
        locale={{ emptyText: c('historyEmpty') }}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={isHistoryAction(item.action) ? c(`action.${item.action}`) : item.action}
              description={
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {formatDisplayDateTime(item.atUtc, 'vi')}
                  {item.actor ? ` · ${item.actor}` : ''}
                  {item.detail ? ` · ${item.detail}` : ''}
                </Text>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  )
}

/**
 * KẾT NỐI THANH TOÁN (STORY-PAY-001/003) — CRUD gọn tài khoản nhận SePay theo
 * môi trường Test/Live + đặt connection "đang dùng". Không có xoá (theo API).
 */
export function PaymentConnectionManager() {
  const t = useTranslations('admin')
  const c = useTranslations('admin.paymentConnections')
  const { modal, message } = App.useApp()
  const [historyId, setHistoryId] = useState<string | null>(null)

  return (
    <>
      <ApiResourceManager<PaymentConnectionDto>
        title={t('nav.paymentConnections')}
        description={c('description')}
        queryKey={['admin', 'payment-connections']}
        fetchPage={async () => {
          const items = await paymentConnectionsApi.list()
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
        drawerWidth={520}
        createValues={() => ({
          environment: 'Test',
          gateway: '',
          accountNumber: '',
          subAccount: '',
          qrBankCode: '',
          enabled: true
        })}
        onCreate={async (values) => {
          await paymentConnectionsApi.create({
            environment: values.environment === 'Live' ? 'Live' : 'Test',
            gateway: String(values.gateway ?? '').trim(),
            accountNumber: String(values.accountNumber ?? '').trim(),
            subAccount: str(values.subAccount),
            qrBankCode: String(values.qrBankCode ?? '').trim(),
            enabled: Boolean(values.enabled)
          })
        }}
        toFormValues={(item) => ({
          environment: item.environment,
          gateway: item.gateway,
          accountNumber: item.accountNumber,
          subAccount: item.subAccount ?? '',
          qrBankCode: item.qrBankCode,
          enabled: item.enabled,
          expectedVersion: item.version,
          webhookPath: item.webhookPath,
          secretConfigured: item.secretConfigured
        })}
        onUpdate={async (values, item) => {
          await paymentConnectionsApi.update(item.id, {
            expectedVersion: Number(values.expectedVersion),
            gateway: String(values.gateway ?? '').trim(),
            accountNumber: String(values.accountNumber ?? '').trim(),
            subAccount: str(values.subAccount),
            qrBankCode: String(values.qrBankCode ?? '').trim(),
            enabled: Boolean(values.enabled)
          })
        }}
        rowActions={(item, ctx): RowAction[] => {
          const actions: RowAction[] = []
          if (!item.isActive) {
            actions.push({
              key: 'set-active',
              label: c('setActive'),
              icon: <CheckCircleOutlined />,
              disabled: !item.enabled || !item.secretConfigured,
              onClick: () =>
                modal.confirm({
                  title: c('setActiveConfirmTitle', { env: item.environment }),
                  content: c('setActiveConfirmBody'),
                  okText: c('setActive'),
                  cancelText: t('actions.cancel'),
                  onOk: async () => {
                    try {
                      await paymentConnectionsApi.selectActive(item.environment, item.id)
                      message.success(t('feedback.saved'))
                      await ctx.refresh()
                    } catch (err) {
                      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                    }
                  }
                })
            })
          }
          actions.push({
            key: 'history',
            label: c('history'),
            icon: <HistoryOutlined />,
            onClick: () => setHistoryId(item.id)
          })
          return actions
        }}
        columns={[
          {
            title: c('environment'),
            dataIndex: 'environment',
            width: 90,
            render: (_, r) => <Tag color={r.environment === 'Live' ? 'red' : 'blue'}>{r.environment}</Tag>
          },
          { title: c('gateway'), dataIndex: 'gateway' },
          {
            title: c('accountNumber'),
            dataIndex: 'accountNumber',
            render: (_, r) => <Text code>{r.accountNumber}</Text>
          },
          {
            title: c('statusLabel'),
            key: 'status',
            width: 180,
            render: (_, r) => (
              <>
                {r.isActive ? <StatusTag tone='success'>{c('active')}</StatusTag> : null}
                <StatusTag tone={r.enabled ? 'info' : 'off'}>{c(r.enabled ? 'enabled' : 'disabled')}</StatusTag>
                {!r.secretConfigured ? <StatusTag tone='warning'>{c('noSecret')}</StatusTag> : null}
              </>
            )
          }
        ]}
        renderForm={(_form, ctx) => {
          // Đã có đơn hoặc giao dịch thì BE không cho đổi các trường tài khoản nhận (409
          // `PaymentConnectionAccountLocked`) — khoá luôn ở form thay vì để người dùng điền
          // xong mới bị từ chối. Bật/tắt vẫn sửa được.
          const locked = Boolean(ctx.item?.accountLocked)
          return (
            <>
              <Form.Item name='expectedVersion' hidden>
                <Input />
              </Form.Item>
              {locked ? (
                <Alert type='warning' showIcon title={c('accountLockedNote')} style={{ marginBottom: 16 }} />
              ) : null}
              <Form.Item name='environment' label={c('environment')} rules={[{ required: true }]}>
                <Select
                  disabled={!ctx.isNew}
                  options={[
                    { value: 'Test', label: 'Test' },
                    { value: 'Live', label: 'Live' }
                  ]}
                />
              </Form.Item>
              <Form.Item
                name='gateway'
                label={c('gateway')}
                extra={c('gatewayHint')}
                rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
              >
                <Input disabled={locked} />
              </Form.Item>
              <Form.Item
                name='accountNumber'
                label={c('accountNumber')}
                rules={[
                  { required: true, whitespace: true, message: t('fields.requiredMessage') },
                  { max: 64, transform: trimmed, message: t('fields.maxLength', { max: 64 }) }
                ]}
              >
                <Input disabled={locked} />
              </Form.Item>
              <Form.Item name='subAccount' label={c('subAccount')} extra={c('subAccountHint')}>
                <Input disabled={locked} />
              </Form.Item>
              <Form.Item
                name='qrBankCode'
                label={c('qrBankCode')}
                extra={c('qrBankCodeHint')}
                rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
              >
                <Input disabled={locked} />
              </Form.Item>
              <Form.Item name='enabled' label={c('enabled')} valuePropName='checked'>
                <Switch />
              </Form.Item>
              {ctx.item ? (
                // Hai thứ vận hành cần để hoàn tất kết nối: URL webhook dán vào SePay và khoá
                // cấu hình secret đặt trên máy chủ. Thiếu secret thì chưa chọn đang dùng được.
                <div style={{ display: 'grid', gap: 12 }}>
                  <Alert
                    type={ctx.item.secretConfigured ? 'success' : 'warning'}
                    showIcon
                    title={c(ctx.item.secretConfigured ? 'secretOk' : 'secretMissing')}
                  />
                  <div>
                    <Text type='secondary'>{c('connectionId')}</Text>
                    <div>
                      <Text code copyable>
                        {ctx.item.id}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text type='secondary'>{c('webhookPath')}</Text>
                    <div>
                      <Text code copyable>
                        {ctx.item.webhookPath}
                      </Text>
                    </div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {c('webhookPathHint')}
                    </Text>
                  </div>
                  {ctx.item.secretConfigKeys.length ? (
                    <div>
                      <Text type='secondary'>{c('secretKeys')}</Text>
                      {ctx.item.secretConfigKeys.map((key) => (
                        <div key={key}>
                          <Text code copyable>
                            {key}
                          </Text>
                        </div>
                      ))}
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        {c('secretKeysHint')}
                      </Text>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Alert type='info' showIcon title={c('createNote')} />
              )}
            </>
          )
        }}
      />
      <HistoryModal id={historyId} onClose={() => setHistoryId(null)} />
    </>
  )
}
