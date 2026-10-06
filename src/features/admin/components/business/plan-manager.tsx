'use client'

import { CloudUploadOutlined, StopOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  type FormInstance
} from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { isApiError } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import {
  bmtPlansApi,
  type BmtAdminPlanItem,
  type BmtBenefitDefinition,
  type BmtPlanDetail,
  type BmtPlanDraftContent,
  type BmtPlanOfferInput,
  type BmtRevisionSummary,
  type BmtRevisionView,
  type PlanKind,
  type PlanOfferKey,
  type PlanQuotaCode,
  type PlanSaleState
} from '../../api/bmt/plans.api'
import { ApiResourceManager, type ApiRowContext } from '../common/api-resource-manager'
import { ImageUrlField } from '../common/field-kit'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag, type StatusTone } from '../common/status-tag'
import { TableThumb } from '../common/table-thumb'

const { Text, Paragraph } = Typography

/** Giới hạn độ dài theo validator của API (TDD-SUB-001/Notes). */
const CODE_MAX = 100
const NAME_MAX = 200
/** Giới hạn mềm cho các trường trình bày thẻ (phía client). */
const HIGHLIGHT_LABEL_MAX = 100

const SALE_TONE: Record<PlanSaleState, StatusTone> = { NotPublished: 'off', OnSale: 'success', Stopped: 'off' }
const SALE_STATES: readonly PlanSaleState[] = ['NotPublished', 'OnSale', 'Stopped']

interface QuotaRow {
  code: PlanQuotaCode
  monthUnlimited: boolean
  monthLimit: number | null
  yearUnlimited: boolean
  yearLimit: number | null
}

interface BenefitRow {
  code: string
  included: boolean
  enabled: boolean
  displayText: string
  sortOrder: number
}

interface PlanFormValues {
  expectedVersion?: number
  code?: string
  kind: PlanKind
  name: string
  description?: string
  consultationText?: string
  monthPrice?: number
  yearPrice?: number
  sitePrice?: number
  quotas?: QuotaRow[]
  benefits?: BenefitRow[]
  /** Năm trường trình bày thẻ gói — gửi phẳng trong thân request. */
  coverImageUrl?: string
  isHighlighted?: boolean
  highlightLabel?: string
  giftDescription?: string
  giftConditions?: string
}

const designDefinitions = (definitions: BmtBenefitDefinition[], kind: BmtBenefitDefinition['kind']) =>
  definitions.filter((item) => item.scope === 'Design' && item.kind === kind)

const priceOf = (revision: BmtRevisionView | null | undefined, key: PlanOfferKey) =>
  revision?.offers?.find((offer) => offer.offerKey === key)?.price

/** Bản nháp đang mở, nếu không có thì bản đang công bố — đây là nội dung sửa tiếp. */
const workingRevision = (plan: BmtPlanDetail) => plan.draft ?? plan.publishedRevision ?? null

/** Bản rút gọn để hiển thị trong bảng: ưu tiên bản công bố, không có thì bản nháp. */
const workingSummary = (plan: BmtAdminPlanItem): BmtRevisionSummary | null =>
  plan.publishedRevision ?? plan.draft ?? null

/** Dựng giá trị form từ một phiên bản (hoặc form trống khi tạo gói mới). */
function toValues(
  definitions: BmtBenefitDefinition[],
  kind: PlanKind,
  revision: BmtRevisionView | null,
  extra: Partial<PlanFormValues> = {}
): PlanFormValues {
  const month = revision?.offers?.find((offer) => offer.offerKey === 'Month')
  const year = revision?.offers?.find((offer) => offer.offerKey === 'Year')
  return {
    ...extra,
    kind,
    name: revision?.name ?? '',
    description: revision?.description ?? '',
    consultationText: revision?.consultationText ?? '',
    coverImageUrl: revision?.coverImageUrl ?? '',
    isHighlighted: revision?.isHighlighted ?? false,
    highlightLabel: revision?.highlightLabel ?? '',
    giftDescription: revision?.giftDescription ?? '',
    giftConditions: revision?.giftConditions ?? '',
    monthPrice: month?.price,
    yearPrice: year?.price,
    sitePrice: priceOf(revision, 'ConstructionSite'),
    quotas: designDefinitions(definitions, 'Quota').map((definition): QuotaRow => {
      const inMonth = month?.quotas?.find((quota) => quota.code === definition.code)
      const inYear = year?.quotas?.find((quota) => quota.code === definition.code)
      return {
        code: definition.code as PlanQuotaCode,
        monthUnlimited: inMonth?.isUnlimited ?? false,
        monthLimit: inMonth?.limit ?? null,
        yearUnlimited: inYear?.isUnlimited ?? false,
        yearLimit: inYear?.limit ?? null
      }
    }),
    benefits: designDefinitions(definitions, 'Boolean').map((definition, index): BenefitRow => {
      const current = revision?.displayBenefits?.find((benefit) => benefit.code === definition.code)
      return {
        code: definition.code,
        included: Boolean(current),
        enabled: current?.enabled ?? true,
        displayText: current?.displayText ?? definition.label,
        sortOrder: current?.sortOrder ?? index + 1
      }
    })
  }
}

