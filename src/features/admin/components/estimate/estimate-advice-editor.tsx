'use client'

import { Alert, Form, Input } from 'antd'
import { useTranslations } from 'next-intl'

import { DocumentEditor } from '../common/document-editor'

const SECTIONS = ['structure', 'finishing', 'interior'] as const

/**
 * NỘI DUNG TƯ VẤN SAVICO (spec admin #3, STORY-005) — các đoạn cố định của khối
 * tư vấn dưới bảng dự toán. Đoạn mở đầu, suất đầu tư và cơ cấu chi phí hệ thống
 * tự điền số theo từng dự án nên không soạn ở đây. Để trống = câu mặc định.
 */
export function EstimateAdviceEditor() {
  const t = useTranslations('admin')

  return (
    <DocumentEditor
      document='estimateAdvice'
      title={t('nav.estimateAdvice')}
      description={t('estimateAdvice.description')}
    >
      {() => (
        <>
          <Alert
            type='info'
            showIcon
            title={t('estimateAdvice.autoNote')}
            style={{ marginBottom: 20, maxWidth: 780 }}
          />
          {SECTIONS.map((section) => (
            <Form.Item
              key={section}
              name={['dominant', section]}
              label={t(`estimateAdvice.dominant.${section}`)}
              extra={t('estimateAdvice.emptyHint')}
              rules={[{ max: 1000, message: t('fields.maxLength', { max: 1000 }) }]}
            >
              <Input.TextArea rows={3} maxLength={1000} showCount style={{ maxWidth: 780 }} />
            </Form.Item>
          ))}
          <Form.Item
            name='disclaimer'
            label={t('estimateAdvice.disclaimer')}
            extra={t('estimateAdvice.emptyHint')}
            rules={[{ max: 1000, message: t('fields.maxLength', { max: 1000 }) }]}
          >
            <Input.TextArea rows={3} maxLength={1000} showCount style={{ maxWidth: 780 }} />
          </Form.Item>
        </>
      )}
    </DocumentEditor>
  )
}
