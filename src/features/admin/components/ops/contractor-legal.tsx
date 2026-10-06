'use client'

import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined, FieldTimeOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { CmsContractor, CmsContractorLegalProfile } from '@/shared/cms'
import { useContractorSave } from '../../hooks/use-contractor-save'
import { todayKey } from '../../services/admin.service'
import { legalStatusOf, licenseStatusOf, type LicenseStatus } from '../../services/contractor.service'
import { LEGAL_TAG } from './contractor-manager'

const { Text } = Typography

const LICENSE_TAG: Record<LicenseStatus, string> = {
  pending: 'gold',
  verified: 'green',
  rejected: 'red',
  expired: 'default'
}

function stamp(value?: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'
}

function day(value?: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY') : '-'
}

function blankLegal(contractor: CmsContractor): CmsContractorLegalProfile {
  return {
    legalName: '',
    taxCodeMasked: '',
    establishedAt: '',
    operationYears: 0,
    representative: '',
    representativeTitle: '',
    registeredAddress: '',
    primaryBusiness: '',
    workforce: '',
    registrationNumberMasked: '',
    registrationIssuedAt: '',
    registrationStatus: 'pending',
    verifiedAt: '',
    verifiedUntil: '',
    warrantyMonths: contractor.warrantyMonths,
    usesSavicoContract: false,
    hasConstructionInsurance: false,
    cooperationRank: 0,
    cooperationPercent: 0,
    complaintCount: 0,
    licenseStatus: 'pending',
    licenseHistory: []
  }
}

type DateKey = 'establishedAt' | 'registrationIssuedAt' | 'licenseValidUntil'
const DATE_KEYS: DateKey[] = ['establishedAt', 'registrationIssuedAt', 'licenseValidUntil']

type LegalFormValues = Omit<CmsContractorLegalProfile, DateKey> & Partial<Record<DateKey, Dayjs | null>>

/**
 * TAB NĂNG LỰC PHÁP LÝ (ContractorManagement §2, §8).
 *
 * Trạng thái tổng hợp do hệ thống tính. Admin cập nhật thông tin pháp nhân +
 * giấy phép và kiểm duyệt giấy phép: Xác minh / Từ chối (bắt buộc lý do) / Hết
 * hiệu lực. Đổi số hiệu hoặc mã số của giấy phép đã xác minh đưa về Chờ kiểm
 * duyệt. Lịch sử kiểm duyệt chỉ đọc, không ghi đè.
 */
