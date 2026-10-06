'use client'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Typography
} from 'antd'
import type { FormInstance } from 'antd'
import type { NamePath } from 'antd/es/form/interface'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { Link } from '@/i18n/navigation'
import type { CmsContractor, CmsServiceRegion } from '@/shared/cms'
import { ADMIN_ROUTES } from '@/shared/constants'
import { useGetProvinces, useGetWards } from '@/shared/hooks'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { CONTRACTOR_SCOPES } from '../../services/contractor.service'
import { ImageUrlField } from '../common/field-kit'

const { Text } = Typography

const REGIONS: CmsServiceRegion[] = ['north', 'central', 'south']

/** Ba vị trí ảnh doanh nghiệp cố định (§3) — không đổi vai trò theo thứ tự tải lên. */
export const PHOTO_SLOTS = ['hq', 'office', 'team'] as const

const PHONE_PATTERN = /^[0-9+().\s-]{8,20}$/

export interface InvitationCounts {
  /** Lời mời / lịch khảo sát chưa hoàn tất theo nhà thầu. */
  open: Map<string, number>
  /** Mọi lời mời từng phát sinh — căn cứ chặn xóa (§11). */
  all: Map<string, number>
}

export function useOpenInvitations(): InvitationCounts {
  const { data: invitations = [] } = useAdminCollection('contractorInvitations')
  return useMemo(() => {
    const open = new Map<string, number>()
    const all = new Map<string, number>()
    for (const invitation of invitations) {
      all.set(invitation.contractorId, (all.get(invitation.contractorId) ?? 0) + 1)
      if (invitation.status !== 'done' && invitation.status !== 'rejected')
        open.set(invitation.contractorId, (open.get(invitation.contractorId) ?? 0) + 1)
    }
    return { open, all }
  }, [invitations])
}

/**
 * Form hồ sơ nhà thầu (epic ContractorManagement §3–§6): thông tin cơ bản, năng
 * lực, hình ảnh doanh nghiệp, liên hệ nội bộ, địa chỉ / chi nhánh / phạm vi và
 * khả năng hoạt động. Dùng chung cho Thêm và Cập nhật.
 */
