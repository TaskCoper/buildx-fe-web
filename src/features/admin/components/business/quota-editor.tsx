'use client'

import { Alert, Form, InputNumber } from 'antd'
import { useTranslations } from 'next-intl'

import { DocumentEditor } from '../common/document-editor'

/**
 * LƯỢT ĐỌC CHI TIẾT MẪU (epic TemplateViewManagement).
 *
 * Đúng MỘT cấu hình tổng: số lượt đọc chi tiết thư viện mẫu tối đa mỗi ngày,
 * dùng chung và cộng dồn cho cả mẫu 2D lẫn 3D. Không cấu hình riêng từng loại,
 * không xem lịch sử ai đã đọc mẫu nào, không sửa lượt đã dùng của từng người.
 */
export function QuotaEditor() {
  const t = useTranslations('admin')

  return (
    <DocumentEditor document='quotas' title={t('nav.templateViews')} description={t('templateViews.description')}>
      {() => (
        <>
          <Alert type='info' showIcon title={t('templateViews.scope')} style={{ marginBottom: 20, maxWidth: 640 }} />
          <Form.Item
            name='handbookDetailPerDay'
            label={t('templateViews.perDay')}
            extra={t('templateViews.perDayHint')}
            rules={[{ required: true, type: 'integer', min: 1, message: t('templateViews.rule') }]}
          >
            <InputNumber min={1} precision={0} style={{ width: 220 }} suffix={t('templateViews.unit')} />
          </Form.Item>
        </>
      )}
    </DocumentEditor>
  )
}
