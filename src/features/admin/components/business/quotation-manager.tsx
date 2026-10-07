'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, DatePicker, Descriptions, Form, Input, Select, Spin, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useAuthStore } from '@/shared/auth'
import { errorCodeOf, isApiError } from '@/shared/lib/api'
import {
  quotationApi,
  QuotationDossier,
  QUOTATION_STATUSES,
  type QuotationItem,
  type QuotationStatus
} from '@/shared/quotations'
import { ApiResourceManager, type ApiRowContext } from '../common/api-resource-manager'

export function QuotationManager() {
  const t = useTranslations('contractors.rfq')
  const admin = useTranslations('admin')
  const format = useFormatter()
  const userId = useAuthStore((state) => state.user?.id)
  const [status, setStatus] = useState<QuotationStatus | undefined>()
  const stamp = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })
  return (
    <ApiResourceManager<QuotationItem>
      title={admin('nav.invitations')}
      description={t('adminDescription')}
      queryKey={['admin', 'quotation-requests', userId, status]}
      rowKey={(item) => item.id}
      searchable
      searchPlaceholder={admin('invitations.searchBySiteCode')}
      fetchPage={({ pageIndex, pageSize, keyword }) =>
        quotationApi.adminList({ pageIndex, pageSize, status, ...(keyword ? { siteCode: keyword } : {}) })
      }
      drawerWidth={850}
      banner={
        <Select
          allowClear
          placeholder={t('allStatuses')}
          aria-label={t('allStatuses')}
          value={status}
          onChange={setStatus}
          style={{ minWidth: 220 }}
          options={QUOTATION_STATUSES.map((value) => ({ value, label: t(`states.${value}`) }))}
        />
      }
      columns={[
        {
          key: 'site',
          title: admin('invitations.project'),
          render: (_, item) => (
            <div className='flex flex-col'>
              <span>{item.siteName}</span>
              {item.siteCode ? (
                <Typography.Text type='secondary' code style={{ fontSize: 12 }}>
                  {item.siteCode}
                </Typography.Text>
              ) : null}
            </div>
          )
        },
        { key: 'contractor', title: admin('invitations.contractor'), dataIndex: 'contractorName' },
        { key: 'status', title: admin('invitations.status'), render: (_, item) => t(`states.${item.status}`) },
        { key: 'desired', title: t('desired'), render: (_, item) => stamp(item.desiredAtUtc) },
        { key: 'appointment', title: t('appointment'), render: (_, item) => stamp(item.appointmentAtUtc) }
      ]}
      renderView={(item, ctx) => <QuotationAdminDetail id={item.id} ctx={ctx} />}
    />
  )
}
function QuotationAdminDetail({ id, ctx }: { id: string; ctx: ApiRowContext }) {
  const t = useTranslations('contractors.rfq')
  const admin = useTranslations('admin')
  const format = useFormatter()
  const userId = useAuthStore((state) => state.user?.id)
  const query = useQuery({
    queryKey: ['admin', 'quotation-detail', userId, id],
    queryFn: () => quotationApi.adminDetail(id),
    retry: false
  })
  const client = useQueryClient()
  const { message } = App.useApp()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const reload = async () => {
    const result = await query.refetch()
    if (result.isSuccess) {
      setConflict(false)
      setError(null)
    }
  }
  if (query.isError)
    return (
      <Alert type='error' showIcon title={t('loadFailed')} action={<Button onClick={reload}>{t('retry')}</Button>} />
    )
  if (query.isPending || query.isFetching) return <Spin />
  const detail = query.data
  const request = detail.request
  const submit = async (values: { status: QuotationStatus; appointmentAt: Dayjs; internalNote: string }) => {
    setSaving(true)
    setError(null)
    try {
      await quotationApi.update(id, {
        status: values.status,
        appointmentAt: values.appointmentAt.format('YYYY-MM-DDTHH:mm:ss') + '+07:00',
        internalNote: values.internalNote?.trim() || null,
        expectedVersion: detail.version
      })
      message.success(t('saved'))
      await Promise.all([
        query.refetch(),
        ctx.refresh(),
        client.invalidateQueries({ queryKey: ['contractors', 'invitations'] })
      ])
    } catch (cause) {
      if (errorCodeOf(cause) === 'QuotationVersionConflict') {
        setConflict(true)
        setError(t('versionConflict'))
      } else setError(isApiError(cause) ? cause.message : t('sendFailed'))
    } finally {
      setSaving(false)
    }
  }
  const vn = dayjs(new Date(request.request.appointmentAtUtc).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }))
  return (
    <div className='space-y-5'>
      <Descriptions
        bordered
        size='small'
        column={1}
        items={[
          { key: 'site', label: admin('invitations.project'), children: request.snapshot.siteName },
          {
            key: 'siteCode',
            label: admin('invitations.siteCode'),
            children: request.request.siteCode ? (
              <Typography.Text copyable>{request.request.siteCode}</Typography.Text>
            ) : (
              '—'
            )
          },
          { key: 'customer', label: admin('invitations.customer'), children: detail.customerEmail },
          { key: 'contractor', label: admin('invitations.contractor'), children: request.request.contractorName },
          { key: 'phone', label: t('phone'), children: request.contactPhone },
          {
            key: 'note',
            label: t('note'),
            children: <p className='whitespace-pre-wrap break-words'>{request.surveyNote ?? '—'}</p>
          },
          {
            key: 'desired',
            label: t('desired'),
            children: format.dateTime(new Date(request.request.desiredAtUtc), {
              dateStyle: 'short',
              timeStyle: 'short',
              timeZone: 'Asia/Ho_Chi_Minh'
            })
          }
        ]}
      />
      {error ? (
        <Alert
          type='error'
          showIcon
          title={error}
          action={conflict ? <Button onClick={reload}>{t('refresh')}</Button> : undefined}
        />
      ) : null}
      <Form
        key={detail.version}
        layout='vertical'
        initialValues={{ status: request.request.status, appointmentAt: vn, internalNote: detail.internalNote ?? '' }}
        onFinish={submit}
        disabled={saving || conflict}
      >
        <Form.Item name='status' label={admin('invitations.status')} rules={[{ required: true }]}>
          <Select options={QUOTATION_STATUSES.map((value) => ({ value, label: t(`states.${value}`) }))} />
        </Form.Item>
        <Form.Item name='appointmentAt' label={t('appointment')} rules={[{ required: true }]}>
          <DatePicker showTime format='DD/MM/YYYY HH:mm' style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name='internalNote' label={t('internalNote')} rules={[{ max: 5000 }]}>
          <Input.TextArea rows={3} maxLength={5000} showCount />
        </Form.Item>
        <Button type='primary' htmlType='submit' loading={saving}>
          {t('save')}
        </Button>
      </Form>
      <QuotationDossier detail={request} />
    </div>
  )
}