/**
 * Form → nội dung bản nháp đúng `PlanApi.SaveDraftRequest`. Gói giám sát chỉ có
 * lựa chọn `ConstructionSite`, không quyền lợi, không nội dung tư vấn — API từ
 * chối mọi thứ khác (422 `PlanConfigurationInvalid`). Năm trường trình bày thẻ
 * đi PHẲNG cho cả hai loại gói (BE nhận chung).
 */
function toDraft(values: PlanFormValues): BmtPlanDraftContent {
  const card = {
    coverImageUrl: values.coverImageUrl?.trim() || null,
    isHighlighted: values.isHighlighted ?? false,
    highlightLabel: values.highlightLabel?.trim() || null,
    // Quà tặng đã gỡ khỏi form — luôn gửi null để bản nháp không giữ quà cũ.
    giftDescription: null,
    giftConditions: null
  }
  const base = { name: values.name.trim(), description: values.description?.trim() ?? '' }
  if (values.kind === 'Supervision') {
    return {
      ...base,
      consultationText: '',
      offers: [{ offerKey: 'ConstructionSite', price: values.sitePrice ?? 0, currency: 'VND' }],
      displayBenefits: [],
      ...card
    }
  }
  // Hạn mức suy TRỰC TIẾP từ ô nhập: một quyền chỉ vào kỳ nào khi kỳ đó có
  // "không giới hạn" hoặc một hạn mức > 0. Ô trống nghĩa là quyền không áp cho kỳ.
  const quotasFor = (cycle: 'month' | 'year') =>
    (values.quotas ?? []).flatMap((row) => {
      const isUnlimited = cycle === 'month' ? row.monthUnlimited : row.yearUnlimited
      const limit = cycle === 'month' ? row.monthLimit : row.yearLimit
      const present = isUnlimited || (limit != null && limit > 0)
      return present ? [{ code: row.code, isUnlimited, limit: isUnlimited ? null : limit }] : []
    })
  // Gói thiết kế luôn bán theo tháng; "theo năm" là tùy chọn — chỉ gửi offer Năm
  // khi có nhập giá năm (khớp data gói chỉ có tháng như BASIC / PLUS).
  const offers: BmtPlanOfferInput[] = [
    { offerKey: 'Month', price: values.monthPrice ?? 0, currency: 'VND', quotas: quotasFor('month') }
  ]
  if (values.yearPrice != null && values.yearPrice > 0) {
    offers.push({ offerKey: 'Year', price: values.yearPrice, currency: 'VND', quotas: quotasFor('year') })
  }
  return {
    ...base,
    consultationText: values.consultationText?.trim() ?? '',
    offers,
    displayBenefits: (values.benefits ?? [])
      .filter((row) => row.included)
      .map((row) => ({
        code: row.code,
        enabled: row.enabled,
        displayText: row.displayText.trim(),
        sortOrder: row.sortOrder
      })),
    ...card
  }
}

/**
 * DANH MỤC GÓI BÁN — gói thiết kế (tháng / năm) và gói giám sát (theo công
 * trình) trên BMT API (STORY-SUB-002, TDD-SUB-001).
 *
 * Sửa gói là sửa BẢN NHÁP; website vẫn hiện bản đang công bố cho tới khi bấm
 * Công bố ở dòng của gói. Quyền lợi chọn từ danh mục hệ thống — không tự tạo
 * quyền mới. Ngừng bán chỉ chặn đơn mới, gói khách đã mua giữ nguyên.
 */
