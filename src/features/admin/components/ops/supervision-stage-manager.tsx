'use client'

import { Form, Input, InputNumber, Typography } from 'antd'
import { useTranslations } from 'next-intl'

import type { CmsSupervisionStageDef } from '@/shared/cms'
import { ResourceManager } from '../common/resource-manager'

const { Text } = Typography

/**
 * GIAI ĐOẠN GIÁM SÁT (spec admin #15) — Xem / Cập nhật tên, tên ngắn, mô tả và
 * thứ tự của sáu giai đoạn. Không thêm / xóa: tiến độ từng dự án và kết quả kiểm
 * tra của kỹ sư gắn theo mã giai đoạn. Thứ tự áp dụng cho dự án giám sát mới.
 */
export function SupervisionStageManager() {
  const t = useTranslations('admin')

  return (
    <ResourceManager
      collection='supervisionStages'
      title={t('nav.supervisionStages')}
      description={t('supervisionStages.description')}
      allowDelete={false}
      columns={[
        {
          title: t('supervisionStages.order'),
          dataIndex: 'order',
          width: 90,
          defaultSortOrder: 'ascend',
          sorter: (a, b) => a.order - b.order
        },
        {
          title: t('supervisionStages.name'),
          dataIndex: 'name',
          render: (_, record) => (
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ display: 'block' }}>
                {record.name}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            </div>
          )
        },
        { title: t('supervisionStages.shortName'), dataIndex: 'shortName', width: 220 }
      ]}
      fromFormValues={(values, current): CmsSupervisionStageDef => {
        const next = { ...current, ...(values as Partial<CmsSupervisionStageDef>) }
        return {
          ...next,
          name: next.name.trim(),
          shortName: next.shortName.trim() || next.name.trim(),
          description: next.description.trim()
        }
      }}
      renderForm={() => (
        <>
          <Form.Item
            name='name'
            label={t('supervisionStages.name')}
            rules={[
              { required: true, whitespace: true, message: t('fields.requiredMessage') },
              { max: 100, message: t('fields.maxLength', { max: 100 }) }
            ]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name='shortName'
            label={t('supervisionStages.shortName')}
            extra={t('supervisionStages.shortNameHint')}
            rules={[{ max: 40, message: t('fields.maxLength', { max: 40 }) }]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item
            name='description'
            label={t('supervisionStages.descriptionLabel')}
            rules={[
              { required: true, whitespace: true, message: t('fields.requiredMessage') },
              { max: 500, message: t('fields.maxLength', { max: 500 }) }
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item
            name='order'
            label={t('supervisionStages.order')}
            extra={t('supervisionStages.orderHint')}
            rules={[{ required: true, type: 'integer', min: 1, message: t('supervisionStages.orderRule') }]}
          >
            <InputNumber min={1} precision={0} style={{ width: 160 }} />
          </Form.Item>
        </>
      )}
    />
  )
}
