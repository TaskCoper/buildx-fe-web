'use client'

import { EditOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { CmsContractor, CmsContractorPartnership } from '@/shared/cms'
import { useContractorSave } from '../../hooks/use-contractor-save'
import { partnershipStatusOf } from '../../services/contractor.service'

const { Text, Paragraph } = Typography

const STATUSES = ['none', 'pending', 'verified', 'paused', 'ended'] as const
const STATUS_TAG: Record<(typeof STATUSES)[number], string> = {
  none: 'default',
  pending: 'gold',
  verified: 'green',
  paused: 'orange',
  ended: 'default'
}

/** `since` lưu dạng "MM/YYYY" (trang công khai đọc thẳng), `endedAt` dạng ISO ngày. */
const MONTH = 'MM/YYYY'

type FormValues = Omit<CmsContractorPartnership, 'since' | 'endedAt' | 'signedAt'> & {
  since?: Dayjs | null
  endedAt?: Dayjs | null
  signedAt?: Dayjs | null
}

/**
 * TAB HỢP TÁC SAVICO (ContractorManagement §2, §10).
 *
 * Nhãn "Đối tác đã xác minh" chỉ bật khi quan hệ VÀ tài liệu đều đã xác minh —
 * `derivePublicFields` tính khi lưu. Thay bản scan hoặc mã hồ sơ của tài liệu đã
 * xác minh đưa tài liệu về Chờ xác minh. Ghi chú nội bộ không ra trang công khai.
 */
export function ContractorPartnership({ contractor }: { contractor: CmsContractor }) {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const { commit, isPending } = useContractorSave()
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm<FormValues>()

  const partnership = contractor.partnership
  const status = partnershipStatusOf(partnership)
  const complaints = contractor.legalProfile?.complaintCount

  const openEdit = () => {
    form.setFieldsValue({
      ...partnership,
      status,
      docStatus: partnership.docStatus ?? (partnership.verified ? 'verified' : 'pending'),
      since: partnership.since ? dayjs(partnership.since, MONTH) : null,
      endedAt: partnership.endedAt ? dayjs(partnership.endedAt) : null,
      signedAt: partnership.signedAt ? dayjs(partnership.signedAt) : null
    })
    setEditing(true)
  }

  const submit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const merged = form.getFieldsValue(true) as FormValues
    const next: CmsContractorPartnership = {
      ...partnership,
      ...merged,
      contractCode: (merged.contractCode ?? '').trim(),
      since: merged.since ? merged.since.format(MONTH) : '',
      endedAt: merged.endedAt ? merged.endedAt.format('YYYY-MM-DD') : undefined,
      signedAt: merged.signedAt ? merged.signedAt.format('YYYY-MM-DD') : '',
      internalNote: merged.internalNote?.trim() || undefined
    }
    // Đổi định danh tài liệu đã xác minh → Chờ xác minh lại (§10).
    const docChanged =
      partnership.docStatus === 'verified' &&
      (next.scanUrl !== partnership.scanUrl ||
        next.contractCode !== partnership.contractCode ||
        next.signedAt !== partnership.signedAt ||
        next.pageCount !== partnership.pageCount)
    if (docChanged) next.docStatus = 'pending'
    await commit(
      { ...contractor, partnership: next },
      { group: 'partnership', action: 'partnershipUpdated', after: t(`contractorPartnership.${next.status ?? 'none'}`) }
    )
    if (docChanged) message.warning(t('contractorPartnershipTab.docBackToPending'))
    setEditing(false)
  }

  return (
    <Card
      title={t('contractorPartnershipTab.title')}
      extra={
        <Button icon={<EditOutlined />} onClick={openEdit}>
          {t('contractorPartnershipTab.edit')}
        </Button>
      }
    >
      <Descriptions
        size='small'
        column={{ xs: 1, md: 2 }}
        items={[
          {
            key: 'status',
            label: t('contractors.partnershipStatus'),
            children: (
              <Space size={4} wrap>
                <Tag color={STATUS_TAG[status]}>{t(`contractorPartnership.${status}`)}</Tag>
                {partnership.verified ? <Tag color='green'>{t('contractorPartnershipTab.badgeOn')}</Tag> : null}
              </Space>
            )
          },
          {
            key: 'period',
            label: t('contractorPartnershipTab.period'),
            children: partnership.since
              ? `${partnership.since}${partnership.endedAt ? ` → ${dayjs(partnership.endedAt).format('DD/MM/YYYY')}` : ''}`
              : '-'
          },
          {
            key: 'rate',
            label: t('contractorPartnershipTab.responseRate'),
            children:
              partnership.responseRate === undefined ? t('contractorLegal.noData') : `${partnership.responseRate}%`
          },
          {
            key: 'complaints',
            label: t('contractorPartnershipTab.complaints'),
            children: complaints === undefined ? t('contractorLegal.noData') : complaints
          },
          { key: 'code', label: t('contractorPartnershipTab.code'), children: partnership.contractCode || '-' },
          {
            key: 'signed',
            label: t('contractors.signedAt'),
            children: partnership.signedAt ? dayjs(partnership.signedAt).format('DD/MM/YYYY') : '-'
          },
          { key: 'pages', label: t('contractors.pageCount'), children: partnership.pageCount || '-' },
          {
            key: 'doc',
            label: t('contractorPartnershipTab.docStatus'),
            children: partnership.docStatus ? (
              <Tag color={partnership.docStatus === 'verified' ? 'green' : 'gold'}>
                {t(`contractorPartnershipTab.doc.${partnership.docStatus}`)}
              </Tag>
            ) : (
              '-'
            )
          },
          {
            key: 'scan',
            label: t('contractors.scanUrl'),
            children: partnership.scanUrl ? (
              <Space size={8} wrap>
                <a href={partnership.scanUrl} target='_blank' rel='noreferrer'>
                  {t('contractorLegal.openScan')}
                </a>
                <Tag>
                  {partnership.scanPublic
                    ? t('contractorPartnershipTab.scanPublic')
                    : t('contractorPartnershipTab.scanPrivate')}
                </Tag>
              </Space>
            ) : (
              '-'
            )
          }
        ]}
      />
      <Card size='small' type='inner' title={t('contractorPartnershipTab.internalNote')} style={{ marginTop: 16 }}>
        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
          {partnership.internalNote || <Text type='secondary'>-</Text>}
        </Paragraph>
      </Card>

      <Drawer
        open={editing}
        title={t('contractorPartnershipTab.edit')}
        size={640}
        onClose={() => setEditing(false)}
        extra={
          <Space>
            <Button onClick={() => setEditing(false)}>{t('actions.cancel')}</Button>
            <Button type='primary' loading={isPending} onClick={submit}>
              {t('actions.save')}
            </Button>
          </Space>
        }
      >
        {partnership.docStatus === 'verified' ? (
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 16 }}
            title={t('contractorPartnershipTab.editVerifiedWarning')}
          />
        ) : null}
        <Form form={form} layout='vertical'>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name='status' label={t('contractors.partnershipStatus')}>
                <Select options={STATUSES.map((value) => ({ value, label: t(`contractorPartnership.${value}`) }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='docStatus' label={t('contractorPartnershipTab.docStatus')}>
                <Select
                  options={(['pending', 'verified'] as const).map((value) => ({
                    value,
                    label: t(`contractorPartnershipTab.doc.${value}`)
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='since' label={t('contractorPartnershipTab.since')}>
                <DatePicker picker='month' format={MONTH} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name='endedAt'
                label={t('contractorPartnershipTab.endedAt')}
                dependencies={['since']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value?: Dayjs | null) => {
                      const since = getFieldValue('since') as Dayjs | null | undefined
                      return value && since && value.isBefore(since.startOf('month'))
                        ? Promise.reject(new Error(t('contractorPartnershipTab.endRule')))
                        : Promise.resolve()
                    }
                  })
                ]}
              >
                <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='contractCode' label={t('contractorPartnershipTab.code')}>
                <Input placeholder='SVC-HT-2026-001' />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name='signedAt' label={t('contractors.signedAt')}>
                <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name='pageCount' label={t('contractors.pageCount')}>
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name='scanUrl'
            label={t('contractors.scanUrl')}
            rules={[{ type: 'url', message: t('contractorProjects.urlRule') }]}
          >
            <Input placeholder='https://…' />
          </Form.Item>
          <Form.Item name='scanPublic' valuePropName='checked' label={t('contractorPartnershipTab.scanPublicLabel')}>
            <Switch />
          </Form.Item>
          <Form.Item name='internalNote' label={t('contractorPartnershipTab.internalNote')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  )
}