export function PlanManager() {
  const t = useTranslations('admin.bmtPlans')
  const tAdmin = useTranslations('admin')
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  // Chỉ còn gói thiết kế — không lọc theo loại nữa (đã gỡ gói giám sát khỏi khu tạo).
  const kind = 'all' as const
  const [saleState, setSaleState] = useState<PlanSaleState | 'all'>('all')

  const definitionsQuery = useQuery({
    queryKey: adminKeys.bmt('benefit-definitions'),
    queryFn: bmtPlansApi.listBenefitDefinitions,
    staleTime: 5 * 60_000
  })
  const definitions = definitionsQuery.data ?? []
  const loadDefinitions = () =>
    queryClient.ensureQueryData({
      queryKey: adminKeys.bmt('benefit-definitions'),
      queryFn: bmtPlansApi.listBenefitDefinitions
    })

  const kindLabel = (value: PlanKind) => t(`kinds.${value}`)
  const errorText = (err: unknown) => (isApiError(err) ? err.message : tAdmin('feedback.apiError'))

  function confirmAction(plan: BmtAdminPlanItem, action: 'publish' | 'stop', ctx: ApiRowContext) {
    const name = workingSummary(plan)?.name || plan.code
    modal.confirm({
      title: action === 'publish' ? t('publishConfirmTitle', { name }) : t('stopConfirmTitle', { name }),
      content: action === 'publish' ? t('publishConfirmBody') : t('stopConfirmBody'),
      okText: action === 'publish' ? t('publish') : t('stopSelling'),
      okButtonProps: action === 'stop' ? { danger: true } : undefined,
      cancelText: tAdmin('actions.cancel'),
      onOk: async () => {
        try {
          if (action === 'publish') await bmtPlansApi.publish(plan.planId, plan.version)
          else await bmtPlansApi.stopSelling(plan.planId, plan.version)
          message.success(action === 'publish' ? t('published') : t('stopped'))
          await ctx.refresh()
        } catch (err) {
          message.error(errorText(err))
          await ctx.refresh()
        }
      }
    })
  }

  return (
    <ApiResourceManager<BmtAdminPlanItem>
      title={tAdmin('nav.planTable')}
      description={t('description')}
      queryKey={adminKeys.bmt('plans', kind, saleState)}
      fetchPage={({ pageIndex, pageSize }) =>
        bmtPlansApi.listForAdmin({
          kind: kind === 'all' ? undefined : kind,
          saleState: saleState === 'all' ? undefined : saleState,
          pageIndex,
          pageSize
        })
      }
      rowKey={(plan) => plan.planId}
      drawerWidth={820}
      banner={
        <Space wrap>
          <Select<PlanSaleState | 'all'>
            value={saleState}
            onChange={setSaleState}
            style={{ minWidth: 200 }}
            options={[
              { value: 'all', label: t('allSaleStates') },
              ...SALE_STATES.map((value) => ({ value, label: t(`saleStates.${value}`) }))
            ]}
          />
        </Space>
      }
      columns={[
        {
          title: t('name'),
          key: 'name',
          render: (_, plan) => {
            const summary = workingSummary(plan)
            return (
              <Space size={12}>
                <TableThumb src={summary?.coverImageUrl} />
                <div style={{ minWidth: 0 }}>
                  <Space size={6}>
                    <Text strong>{summary?.name || '—'}</Text>
                    {summary?.isHighlighted ? <Tag color='gold'>{t('highlightedBadge')}</Tag> : null}
                  </Space>
                  <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                    {plan.code}
                  </Text>
                </div>
              </Space>
            )
          }
        },
        {
          title: t('kind'),
          dataIndex: 'kind',
          width: 130,
          render: (value: PlanKind) => <Tag color={value === 'Design' ? 'green' : 'purple'}>{kindLabel(value)}</Tag>
        },
        {
          title: t('saleState'),
          key: 'saleState',
          width: 200,
          render: (_, plan) => (
            <Space orientation='vertical' size={2}>
              <StatusTag tone={SALE_TONE[plan.saleState]}>{t(`saleStates.${plan.saleState}`)}</StatusTag>
              {plan.draft ? (
                <Text type='warning' style={{ fontSize: 12 }}>
                  {t('hasDraft', { number: plan.draft.number })}
                </Text>
              ) : null}
            </Space>
          )
        },
        {
          title: t('revision'),
          key: 'revision',
          width: 150,
          render: (_, plan) =>
            plan.publishedRevision ? t('revisionNumber', { number: plan.publishedRevision.number }) : '—'
        }
      ]}
      rowActions={(plan, ctx) => {
        const actions: RowAction[] = []
        if (plan.draft && plan.saleState !== 'Stopped') {
          actions.push({
            key: 'publish',
            label: t('publish'),
            icon: <CloudUploadOutlined />,
            onClick: () => confirmAction(plan, 'publish', ctx)
          })
        }
        if (plan.saleState === 'OnSale') {
          actions.push({
            key: 'stop',
            label: t('stopSelling'),
            icon: <StopOutlined />,
            danger: true,
            onClick: () => confirmAction(plan, 'stop', ctx)
          })
        }
        return actions
      }}
      renderView={(plan) => <PlanDetailView planId={plan.planId} />}
      createValues={() => toValues(definitions, 'Design', null) as unknown as Record<string, unknown>}
      onCreate={async (raw) => {
        const values = raw as unknown as PlanFormValues
        await bmtPlansApi.createPlan({ code: values.code?.trim() ?? '', kind: values.kind, ...toDraft(values) })
      }}
      toFormValues={async (plan) => {
        const [detail, defs] = await Promise.all([bmtPlansApi.getPlan(plan.planId), loadDefinitions()])
        return toValues(defs, detail.kind, workingRevision(detail), {
          expectedVersion: detail.version
        }) as unknown as Record<string, unknown>
      }}
      onUpdate={async (raw, plan) => {
        const values = raw as unknown as PlanFormValues
        await bmtPlansApi.saveDraft(plan.planId, {
          expectedVersion: values.expectedVersion ?? plan.version,
          ...toDraft({ ...values, kind: plan.kind })
        })
      }}
      renderForm={(form, { isNew, item }) => (
        <PlanFields
          form={form}
          isNew={isNew}
          plan={item}
          definitions={definitions}
          definitionsError={definitionsQuery.isError ? errorText(definitionsQuery.error) : null}
        />
      )}
    />
  )
}