export function ContractorFields({ form, openInvitations }: { form: FormInstance; openInvitations: InvitationCounts }) {
  const t = useTranslations('admin')
  const { data: buildingTypes = [] } = useAdminCollection('buildingTypes')
  const current = form.getFieldsValue(true) as CmsContractor
  const linked = current.buildingTypeIds ?? []
  const surveyCapable = Form.useWatch('surveyCapable', form) as boolean | undefined
  const hidden = Form.useWatch('hidden', form) as boolean | undefined
  const pending = openInvitations.open.get(current.id) ?? 0
  const currentYear = new Date().getFullYear()
  const required = { required: true, whitespace: true, message: t('fields.requiredMessage') }

  // Loại Ngừng hoạt động không thêm mới được; loại đã liên kết từ trước vẫn hiện kèm nhãn.
  const typeOptions = buildingTypes
    .filter((type) => type.status === 'active' || linked.includes(type.id))
    .map((type) => ({
      value: type.id,
      label: type.status === 'active' ? type.label : `${type.label} (${t('catalogStatus.inactive')})`,
      disabled: type.status !== 'active'
    }))

  return (
    <>
      <Section title={t('contractors.sections.profile')}>
        <ImageUrlField name='logoUrl' label={t('contractors.logo')} />
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item name='name' label={t('contractors.name')} rules={[required]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item
              name='kind'
              label={t('contractors.kind')}
              extra={t('contractors.kindHint')}
              rules={[required, { max: 100, message: t('fields.maxLength', { max: 100 }) }]}
            >
              <Input maxLength={100} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='shortDescription' label={t('contractors.shortDescription')}>
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name='intro' label={t('contractors.intro')}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={12} md={8}>
            <Form.Item
              name='foundedYear'
              label={t('contractors.foundedYear')}
              rules={[{ type: 'integer', min: 1900, max: currentYear, message: t('contractors.foundedRule') }]}
            >
              <InputNumber min={1900} max={currentYear} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item
              name='teamSize'
              label={t('contractors.teamSize')}
              rules={[{ type: 'integer', min: 0, message: t('contractors.nonNegativeInt') }]}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item
              name='experienceYears'
              label={t('contractors.experienceYears')}
              rules={[{ type: 'integer', min: 0, message: t('contractors.nonNegativeInt') }]}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Section>

      <Section title={t('contractors.sections.capability')}>
        <Form.Item name='strengths' label={t('contractors.specialties')} extra={t('contractors.specialtiesHint')}>
          <Select mode='tags' />
        </Form.Item>
        <Form.Item
          name='buildingTypeIds'
          label={t('contractors.buildingTypes')}
          extra={t('contractors.buildingTypesHint')}
        >
          <Select mode='multiple' options={typeOptions} />
        </Form.Item>
        <Form.Item name='scopes' label={t('contractors.scopes')}>
          <Checkbox.Group
            options={CONTRACTOR_SCOPES.map((value) => ({ value, label: t(`contractorScope.${value}`) }))}
          />
        </Form.Item>
      </Section>

      <Section title={t('contractors.sections.photos')}>
        <Text type='secondary' style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          {t('contractors.photosHint')}
        </Text>
        {PHOTO_SLOTS.map((slot, index) => (
          <ImageUrlField key={slot} name={['photos', index, 'url']} label={t(`contractors.photoSlots.${slot}`)} />
        ))}
      </Section>

      <Section title={t('contractors.sections.contact')}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name={['contact', 'person']} label={t('contractors.person')}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name={['contact', 'phone']}
              label={t('contractors.phone')}
              rules={[{ pattern: PHONE_PATTERN, message: t('contractors.phoneRule') }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name={['contact', 'email']}
              label='Email'
              rules={[{ type: 'email', message: t('fields.emailMessage') }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Section>

      <Section title={t('contractors.sections.coverage')}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('contractors.headquarters')}
        </Text>
        <LocationFields form={form} path={['headquarters']} isHeadquarters />
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name='region' label={t('contractors.region')}>
              <Select options={REGIONS.map((value) => ({ value, label: t(`contractors.regions.${value}`) }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name='serviceAreas' label={t('contractors.serviceAreas')}>
              <Select mode='tags' />
            </Form.Item>
          </Col>
        </Row>

        <Text strong style={{ display: 'block', margin: '8px 0' }}>
          {t('contractors.branches')}
        </Text>
        <Form.List name='branches'>
          {(fields, { add, remove }) => (
            <Space orientation='vertical' size={12} style={{ width: '100%' }}>
              {fields.map((field) => (
                <Card
                  key={field.key}
                  size='small'
                  extra={
                    <Button
                      type='text'
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={t('actions.removeRow')}
                      onClick={() => remove(field.name)}
                    />
                  }
                  title={
                    <Form.Item
                      name={[field.name, 'name']}
                      noStyle
                      rules={[{ required: true, message: t('fields.requiredMessage') }]}
                    >
                      <Input placeholder={t('contractors.branchName')} variant='borderless' />
                    </Form.Item>
                  }
                >
                  <LocationFields form={form} path={['branches', field.name]} />
                  <Form.Item
                    name={[field.name, 'active']}
                    valuePropName='checked'
                    label={t('contractors.branchActive')}
                  >
                    <Switch size='small' />
                  </Form.Item>
                </Card>
              ))}
              <Button
                type='dashed'
                block
                icon={<PlusOutlined />}
                onClick={() =>
                  add({
                    id: `br-${Date.now().toString(36)}`,
                    name: '',
                    provinceCode: null,
                    provinceName: '',
                    wardCode: null,
                    wardName: '',
                    street: '',
                    lat: null,
                    lng: null,
                    radiusKm: null,
                    active: true
                  })
                }
              >
                {t('contractors.addBranch')}
              </Button>
            </Space>
          )}
        </Form.List>
      </Section>

      <Section title={t('contractors.sections.operations')}>
        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Form.Item name='surveyCapable' valuePropName='checked' label={t('contractors.surveyCapable')}>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name='surveyWithinHours'
              label={t('contractors.surveyWithin')}
              rules={
                surveyCapable ? [{ required: true, type: 'integer', min: 1, message: t('contractors.surveyRule') }] : []
              }
            >
              <InputNumber min={1} precision={0} suffix='h' disabled={!surveyCapable} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name='acceptingProjects' valuePropName='checked' label={t('contractors.accepting')}>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name='warrantyMonths'
              label={t('contractors.warranty')}
              rules={[{ type: 'integer', min: 0, message: t('contractors.nonNegativeInt') }]}
            >
              <InputNumber min={0} precision={0} suffix={t('contractors.months')} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name='hidden'
          label={t('contractors.visibility')}
          extra={
            hidden && !current.hidden && pending ? (
              <Alert
                type='warning'
                showIcon
                style={{ marginTop: 8 }}
                title={t('contractors.hideWarning', { count: pending })}
                action={
                  // Mở tab mới để không mất dữ liệu đang nhập trong form (§14).
                  <Link href={ADMIN_ROUTES.INVITATIONS} target='_blank' rel='noreferrer'>
                    {t('contractors.openInvitations')}
                  </Link>
                }
              />
            ) : null
          }
        >
          <Select
            options={[
              { value: false, label: t('contractors.visible') },
              { value: true, label: t('contractors.hiddenTag') }
            ]}
          />
        </Form.Item>
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size='small' type='inner' title={title} style={{ marginBottom: 16 }}>
      {children}
    </Card>
  )
}

/**
 * Địa chỉ theo danh mục hành chính + tọa độ + bán kính (§5): tỉnh và phường bắt
 * buộc chọn từ danh mục; chọn tỉnh thì tải phường của tỉnh đó, đổi tỉnh là xóa
 * phường cũ và buộc chọn lại.
 */
function LocationFields({
  form,
  path,
  isHeadquarters = false
}: {
  form: FormInstance
  path: (string | number)[]
  isHeadquarters?: boolean
}) {
  const t = useTranslations('admin')
  const at = (key: string): NamePath => [...path, key]
  const provinceCode = Form.useWatch(at('provinceCode'), form) as number | null | undefined
  const { provinces, isLoadingProvinces } = useGetProvinces()
  const { wards, isLoadingWards } = useGetWards(provinceCode ?? undefined)
  // Tên trong Form.List đi theo đường dẫn tương đối của hàng; ngoài List thì tuyệt đối.
  const name = (key: string): NamePath => (path[0] === 'branches' ? [path[1] as number, key] : at(key))

  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <Form.Item
          name={name('provinceCode')}
          label={t('contractors.province')}
          rules={[
            {
              required: true,
              message: isHeadquarters ? t('contractors.hqRequired') : t('contractors.provinceRequired')
            }
          ]}
        >
          <Select
            showSearch
            optionFilterProp='label'
            loading={isLoadingProvinces}
            options={provinces.map((province) => ({ value: province.code, label: province.name }))}
            onChange={(code: number) => {
              form.setFieldValue(at('provinceName'), provinces.find((item) => item.code === code)?.name ?? '')
              form.setFieldValue(at('wardCode'), null)
              form.setFieldValue(at('wardName'), '')
            }}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item
          name={name('wardCode')}
          label={t('contractors.ward')}
          rules={[{ required: true, message: t('contractors.wardRequired') }]}
        >
          <Select
            showSearch
            optionFilterProp='label'
            disabled={!provinceCode}
            loading={isLoadingWards}
            options={wards.map((ward) => ({ value: ward.code, label: ward.name }))}
            onChange={(code: number) =>
              form.setFieldValue(at('wardName'), wards.find((item) => item.code === code)?.name ?? '')
            }
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item
          name={name('radiusKm')}
          label={t('contractors.radius')}
          rules={[{ type: 'number', min: 0.1, message: t('contractors.radiusRule') }]}
        >
          <InputNumber min={0.1} step={1} suffix='km' style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item
          name={name('street')}
          label={t('contractors.street')}
          rules={[{ max: 255, message: t('fields.maxLength', { max: 255 }) }]}
        >
          <Input maxLength={255} />
        </Form.Item>
      </Col>
      <Col xs={12}>
        <Form.Item
          name={name('lat')}
          label={t('contractors.lat')}
          rules={[{ type: 'number', min: -90, max: 90, message: t('contractors.latRule') }]}
        >
          <InputNumber step={0.000001} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col xs={12}>
        <Form.Item
          name={name('lng')}
          label={t('contractors.lng')}
          rules={[{ type: 'number', min: -180, max: 180, message: t('contractors.lngRule') }]}
        >
          <InputNumber step={0.000001} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Form.Item name={name('provinceName')} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={name('wardName')} hidden>
        <Input />
      </Form.Item>
    </Row>
  )
}
