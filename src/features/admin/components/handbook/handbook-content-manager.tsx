'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Form, Input, Popconfirm, Segmented, Skeleton, Space, Tag } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import { handbookAdminApi, type BmtPageSectionAdmin } from '../../api/bmt/handbook.api'
import {
  HANDBOOK_SECTIONS,
  SECTION_TEXT_MAX_LENGTH,
  buildContent,
  defaultsFor,
  formValuesFor,
  sameContent,
  type SectionDef
} from '../../services/handbook-sections.service'
import { AdminPage } from '../common/admin-page'
import { ImageUrlField } from '../common/field-kit'

type ContentLocale = 'vi' | 'en'

/** Tên nhãn của khối trong `admin.handbookContent.sections.<key>`. */
const sectionsKey = (locale: ContentLocale) => adminKeys.bmt('handbook-sections', locale)

/**
 * Bản dịch mặc định của một ngôn ngữ, đọc theo yêu cầu để không đưa cả hai file `messages` vào bundle của màn admin.
 * Đây là chữ trang đang hiển thị khi khối chưa được biên tập.
 */
const loadMessages = (locale: ContentLocale): Promise<unknown> =>
  import(`../../../../../messages/${locale}.json`).then((module) => module.default as unknown)

/**
 * NỘI DUNG CHỮ CỦA TRANG CẨM NANG (STORY-HB-004, BR-HB-003).
 *
 * Sáu khối chữ cố định — tên hai tab, phần mở đầu, tiêu đề nhóm ba bước, tiêu đề khối bài viết, tiêu đề khối Bản tin
 * và banner của tab Thư viện mẫu — theo từng ngôn ngữ. Khối chưa biên tập thì trang dùng bản dịch sẵn có, nên form mở ra với chính chữ đang hiển thị để sửa từ
 * đó. Một ngôn ngữ chưa có bản riêng không mượn bản của ngôn ngữ khác.
 */
export function HandbookContentManager() {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.handbookContent')
  const [locale, setLocale] = useState<ContentLocale>('vi')

  const saved = useQuery({
    queryKey: sectionsKey(locale),
    queryFn: () => handbookAdminApi.listPageSections(locale),
    staleTime: 0
  })
  const defaults = useQuery({
    queryKey: adminKeys.bmt('handbook-sections-defaults', locale),
    queryFn: () => loadMessages(locale),
    staleTime: Infinity
  })

  if (saved.isPending || defaults.isPending) return <Skeleton active />
  if (saved.error || !saved.data || defaults.error) {
    return (
      <Alert type='error' showIcon title={isApiError(saved.error) ? saved.error.message : t('feedback.apiError')} />
    )
  }

  const byKey = new Map(saved.data.map((section) => [section.sectionKey, section]))

  return (
    <AdminPage
      title={t('nav.handbookContent')}
      description={tc('description')}
      actions={
        <Segmented<ContentLocale>
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'vi', label: tc('locales.vi') },
            { value: 'en', label: tc('locales.en') }
          ]}
        />
      }
    >
      <Space orientation='vertical' size={16} style={{ width: '100%' }}>
        {HANDBOOK_SECTIONS.map((section) => (
          <SectionCard
            // Đổi ngôn ngữ hoặc version thì dựng lại form để giá trị ban đầu khớp bản vừa tải.
            key={`${locale}:${section.key}:${byKey.get(section.key)?.version ?? 0}`}
            section={section}
            locale={locale}
            saved={byKey.get(section.key) ?? null}
            messages={defaults.data}
          />
        ))}
      </Space>
    </AdminPage>
  )
}

function SectionCard({
  section,
  locale,
  saved,
  messages
}: {
  section: SectionDef
  locale: ContentLocale
  saved: BmtPageSectionAdmin | null
  messages: unknown
}) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.handbookContent')
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<Record<string, string>>()
  const [busy, setBusy] = useState(false)

  const defaults = defaultsFor(section.fields, messages)
  const initial = formValuesFor(section.fields, saved?.content, defaults)

  const fail = (err: unknown) => message.error(isApiError(err) ? err.message : t('feedback.apiError'))
  const refresh = () => queryClient.invalidateQueries({ queryKey: sectionsKey(locale) })

  const save = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const content = buildContent(section.fields, values)

    // Chưa có bản lưu và chữ y hệt bản mặc định: không tạo bản lưu, để trang tiếp tục theo bản dịch khi bản dịch đổi.
    if (!saved && sameContent(content, buildContent(section.fields, defaults))) {
      message.info(tc('unchanged'))
      return
    }

    setBusy(true)
    try {
      await handbookAdminApi.savePageSection(section.key, {
        locale,
        schemaVersion: saved?.schemaVersion ?? 1,
        content,
        expectedVersion: saved?.version
      })
      await refresh()
      message.success(t('feedback.saved'))
    } catch (err) {
      fail(err)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    setBusy(true)
    try {
      await handbookAdminApi.deletePageSection(section.key, locale)
      await refresh()
      message.success(tc('restored'))
    } catch (err) {
      fail(err)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          {tc(`sections.${section.key}.title`)}
          {saved ? <Tag color='green'>{tc('edited')}</Tag> : <Tag>{tc('usingDefault')}</Tag>}
        </Space>
      }
      extra={
        <Space>
          {saved ? (
            <Popconfirm
              title={tc('restoreConfirm')}
              okText={tc('restore')}
              cancelText={t('actions.cancel')}
              onConfirm={restore}
            >
              <Button disabled={busy}>{tc('restore')}</Button>
            </Popconfirm>
          ) : null}
          <Button type='primary' loading={busy} onClick={save}>
            {t('actions.save')}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout='vertical' initialValues={initial}>
        {section.fields.map((field) =>
          field.kind === 'image' ? (
            <ImageUrlField key={field.name} name={field.name} label={tc(`fields.${field.name}`)} />
          ) : (
            <Form.Item
              key={field.name}
              name={field.name}
              label={tc(`fields.${field.name}`)}
              rules={[
                { required: field.required, whitespace: true, message: t('fields.requiredMessage') },
                { max: SECTION_TEXT_MAX_LENGTH, message: t('fields.maxLength', { max: SECTION_TEXT_MAX_LENGTH }) }
              ]}
            >
              {field.kind === 'textarea' ? (
                <Input.TextArea rows={3} maxLength={SECTION_TEXT_MAX_LENGTH} showCount />
              ) : (
                <Input maxLength={SECTION_TEXT_MAX_LENGTH} />
              )}
            </Form.Item>
          )
        )}
      </Form>
    </Card>
  )
}