/** Ngăn kéo xem chi tiết: đọc bản đầy đủ (offers + quyền lợi + trình bày) theo id. */
function PlanDetailView({ planId }: { planId: string }) {
  const t = useTranslations('admin.bmtPlans')
  const tAdmin = useTranslations('admin')
  const detailQuery = useQuery({
    queryKey: adminKeys.bmt('plan', planId),
    queryFn: () => bmtPlansApi.getPlan(planId)
  })

  if (detailQuery.isPending) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', padding: 48 }}>
        <Spin />
      </div>
    )
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Alert
        type='error'
        showIcon
        title={isApiError(detailQuery.error) ? detailQuery.error.message : tAdmin('feedback.apiError')}
      />
    )
  }

  const plan = detailQuery.data
  return (
    <Space orientation='vertical' size={16} style={{ width: '100%' }}>
      <Descriptions
        size='small'
        column={1}
        bordered
        items={[
          { key: 'code', label: t('code'), children: <Text code>{plan.code}</Text> },
          { key: 'id', label: t('planId'), children: <Text copyable>{plan.planId}</Text> },
          { key: 'kind', label: t('kind'), children: t(`kinds.${plan.kind}`) },
          {
            key: 'state',
            label: t('saleState'),
            children: <StatusTag tone={SALE_TONE[plan.saleState]}>{t(`saleStates.${plan.saleState}`)}</StatusTag>
          }
        ]}
      />
      <RevisionBlock title={t('publishedBlock')} plan={plan} revision={plan.publishedRevision} />
      <RevisionBlock title={t('draftBlock')} plan={plan} revision={plan.draft} />
    </Space>
  )
}

