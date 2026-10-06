'use client'

import { SwapOutlined } from '@ant-design/icons'
import {
  App,
  Col,
  DatePicker,
  type FormInstance,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { discountUsage, normalizeDiscountCode, type CmsDiscountCode } from '@/shared/cms'
import { formatCurrency } from '@/shared/utils'
import { useAdminCollection, useSaveAdminItem } from '../../hooks/use-admin-data'
import { newAdminId, todayKey } from '../../services/admin.service'
import { ResourceManager } from '../common/resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { useProductLabel } from './use-product-label'

const { Text } = Typography

/**
 * Hiệu lực suy ra từ trạng thái bật/tắt + thời gian áp dụng + lượt dùng — không
 * lưu, để không bao giờ lệch. Bốn giá trị đúng spec: hết lượt tính là Đã kết thúc.
 */
type Validity = 'active' | 'scheduled' | 'ended' | 'disabled'

const VALIDITY_TAG: Record<Validity, string> = {
  active: 'green',
  scheduled: 'blue',
  ended: 'default',
  disabled: 'default'
}

/** Mã: chữ không dấu, số, gạch ngang, gạch dưới; không khoảng trắng; tối đa 50 ký tự. */
const CODE_PATTERN = /^[A-Z0-9_-]{1,50}$/

interface FormValues extends Omit<CmsDiscountCode, 'startsAt' | 'endsAt'> {
  period?: [Dayjs | null, Dayjs | null] | null
}

/**
 * MÃ GIẢM GIÁ — ô "Mã giảm giá" ở S03 đọc thẳng bảng này.
 *
 * Luật áp mã (`evaluateDiscount` ở `shared/cms`) là MỘT hàm dùng chung cho ô nhập
 * mã của khách, lúc tạo đơn và cột "Đã dùng" ở đây — nên cấu hình gì ở đây thì
 * khách gặp đúng như vậy.
 *
 * "Đã dùng" đếm từ đơn ĐÃ THANH TOÁN, không lưu thành số riêng. Mã đã có người
 * dùng thì tắt đi chứ không xóa: đơn cũ còn tham chiếu tới mã.
 */
export function DiscountManager() {
  const t = useTranslations('admin')
  const locale = useLocale() as Locale
  const productLabel = useProductLabel()

  const { data: orders = [] } = useAdminCollection('orders')
  const { data: plans = [] } = useAdminCollection('plans')
  const { data: supervisionPackages = [] } = useAdminCollection('supervisionPackages')

  const productOptions = useMemo(
    () => [
      ...plans.map((plan) => ({ value: plan.id, label: productLabel('design', plan.id) })),
      ...supervisionPackages
        .filter((item) => item.price > 0)
        .map((item) => ({ value: item.id, label: productLabel('supervision', item.id) }))
    ],
    [plans, supervisionPackages, productLabel]
  )

  const today = todayKey()
  const { message, modal } = App.useApp()
  const save = useSaveAdminItem('discountCodes')
  const { data: codes = [] } = useAdminCollection('discountCodes')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | CmsDiscountCode['type']>('all')
  const [validityFilter, setValidityFilter] = useState<'all' | Validity>('all')

  /** Lượt đã dùng — chỉ đếm đơn đã thanh toán thành công. */
  const usedOf = (item: CmsDiscountCode) => discountUsage(item.code, orders).total

  /**
   * Lượt đã dùng của mã ĐANG SỬA, tính theo bản đã lưu (tìm bằng `id`) — không theo
   * ô đang gõ. Form được dựng trước khi có giá trị, lúc đó `code` còn `undefined`
   * và `discountUsage` sập cả trang.
   */
  const storedUsage = (form: FormInstance) => {
    const stored = codes.find((item) => item.id === form.getFieldValue('id'))
    return stored ? usedOf(stored) : 0
  }

  function validityOf(item: CmsDiscountCode): Validity {
    if (!item.enabled) return 'disabled'
    if (item.startsAt && today < item.startsAt) return 'scheduled'
    if (item.endsAt && today > item.endsAt) return 'ended'
    if (item.usageLimit && usedOf(item) >= item.usageLimit) return 'ended'
    return 'active'
  }

  /** Quy tắc chéo giữa các ô (§3, §4) — trả thông báo lỗi hoặc `null`. */
  function problemOf(next: CmsDiscountCode, current: CmsDiscountCode): string | null {
    const used = usedOf(current)
    if (codes.some((item) => item.id !== next.id && item.code.toUpperCase() === next.code.toUpperCase())) {
      return t('discounts.duplicateCode')
    }
    if (used > 0 && current.code && next.code !== current.code) return t('discounts.codeLocked')
    if (next.type === 'percent' && (next.value <= 0 || next.value > 100)) return t('discounts.percentRange')
    if (next.type === 'amount' && next.value <= 0) return t('discounts.amountPositive')
    if (next.usageLimit != null && next.usageLimit < used) return t('discounts.limitBelowUsed', { used })
    if (next.usageLimit != null && next.perAccountLimit != null && next.perAccountLimit > next.usageLimit) {
      return t('discounts.perAccountAboveTotal')
    }
    if (next.startsAt && next.endsAt && next.endsAt < next.startsAt) return t('discounts.endBeforeStart')
    return null
  }

  const matches = (item: CmsDiscountCode) =>
    (productFilter === 'all' || item.productIds.length === 0 || item.productIds.includes(productFilter)) &&
    (typeFilter === 'all' || item.type === typeFilter) &&
    (validityFilter === 'all' || validityOf(item) === validityFilter)

  const productNames = (ids: string[]) =>
    ids.length === 0
      ? t('discounts.allProducts')
      : ids.map((id) => productOptions.find((option) => option.value === id)?.label ?? id).join(', ')
  const money = (value: number | null | undefined) => (value ? formatCurrency(value, locale) : '-')

  return (
    <ResourceManager
      collection='discountCodes'
      title={t('nav.discounts')}
      description={t('discounts.description')}
      // Chỉ xóa được mã CHƯA TỪNG được dùng — đơn cũ còn tham chiếu tới mã đã dùng.
      deleteBlockedReason={(item) => (usedOf(item) > 0 ? t('discounts.deleteBlocked') : null)}
      deleteConfirm={(item) => t('discounts.deleteConfirm', { code: item.code, used: usedOf(item) })}
      searchText={(item) => item.code}
      filterItems={matches}
      filterKey={`${productFilter}|${typeFilter}|${validityFilter}`}
      validate={problemOf}
      banner={
        <Space wrap>
          <Select
            value={productFilter}
            onChange={setProductFilter}
            style={{ minWidth: 200 }}
            options={[{ value: 'all', label: t('discounts.filterAllProducts') }, ...productOptions]}
          />
          <Select<'all' | CmsDiscountCode['type']>
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ minWidth: 180 }}
            options={[
              { value: 'all', label: t('discounts.filterAllTypes') },
              { value: 'percent', label: t('discounts.typePercent') },
              { value: 'amount', label: t('discounts.typeAmount') }
            ]}
          />
          <Select<'all' | Validity>
            value={validityFilter}
            onChange={setValidityFilter}
            style={{ minWidth: 180 }}
            options={[
              { value: 'all', label: t('discounts.filterAllValidity') },
              ...(['active', 'scheduled', 'ended', 'disabled'] as const).map((value) => ({
                value,
                label: t(`discountValidity.${value}`)
              }))
            ]}
          />
        </Space>
      }
      rowActions={(item): RowAction[] => {
        const blocked = item.enabled ? null : problemOf(item, item)
        const current = item.enabled ? t('discounts.on') : t('discounts.off')
        const next = item.enabled ? t('discounts.off') : t('discounts.on')
        return [
          {
            key: 'status',
            label: t('actions.switchStatus'),
            icon: <SwapOutlined />,
            disabled: Boolean(blocked),
            onClick: () =>
              modal.confirm({
                title: t('actions.switchStatusTitle', { name: item.code }),
                content: t('actions.switchStatusBody', { current, next }),
                okText: t('actions.confirm'),
                cancelText: t('actions.cancel'),
                onOk: async () => {
                  await save.mutateAsync({ ...item, enabled: !item.enabled })
                  message.success(t('feedback.saved'))
                }
              })
          }
        ]
      }}
      renderView={(item) => (
        <Descriptions
          size='small'
          column={1}
          bordered
          items={[
            { key: 'code', label: t('discounts.code'), children: <Text code>{item.code}</Text> },
            {
              key: 'enabled',
              label: t('discounts.enabled'),
              children: item.enabled ? t('discounts.on') : t('discounts.off')
            },
            {
              key: 'type',
              label: t('discounts.type'),
              children: item.type === 'percent' ? t('discounts.typePercent') : t('discounts.typeAmount')
            },
            {
              key: 'value',
              label: t('discounts.value'),
              children: item.type === 'percent' ? `${item.value}%` : formatCurrency(item.value, locale)
            },
            { key: 'max', label: t('discounts.maxDiscount'), children: money(item.maxDiscount) },
            { key: 'products', label: t('discounts.products'), children: productNames(item.productIds) },
            { key: 'min', label: t('discounts.minOrder'), children: money(item.minOrder) },
            { key: 'start', label: t('discounts.startsAt'), children: item.startsAt ?? '-' },
            { key: 'end', label: t('discounts.endsAt'), children: item.endsAt ?? '-' },
            { key: 'limit', label: t('discounts.usageLimit'), children: item.usageLimit ?? '-' },
            { key: 'used', label: t('discounts.usedCount'), children: usedOf(item) },
            { key: 'per', label: t('discounts.perAccountLimit'), children: item.perAccountLimit ?? '-' },
            { key: 'validity', label: t('discounts.state'), children: t(`discountValidity.${validityOf(item)}`) },
            { key: 'note', label: t('discounts.note'), children: item.note || '-' }
          ]}
        />
      )}
      createItem={(): CmsDiscountCode => ({
        id: newAdminId('dc'),
        code: '',
        type: 'percent',
        value: 10,
        maxDiscount: null,
        minOrder: null,
        startsAt: today,
        endsAt: null,
        usageLimit: null,
        perAccountLimit: 1,
        productIds: [],
        enabled: true
      })}
      toFormValues={(item) => ({
        ...item,
        period: [item.startsAt ? dayjs(item.startsAt) : null, item.endsAt ? dayjs(item.endsAt) : null]
      })}
      fromFormValues={(values, current) => {
        const { period, ...rest } = values as unknown as FormValues
        const [start, end] = period ?? [null, null]
        return {
          ...current,
          ...rest,
          code: normalizeDiscountCode(rest.code),
          startsAt: start ? start.format('YYYY-MM-DD') : null,
          endsAt: end ? end.format('YYYY-MM-DD') : null,
          productIds: rest.productIds ?? [],
          // Ô số để trống trả `undefined` — lưu `null` = không giới hạn.
          maxDiscount: rest.type === 'percent' ? (rest.maxDiscount ?? null) : null,
          minOrder: rest.minOrder ?? null,
          usageLimit: rest.usageLimit ?? null,
          perAccountLimit: rest.perAccountLimit ?? null
        }
      }}
      columns={[
        {
          title: t('discounts.code'),
          dataIndex: 'code',
          render: (code: string, record) => (
            <div style={{ minWidth: 0 }}>
              <Text code strong copyable>
                {code}
              </Text>
              {record.note ? (
                <Text type='secondary' style={{ display: 'block', fontSize: 12 }} ellipsis={{ tooltip: record.note }}>
                  {record.note}
                </Text>
              ) : null}
            </div>
          )
        },
        {
          title: t('discounts.value'),
          key: 'value',
          width: 180,
          render: (_, record) => (
            <div>
              <Text strong>
                {record.type === 'percent' ? `−${record.value}%` : `−${formatCurrency(record.value, locale)}`}
              </Text>
              {record.type === 'percent' && record.maxDiscount ? (
                <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                  {t('discounts.capped', { amount: formatCurrency(record.maxDiscount, locale) })}
                </Text>
              ) : null}
              {record.minOrder ? (
                <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                  {t('discounts.minOrderShort', { amount: formatCurrency(record.minOrder, locale) })}
                </Text>
              ) : null}
            </div>
          )
        },
        {
          title: t('discounts.products'),
          dataIndex: 'productIds',
          width: 200,
          render: (ids: string[]) =>
            ids.length === 0 ? (
              <Text type='secondary'>{t('discounts.allProducts')}</Text>
            ) : (
              ids.map((id) => <Tag key={id}>{productOptions.find((option) => option.value === id)?.label ?? id}</Tag>)
            )
        },
        {
          title: t('discounts.period'),
          key: 'period',
          width: 190,
          render: (_, record) => (
            <Text>
              {record.startsAt ? dayjs(record.startsAt).format('DD/MM/YY') : '…'} →{' '}
              {record.endsAt ? dayjs(record.endsAt).format('DD/MM/YY') : '…'}
            </Text>
          )
        },
        {
          title: t('discounts.used'),
          key: 'used',
          width: 150,
          render: (_, record) => {
            const used = discountUsage(record.code, orders).total
            return record.usageLimit ? (
              <div style={{ minWidth: 110 }}>
                <Text>
                  {used}/{record.usageLimit}
                </Text>
                <Progress percent={Math.round((used / record.usageLimit) * 100)} size='small' showInfo={false} />
              </div>
            ) : (
              <Text>{t('discounts.usedUnlimited', { count: used })}</Text>
            )
          }
        },
        {
          title: t('discounts.state'),
          key: 'state',
          width: 130,
          render: (_, record) => {
            const validity = validityOf(record)
            return <Tag color={VALIDITY_TAG[validity]}>{t(`discountValidity.${validity}`)}</Tag>
          }
        }
      ]}
      renderForm={(form) => (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item
                name='code'
                label={t('discounts.code')}
                normalize={(value: string) => value.toUpperCase().replace(/\s/g, '')}
                extra={storedUsage(form) > 0 ? t('discounts.codeLocked') : undefined}
                rules={[
                  { required: true, message: t('fields.requiredMessage') },
                  { pattern: CODE_PATTERN, message: t('discounts.codeRule') }
                ]}
              >
                <Input placeholder='KHAITRUONG' maxLength={50} disabled={storedUsage(form) > 0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item name='enabled' label={t('discounts.enabled')} valuePropName='checked'>
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='type' label={t('discounts.type')}>
            <Radio.Group
              optionType='button'
              options={[
                { value: 'percent', label: t('discounts.typePercent') },
                { value: 'amount', label: t('discounts.typeAmount') }
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, next) => prev.type !== next.type}>
            {() => {
              const isPercent = form.getFieldValue('type') === 'percent'
              return (
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name='value'
                      label={t('discounts.value')}
                      rules={[{ required: true, message: t('fields.requiredMessage') }]}
                    >
                      <InputNumber
                        min={isPercent ? 0.01 : 1}
                        max={isPercent ? 100 : 100_000_000}
                        step={isPercent ? 1 : 50_000}
                        suffix={isPercent ? '%' : '₫'}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  {isPercent ? (
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name='maxDiscount'
                        label={t('discounts.maxDiscount')}
                        extra={t('discounts.emptyUnlimited')}
                      >
                        <InputNumber min={1} step={50_000} suffix='₫' style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  ) : null}
                </Row>
              )
            }}
          </Form.Item>

          <Form.Item name='productIds' label={t('discounts.products')} extra={t('discounts.productsHint')}>
            <Select mode='multiple' allowClear options={productOptions} placeholder={t('discounts.allProducts')} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name='minOrder' label={t('discounts.minOrder')} extra={t('discounts.emptyUnlimited')}>
                <InputNumber min={1} step={100_000} suffix='₫' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='period' label={t('discounts.period')} extra={t('discounts.periodHint')}>
                <DatePicker.RangePicker format='DD/MM/YYYY' allowEmpty={[true, true]} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='usageLimit' label={t('discounts.usageLimit')} extra={t('discounts.emptyUnlimited')}>
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='perAccountLimit'
                label={t('discounts.perAccountLimit')}
                extra={t('discounts.emptyUnlimited')}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='note' label={t('discounts.note')} extra={t('discounts.noteHint')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      )}
    />
  )
}