export function ContractorLegal({ contractor }: { contractor: CmsContractor }) {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const { commit, admin, isPending } = useContractorSave()
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [form] = Form.useForm<LegalFormValues>()
  const [reasonForm] = Form.useForm<{ reason: string }>()

  const today = todayKey()
  const legal = contractor.legalProfile
  const status = legalStatusOf(contractor, today)
  const license = licenseStatusOf(legal, today)

  const review = async (next: LicenseStatus, action: string, reason?: string) => {
    if (!legal) return
    const at = new Date().toISOString()
    await commit(
      {
        ...contractor,
        legalProfile: {
          ...legal,
          licenseStatus: next,
          licenseRejectReason: next === 'rejected' ? reason : undefined,
          licenseReviewedAt: at,
          licenseReviewedBy: admin,
          verifiedAt: next === 'verified' ? at : legal.verifiedAt,
          licenseHistory: [{ at, by: admin, status: next, reason }, ...(legal.licenseHistory ?? [])]
        }
      },
      { group: 'legal', action, after: t(`licenseStatus.${next}`), reason }
    )
    message.success(t('contractorLegal.reviewedToast'))
  }

  const submitReject = async () => {
    const values = await reasonForm.validateFields().catch(() => null)
    if (!values) return
    await review('rejected', 'licenseRejected', values.reason.trim())
    setRejecting(false)
  }

  const submitEdit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const base = legal ?? blankLegal(contractor)
    const { establishedAt, registrationIssuedAt, licenseValidUntil, ...fields } = form.getFieldsValue(
      true
    ) as LegalFormValues
    const next: CmsContractorLegalProfile = {
      ...base,
      ...fields,
      legalName: fields.legalName.trim(),
      taxCode: fields.taxCode?.trim(),
      registrationNumber: fields.registrationNumber?.trim(),
      establishedAt: establishedAt?.format('YYYY-MM-DD') ?? '',
      registrationIssuedAt: registrationIssuedAt?.format('YYYY-MM-DD') ?? '',
      licenseValidUntil: licenseValidUntil?.format('YYYY-MM-DD') || undefined
    }
    // Đổi thông tin định danh của giấy phép đã xác minh → Chờ kiểm duyệt lại (§8).
    const identityChanged =
      next.registrationNumber !== base.registrationNumber ||
      next.taxCode !== base.taxCode ||
      next.licenseIssuer !== base.licenseIssuer ||
      next.registrationIssuedAt !== base.registrationIssuedAt ||
      next.licenseValidUntil !== base.licenseValidUntil ||
      next.licenseScanUrl !== base.licenseScanUrl
    if (identityChanged && base.licenseStatus !== 'pending') next.licenseStatus = 'pending'
    await commit(
      { ...contractor, legalProfile: next, warrantyMonths: next.warrantyMonths },
      { group: 'legal', action: 'legalUpdated' }
    )
    if (identityChanged && base.licenseStatus === 'verified') message.warning(t('contractorLegal.backToPending'))
    setEditing(false)
  }

  const openEdit = () => {
    const base = legal ?? blankLegal(contractor)
    const dates = Object.fromEntries(DATE_KEYS.map((key) => [key, base[key] ? dayjs(base[key]) : null]))
    form.setFieldsValue({ ...base, ...dates } as unknown as LegalFormValues)
    setEditing(true)
  }

  const statusBlock = (
    <Space orientation='vertical' size={4}>
      <Tag color={LEGAL_TAG[status]}>{t(`contractorLegal.${status}`)}</Tag>
      {status === 'verified' && legal?.licenseReviewedAt ? (
        <Text type='secondary'>{t('contractorLegal.verifiedAt', { at: stamp(legal.licenseReviewedAt) })}</Text>
      ) : null}
      {status === 'needsMore' ? (
        <Alert
          type='warning'
          showIcon
          title={
            license === 'rejected'
              ? t('contractorLegal.needsRejected', { reason: legal?.licenseRejectReason ?? '-' })
              : license === 'expired'
                ? t('contractorLegal.needsExpired')
                : t('contractorLegal.needsInfo')
          }
        />
      ) : null}
    </Space>
  )

  return (
    <Space orientation='vertical' size={16} style={{ width: '100%' }}>
      <Card
        title={t('contractorLegal.summary')}
        extra={
          <Button icon={<EditOutlined />} onClick={openEdit}>
            {t('contractorLegal.edit')}
          </Button>
        }
      >
        {statusBlock}
      </Card>

      {legal ? (
        <>
          <Card title={t('contractorLegal.entity')}>
            <Descriptions
              size='small'
              column={{ xs: 1, md: 2 }}
              items={[
                { key: 'name', label: t('contractorLegal.legalName'), children: legal.legalName || '-' },
                {
                  key: 'tax',
                  label: t('contractorLegal.taxCode'),
                  children: legal.taxCode || legal.taxCodeMasked || '-'
                },
                { key: 'est', label: t('contractorLegal.establishedAt'), children: day(legal.establishedAt) },
                {
                  key: 'rep',
                  label: t('contractorLegal.representative'),
                  children: legal.representative
                    ? `${legal.representative}${legal.representativeTitle ? ` · ${legal.representativeTitle}` : ''}`
                    : '-'
                },
                {
                  key: 'addr',
                  label: t('contractorLegal.registeredAddress'),
                  children: legal.registeredAddress || '-'
                },
                { key: 'biz', label: t('contractorLegal.primaryBusiness'), children: legal.primaryBusiness || '-' },
                { key: 'work', label: t('contractorLegal.workforce'), children: legal.workforce || '-' }
              ]}
            />
          </Card>

          <Card
            title={t('contractorLegal.licenseTitle')}
            extra={
              license ? (
                <Space wrap>
                  <Popconfirm
                    title={t('contractorLegal.verifyConfirm')}
                    okText={t('actions.confirm')}
                    cancelText={t('actions.cancel')}
                    disabled={license === 'verified'}
                    onConfirm={() => review('verified', 'licenseVerified')}
                  >
                    <Button icon={<CheckCircleOutlined />} disabled={license === 'verified' || isPending}>
                      {t('contractorLegal.verify')}
                    </Button>
                  </Popconfirm>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    disabled={license === 'rejected' || isPending}
                    onClick={() => setRejecting(true)}
                  >
                    {t('contractorLegal.reject')}
                  </Button>
                  <Popconfirm
                    title={t('contractorLegal.expireConfirm')}
                    okText={t('actions.confirm')}
                    cancelText={t('actions.cancel')}
                    disabled={license === 'expired'}
                    onConfirm={() => review('expired', 'licenseExpired')}
                  >
                    <Button icon={<FieldTimeOutlined />} disabled={license === 'expired' || isPending}>
                      {t('contractorLegal.expire')}
                    </Button>
                  </Popconfirm>
                </Space>
              ) : null
            }
          >
            <Descriptions
              size='small'
              column={{ xs: 1, md: 2 }}
              items={[
                {
                  key: 'kind',
                  label: t('contractorLegal.licenseKind'),
                  children: t('contractorLegal.licenseKindValue')
                },
                {
                  key: 'no',
                  label: t('contractorLegal.registrationNumber'),
                  children: legal.registrationNumber || legal.registrationNumberMasked || '-'
                },
                { key: 'issuer', label: t('contractorLegal.issuer'), children: legal.licenseIssuer || '-' },
                { key: 'issued', label: t('contractorLegal.issuedAt'), children: day(legal.registrationIssuedAt) },
                {
                  key: 'valid',
                  label: t('contractorLegal.validUntil'),
                  children: legal.licenseValidUntil ? day(legal.licenseValidUntil) : t('contractorLegal.noExpiry')
                },
                {
                  key: 'status',
                  label: t('contractorLegal.licenseStatus'),
                  children: license ? <Tag color={LICENSE_TAG[license]}>{t(`licenseStatus.${license}`)}</Tag> : '-'
                },
                {
                  key: 'reviewed',
                  label: t('contractorLegal.reviewed'),
                  children: legal.licenseReviewedAt
                    ? `${stamp(legal.licenseReviewedAt)} · ${legal.licenseReviewedBy ?? '-'}`
                    : '-'
                },
                {
                  key: 'scan',
                  label: t('contractorLegal.scan'),
                  children: legal.licenseScanUrl ? (
                    <a href={legal.licenseScanUrl} target='_blank' rel='noreferrer'>
                      {t('contractorLegal.openScan')}
                    </a>
                  ) : (
                    '-'
                  )
                }
              ]}
            />
            {license === 'rejected' && legal.licenseRejectReason ? (
              <Alert
                type='error'
                showIcon
                style={{ marginTop: 12 }}
                title={t('contractorLegal.rejectReasonShown', { reason: legal.licenseRejectReason })}
              />
            ) : null}
          </Card>

          <Card title={t('contractorLegal.commitments')}>
            <Descriptions
              size='small'
              column={{ xs: 1, md: 3 }}
              items={[
                {
                  key: 'warranty',
                  label: t('contractors.warranty'),
                  children: t('contractorLegal.warrantyValue', { months: contractor.warrantyMonths })
                },
                {
                  key: 'contract',
                  label: t('contractorLegal.usesSavicoContract'),
                  children: legal.usesSavicoContract ? t('contractorLegal.yes') : t('contractorLegal.noData')
                },
                {
                  key: 'insurance',
                  label: t('contractorLegal.insurance'),
                  children: legal.hasConstructionInsurance ? t('contractorLegal.yes') : t('contractorLegal.noData')
                }
              ]}
            />
          </Card>

          <Card title={t('contractorLegal.history')}>
            <Table
              rowKey='at'
              size='small'
              pagination={false}
              dataSource={legal.licenseHistory ?? []}
              locale={{ emptyText: <Empty description={t('contractorLegal.noHistory')} /> }}
              columns={[
                {
                  title: t('contractors.historyAt'),
                  dataIndex: 'at',
                  width: 160,
                  render: (value: string) => stamp(value)
                },
                { title: t('contractors.historyBy'), dataIndex: 'by', width: 160 },
                {
                  title: t('contractorLegal.licenseStatus'),
                  dataIndex: 'status',
                  width: 150,
                  render: (value: LicenseStatus) => <Tag color={LICENSE_TAG[value]}>{t(`licenseStatus.${value}`)}</Tag>
                },
                { title: t('contractors.reason'), dataIndex: 'reason', render: (value?: string) => value || '-' }
              ]}
            />
          </Card>
        </>
      ) : (
        <Card>
          <Empty description={t('contractorLegal.empty')} />
        </Card>
      )}

      <Drawer
        open={editing}
        title={t('contractorLegal.edit')}
        size={720}
        onClose={() => setEditing(false)}
        extra={
          <Space>
            <Button onClick={() => setEditing(false)}>{t('actions.cancel')}</Button>
            <Button type='primary' loading={isPending} onClick={submitEdit}>
              {t('actions.save')}
            </Button>
          </Space>
        }
      >
        {license === 'verified' ? (
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 16 }}
            title={t('contractorLegal.editVerifiedWarning')}
          />
        ) : null}
        <Form form={form} layout='vertical'>
          <Card size='small' type='inner' title={t('contractorLegal.entity')} style={{ marginBottom: 16 }}>
            <Form.Item
              name='legalName'
              label={t('contractorLegal.legalName')}
              rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
            >
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name='taxCode'
                  label={t('contractorLegal.taxCode')}
                  rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name='establishedAt' label={t('contractorLegal.establishedAt')}>
                  <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name='representative' label={t('contractorLegal.representative')}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name='representativeTitle' label={t('contractorLegal.representativeTitle')}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name='registeredAddress' label={t('contractorLegal.registeredAddress')}>
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name='primaryBusiness' label={t('contractorLegal.primaryBusiness')}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name='workforce' label={t('contractorLegal.workforce')}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size='small' type='inner' title={t('contractorLegal.licenseTitle')} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name='registrationNumber'
                  label={t('contractorLegal.registrationNumber')}
                  dependencies={['taxCode']}
                  rules={[
                    { required: true, whitespace: true, message: t('fields.requiredMessage') },
                    ({ getFieldValue }) => ({
                      // Đối chiếu mã số doanh nghiệp với mã số thuế của pháp nhân (§8).
                      validator: (_, value?: string) =>
                        !value || !getFieldValue('taxCode') || value.trim() === String(getFieldValue('taxCode')).trim()
                          ? Promise.resolve()
                          : Promise.reject(new Error(t('contractorLegal.numberMismatch')))
                    })
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name='licenseIssuer' label={t('contractorLegal.issuer')}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name='registrationIssuedAt' label={t('contractorLegal.issuedAt')}>
                  <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name='licenseValidUntil'
                  label={t('contractorLegal.validUntil')}
                  extra={t('contractorLegal.validHint')}
                >
                  <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name='licenseScanUrl'
              label={t('contractorLegal.scan')}
              rules={[{ type: 'url', message: t('contractorProjects.urlRule') }]}
            >
              <Input placeholder='https://…' />
            </Form.Item>
          </Card>

          <Card size='small' type='inner' title={t('contractorLegal.commitments')}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name='warrantyMonths'
                  label={t('contractors.warranty')}
                  rules={[{ type: 'integer', min: 0, message: t('contractors.nonNegativeInt') }]}
                >
                  <InputNumber min={0} precision={0} suffix={t('contractors.months')} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name='usesSavicoContract'
                  valuePropName='checked'
                  label={t('contractorLegal.usesSavicoContract')}
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name='hasConstructionInsurance'
                  valuePropName='checked'
                  label={t('contractorLegal.insurance')}
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </Drawer>

      <Modal
        open={rejecting}
        title={t('contractorLegal.rejectTitle')}
        okText={t('contractorLegal.reject')}
        okButtonProps={{ danger: true, loading: isPending }}
        cancelText={t('actions.cancel')}
        onOk={submitReject}
        onCancel={() => setRejecting(false)}
        destroyOnHidden
      >
        <Form form={reasonForm} layout='vertical' preserve={false}>
          <Form.Item
            name='reason'
            label={t('contractors.reason')}
            rules={[{ required: true, whitespace: true, message: t('contractors.reasonRequired') }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