/** Một phiên bản (đang công bố hoặc nháp) ở ngăn kéo xem chi tiết. */
function RevisionBlock({
  title,
  plan,
  revision
}: {
  title: string
  plan: BmtPlanDetail
  revision: BmtRevisionView | null | undefined
}) {
  const t = useTranslations('admin.bmtPlans')
  const locale = useLocale() as Locale
  if (!revision) {
    return (
      <Card size='small' title={title}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noRevision')} />
      </Card>
    )
  }
  const quotaText = (quota: { isUnlimited: boolean; limit?: number | null }) =>
    quota.isUnlimited ? t('unlimited') : t('limitValue', { limit: quota.limit ?? 0 })

  return (
    <Card size='small' title={`${title} · ${t('revisionNumber', { number: revision.number })}`}>
      <Descriptions
        size='small'
        column={1}
        items={[
          { key: 'name', label: t('name'), children: revision.name || '—' },
          {
            key: 'description',
            label: plan.kind === 'Supervision' ? t('serviceDescription') : t('descriptionField'),
            children: revision.description ? (
              <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{revision.description}</Paragraph>
            ) : (
              '—'
            )
          },
          ...(plan.kind === 'Design'
            ? [
                {
                  key: 'consultation',
                  label: t('consultationText'),
                  children: revision.consultationText ? (
                    <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{revision.consultationText}</Paragraph>
                  ) : (
                    '—'
                  )
                }
              ]
            : []),
          {
            key: 'offers',
            label: t('offers'),
            children: (
              <ul className='m-0 list-disc pl-4'>
                {(revision.offers ?? []).map((offer) => (
                  <li key={offer.offerKey}>
                    <Text strong>{t(`offerKeys.${offer.offerKey}`)}</Text>: {formatCurrency(offer.price, locale)}
                    {offer.quotas?.length ? (
                      <ul className='m-0 pl-4'>
                        {offer.quotas.map((quota) => (
                          <li key={quota.code}>
                            {quota.label || quota.code}: {quotaText(quota)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          },
          ...(plan.kind === 'Design'
            ? [
                {
                  key: 'benefits',
                  label: t('displayBenefits'),
                  children: revision.displayBenefits?.length ? (
                    <Space size={4} wrap>
                      {[...revision.displayBenefits]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((benefit) => (
                          <StatusTag key={benefit.code} tone={benefit.enabled ? 'success' : 'off'}>
                            {benefit.displayText || benefit.label} · {benefit.enabled ? t('on') : t('off')}
                          </StatusTag>
                        ))}
                    </Space>
                  ) : (
                    t('noBenefits')
                  )
                }
              ]
            : []),
          {
            key: 'highlight',
            label: t('isHighlighted'),
            children: revision.isHighlighted ? (
              <Space size={6}>
                <Tag color='gold'>{t('highlightedBadge')}</Tag>
                {revision.highlightLabel ? <Text>{revision.highlightLabel}</Text> : null}
              </Space>
            ) : (
              t('off')
            )
          },
          ...(revision.coverImageUrl
            ? [
                {
                  key: 'cover',
                  label: t('coverImage'),
                  children: <Image src={revision.coverImageUrl} alt='' width={120} style={{ borderRadius: 8 }} />
                }
              ]
            : []),
          ...(revision.giftDescription || revision.giftConditions
            ? [
                {
                  key: 'gift',
                  label: t('giftDescription'),
                  children: (
                    <div>
                      {revision.giftDescription ? (
                        <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{revision.giftDescription}</Paragraph>
                      ) : null}
                      {revision.giftConditions ? (
                        <Text type='secondary' style={{ whiteSpace: 'pre-wrap' }}>
                          {t('giftConditions')}: {revision.giftConditions}
                        </Text>
                      ) : null}
                    </div>
                  )
                }
              ]
            : [])
        ]}
      />
    </Card>
  )
}

function PlanFields({
  form,
  isNew,
  plan,
  definitions,
  definitionsError
}: {
  form: FormInstance
  isNew: boolean
  plan: BmtAdminPlanItem | null
  definitions: BmtBenefitDefinition[]
  definitionsError: string | null
}) {
  const t = useTranslations('admin.bmtPlans')
  const tAdmin = useTranslations('admin')
  const watchedKind = Form.useWatch('kind', form) as PlanKind | undefined
  const kind = plan?.kind ?? watchedKind ?? 'Design'
  // Watch CHỈ để biết trạng thái tick (∞ / bật quyền lợi) cho phần hiển thị — KHÔNG
  // dùng để quyết định render dòng nào. Các dòng render thẳng từ danh mục hệ thống
  // (`definitions`) nên luôn hiện đủ khi danh mục đã tải, không lệ thuộc thời điểm
  // seed giá trị vào form (trước đây `useWatch` rỗng khiến bảng hạn mức trống).
  const quotas = (Form.useWatch('quotas', form) as (QuotaRow | undefined)[] | undefined) ?? []
  const benefits = (Form.useWatch('benefits', form) as (BenefitRow | undefined)[] | undefined) ?? []
  const quotaDefs = designDefinitions(definitions, 'Quota')
  const benefitDefs = designDefinitions(definitions, 'Boolean')
  const required = { required: true, whitespace: true, message: tAdmin('fields.requiredMessage') }
  const requiredPrice = [{ required: true, type: 'integer' as const, min: 1, message: t('priceRule') }]
  const yearPriceRule = [{ type: 'integer' as const, min: 1, message: t('priceRule') }]
  const yearPrice = Form.useWatch('yearPrice', form) as number | undefined
  const hasYear = yearPrice != null && yearPrice > 0

  const sectionTitle = { display: 'block', fontSize: 15, margin: '4px 0 12px' } as const
  const subTitle = { display: 'block', margin: '16px 0 4px' } as const
  const hintText = { display: 'block', marginBottom: 12, fontSize: 12 } as const

  /** Một ô hạn mức trong bảng: số lượt + công tắc "không giới hạn (∞)". Ô trống = quyền không áp cho kỳ này. */
  const renderQuotaCell = (index: number, cycle: 'month' | 'year', unlimited: boolean, disabled: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <Form.Item
        name={['quotas', index, `${cycle}Limit`]}
        style={{ marginBottom: 0, flex: 1 }}
        rules={disabled || unlimited ? [] : [{ type: 'integer', min: 1, message: t('limitRule') }]}
      >
        <InputNumber
          min={1}
          precision={0}
          disabled={disabled || unlimited}
          placeholder={t('limitPlaceholder')}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Tooltip title={t('unlimited')}>
        <Form.Item name={['quotas', index, `${cycle}Unlimited`]} valuePropName='checked' style={{ marginBottom: 0 }}>
          <Checkbox disabled={disabled} aria-label={t('unlimited')}>
            ∞
          </Checkbox>
        </Form.Item>
      </Tooltip>
    </div>
  )

  return (
    <>
      <Form.Item name='expectedVersion' hidden>
        <InputNumber />
      </Form.Item>
      {/* Chỉ tạo gói thiết kế; giữ giá trị kind để gửi kèm khi tạo (đã gỡ ô chọn loại). */}
      <Form.Item name='kind' hidden>
        <Input />
      </Form.Item>
      {plan?.saleState === 'Stopped' ? (
        <Alert type='warning' showIcon style={{ marginBottom: 12 }} title={t('stoppedNote')} />
      ) : null}
      {!isNew ? <Alert type='info' showIcon style={{ marginBottom: 12 }} title={t('draftNote')} /> : null}

      <Text strong style={sectionTitle}>
        {t('basicSection')}
      </Text>
      <Row gutter={16}>
        <Col xs={24}>
          {isNew ? (
            <Form.Item
              name='code'
              label={t('code')}
              extra={t('codeHint')}
              rules={[required, { max: CODE_MAX, message: tAdmin('fields.maxLength', { max: CODE_MAX }) }]}
            >
              <Input maxLength={CODE_MAX} />
            </Form.Item>
          ) : (
            <Form.Item label={t('code')}>
              <Input value={plan?.code} disabled />
            </Form.Item>
          )}
        </Col>
        <Col xs={24}>
          <Form.Item
            name='name'
            label={t('name')}
            rules={[required, { max: NAME_MAX, message: tAdmin('fields.maxLength', { max: NAME_MAX }) }]}
          >
            <Input maxLength={NAME_MAX} />
          </Form.Item>
        </Col>
      </Row>

      <Text strong style={sectionTitle}>
        {t('priceQuotaSection')}
      </Text>
      {kind === 'Supervision' ? (
        <Form.Item
          name='sitePrice'
          label={t('offerKeys.ConstructionSite')}
          extra={t('supervisionNote')}
          rules={requiredPrice}
        >
          <InputNumber min={1} step={100_000} precision={0} suffix='₫' style={{ width: '100%' }} />
        </Form.Item>
      ) : (
        <>
          {definitionsError ? (
            <Alert type='error' showIcon style={{ marginBottom: 12 }} title={definitionsError} />
          ) : null}

          {/* Bảng giá & hạn mức: mỗi dòng là 1 quyền, hai cột Tháng / Năm. Năm tùy chọn. */}
          <div style={{ overflowX: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(150px, 1.3fr) minmax(140px, 1fr) minmax(170px, 1fr)',
                columnGap: 16,
                alignItems: 'center',
                minWidth: 520
              }}
            >
              <div />
              <Text type='secondary' style={{ fontSize: 12 }}>
                {t('offerKeys.Month')}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {t('offerKeys.Year')} · {t('optional')}
              </Text>

              <Text strong>{t('priceRow')}</Text>
              <Form.Item name='monthPrice' style={{ marginBottom: 8 }} rules={requiredPrice}>
                <InputNumber min={1} step={1000} precision={0} suffix='₫' style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name='yearPrice' style={{ marginBottom: 8 }} rules={yearPriceRule}>
                <InputNumber
                  min={1}
                  step={1000}
                  precision={0}
                  suffix='₫'
                  placeholder={t('yearOptionalPlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              {quotaDefs.map((def, index) => {
                const row = quotas[index]
                return (
                  <Fragment key={def.code}>
                    <Form.Item name={['quotas', index, 'code']} hidden initialValue={def.code}>
                      <Input />
                    </Form.Item>
                    <Text>{def.label}</Text>
                    {renderQuotaCell(index, 'month', row?.monthUnlimited ?? false, false)}
                    {renderQuotaCell(index, 'year', row?.yearUnlimited ?? false, !hasYear)}
                  </Fragment>
                )
              })}
            </div>
          </div>
          <Text type='secondary' style={hintText}>
            {t('quotaHint')}
          </Text>

          <Text strong style={subTitle}>
            {t('displayBenefits')}
          </Text>
          <Text type='secondary' style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            {t('displayBenefitsHint')}
          </Text>
          {benefitDefs.length === 0 ? (
            <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
              {t('noBooleanDefinitions')}
            </Text>
          ) : null}
          {benefitDefs.map((def, index) => {
            const included = benefits[index]?.included ?? false
            return (
              <Card key={def.code} size='small' type='inner' style={{ marginBottom: 12 }}>
                <Form.Item name={['benefits', index, 'code']} hidden initialValue={def.code}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name={['benefits', index, 'included']}
                  valuePropName='checked'
                  initialValue={false}
                  style={{ marginBottom: 8 }}
                >
                  <Checkbox>
                    <Text strong>{def.label}</Text>
                  </Checkbox>
                </Form.Item>
                {included ? (
                  <Row gutter={12} align='middle'>
                    <Col xs={24} md={5}>
                      <Form.Item
                        name={['benefits', index, 'enabled']}
                        valuePropName='checked'
                        initialValue={true}
                        style={{ marginBottom: 8 }}
                      >
                        <Switch checkedChildren={t('on')} unCheckedChildren={t('off')} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={13}>
                      <Form.Item
                        name={['benefits', index, 'displayText']}
                        initialValue={def.label}
                        style={{ marginBottom: 8 }}
                        rules={[required]}
                      >
                        <Input placeholder={t('displayText')} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item
                        name={['benefits', index, 'sortOrder']}
                        initialValue={index + 1}
                        style={{ marginBottom: 8 }}
                        rules={[{ required: true, type: 'integer', message: t('sortOrderRule') }]}
                      >
                        <InputNumber precision={0} prefix='#' style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ) : null}
              </Card>
            )
          })}
        </>
      )}

      <ImageUrlField name='coverImageUrl' label={t('coverImage')} />
      <Text type='secondary' style={{ display: 'block', marginTop: -8, marginBottom: 16, fontSize: 12 }}>
        {t('coverImageHint')}
      </Text>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name='isHighlighted' label={t('isHighlighted')} valuePropName='checked'>
            <Switch />
          </Form.Item>
        </Col>
        <Col xs={24} md={16}>
          <Form.Item
            name='highlightLabel'
            label={t('highlightLabel')}
            extra={t('highlightLabelHint')}
            rules={[{ max: HIGHLIGHT_LABEL_MAX, message: tAdmin('fields.maxLength', { max: HIGHLIGHT_LABEL_MAX }) }]}
          >
            <Input maxLength={HIGHLIGHT_LABEL_MAX} />
          </Form.Item>
        </Col>
      </Row>

      <Text type='secondary' style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        {t('snapshotNote')}
      </Text>
    </>
  )
}
