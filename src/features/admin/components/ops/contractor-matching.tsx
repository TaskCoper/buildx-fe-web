'use client'

import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  InputNumber,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Typography
} from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { isContractorEligible, type CmsContractorMatching, type CmsServiceRegion } from '@/shared/cms'
import { useAdminCollection, useAdminDocument, useSaveAdminDocument } from '../../hooks/use-admin-data'
import { todayKey } from '../../services/admin.service'
import { AdminPage } from '../common/admin-page'
import { MockApiNotice } from '../common/mock-api-notice'

const { Text } = Typography

const REGIONS: CmsServiceRegion[] = ['north', 'central', 'south']
const CRITERIA = ['acceptingOnly', 'verifiedOnly', 'legalVerifiedOnly', 'surveyCapableOnly', 'capabilityMatch'] as const

type FormValues = Omit<CmsContractorMatching, 'radiusOptions'> & { radiusOptions: (string | number)[] }

/** Nấc bán kính: số dương, không trùng, tăng dần. */
function parseRadii(values: (string | number)[] = []): number[] {
  return [...new Set(values.map(Number).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b)
}

/**
 * QUY TẮC ĐỀ XUẤT NHÀ THẦU (spec admin #12 — STORY-027, BR-074 → BR-076).
 *
 * Một tài liệu cấu hình mà trang "Nhà thầu được đề xuất" đọc trực tiếp: khu vực
 * được hỗ trợ, các nấc bán kính, loại công trình được đề xuất và tiêu chí đủ
 * điều kiện. Nhà thầu Ẩn không bao giờ được đề xuất — không có công tắc cho việc
 * đó. Khối xem trước đếm nhà thầu đang đạt tiêu chí theo cấu hình đang nhập.
 */
export function ContractorMatchingEditor() {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const { data, isPending } = useAdminDocument('contractorMatching')
  const save = useSaveAdminDocument('contractorMatching')
  const { data: buildingTypes = [] } = useAdminCollection('buildingTypes')
  const { data: contractors = [] } = useAdminCollection('contractors')

  const radii = parseRadii(Form.useWatch('radiusOptions', form))
  const watched = Form.useWatch([], form) as FormValues | undefined

  useEffect(() => {
    if (data) form.setFieldsValue(data)
  }, [data, form])

  if (isPending || !data) return <Skeleton active paragraph={{ rows: 10 }} />

  const preview: CmsContractorMatching | null = watched?.criteria
    ? { ...data, ...watched, radiusOptions: radii, criteria: { ...data.criteria, ...watched.criteria } }
    : null
  const eligible = preview
    ? contractors.filter((contractor) => isContractorEligible(contractor, preview, todayKey())).length
    : 0

  const linked = data.buildingTypeIds
  const typeOptions = buildingTypes
    .filter((type) => type.status === 'active' || linked.includes(type.id))
    .map((type) => ({
      value: type.id,
      label: type.status === 'active' ? type.label : `${type.label} (${t('catalogStatus.inactive')})`,
      disabled: type.status !== 'active'
    }))

  const submit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const merged = form.getFieldsValue(true) as FormValues
    await save.mutateAsync({ ...data, ...merged, radiusOptions: parseRadii(merged.radiusOptions) })
    message.success(t('feedback.saved'))
  }

  return (
    <AdminPage
      title={t('nav.contractorMatching')}
      description={t('contractorMatching.description')}
      sticky
      actions={
        <Space>
          <Button onClick={() => form.setFieldsValue(data)}>{t('actions.revert')}</Button>
          <Button type='primary' loading={save.isPending} onClick={submit}>
            {t('actions.save')}
          </Button>
        </Space>
      }
    >
      <MockApiNotice />
      <Form form={form} layout='vertical' initialValues={data}>
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title={t('contractorMatching.regionsTitle')} style={{ marginBottom: 16 }}>
              <Form.Item
                name='supportedRegions'
                extra={t('contractorMatching.regionsHint')}
                rules={[{ required: true, type: 'array', min: 1, message: t('contractorMatching.regionsRule') }]}
              >
                <Checkbox.Group
                  options={REGIONS.map((value) => ({ value, label: t(`contractors.regions.${value}`) }))}
                />
              </Form.Item>
            </Card>

            <Card title={t('contractorMatching.radiusTitle')} style={{ marginBottom: 16 }}>
              <Form.Item
                name='radiusOptions'
                label={t('contractorMatching.radiusOptions')}
                extra={t('contractorMatching.radiusHint')}
                rules={[
                  {
                    validator: (_, value?: (string | number)[]) => {
                      const parsed = parseRadii(value)
                      if (!parsed.length || parsed.length !== (value ?? []).length || parsed.length > 6) {
                        return Promise.reject(new Error(t('contractorMatching.radiusRule')))
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
              >
                <Select mode='tags' open={false} suffixIcon={null} tokenSeparators={[',', ' ']} />
              </Form.Item>
              <Form.Item
                name='defaultRadiusKm'
                label={t('contractorMatching.defaultRadius')}
                dependencies={['radiusOptions']}
                rules={[
                  {
                    validator: (_, value?: number) =>
                      value !== undefined && radii.includes(Number(value))
                        ? Promise.resolve()
                        : Promise.reject(new Error(t('contractorMatching.defaultRule')))
                  }
                ]}
              >
                <Select options={radii.map((km) => ({ value: km, label: `${km} km` }))} style={{ maxWidth: 200 }} />
              </Form.Item>
            </Card>

            <Card title={t('contractorMatching.typesTitle')} style={{ marginBottom: 16 }}>
              <Form.Item
                name='buildingTypeIds'
                extra={t('contractorMatching.typesHint')}
                rules={[{ required: true, type: 'array', min: 1, message: t('contractorMatching.typesRule') }]}
              >
                <Select mode='multiple' options={typeOptions} />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title={t('contractorMatching.criteriaTitle')} style={{ marginBottom: 16 }}>
              <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
                {t('contractorMatching.hiddenNote')}
              </Text>
              {CRITERIA.map((key) => (
                <div key={key} className='flex items-start justify-between gap-4 py-2'>
                  <div className='min-w-0'>
                    <Text strong style={{ display: 'block' }}>
                      {t(`contractorMatching.criteria.${key}.label`)}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {t(`contractorMatching.criteria.${key}.hint`)}
                    </Text>
                  </div>
                  <Form.Item name={['criteria', key]} valuePropName='checked' noStyle>
                    <Switch />
                  </Form.Item>
                </div>
              ))}
              <Form.Item
                name={['criteria', 'minRating']}
                label={t('contractorMatching.minRating')}
                extra={t('contractorMatching.minRatingHint')}
                style={{ marginTop: 8 }}
              >
                <InputNumber min={0} max={5} step={0.1} precision={1} suffix='/5' style={{ width: 160 }} />
              </Form.Item>
            </Card>

            <Card title={t('contractorMatching.previewTitle')}>
              <Text>{t('contractorMatching.preview', { eligible, total: contractors.length })}</Text>
              <Text type='secondary' style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                {t('contractorMatching.previewHint')}
              </Text>
            </Card>
          </Col>
        </Row>
      </Form>
    </AdminPage>
  )
}
