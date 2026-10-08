'use client'

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Collapse, Form, Input, Popconfirm, Segmented, Skeleton, Space, Tag } from 'antd'
import { useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import type { BmtPageSectionAdmin } from '../../api/bmt/handbook.api'
import { homeAdminApi } from '../../api/bmt/home.api'
import {
  HOME_SECTIONS,
  HOME_TEXT_MAX_LENGTH,
  ICON_NAME_PATTERN,
  buildContent,
  exceedsIdsTotal,
  formValuesFor,
  idsUsed,
  rowDefaults,
  sameContent,
  type HomeField,
  type HomeFixedList,
  type HomeIdList,
  type HomeRepeatList,
  type HomeSectionDef
} from '../../services/home-sections.service'
import { AdminPage } from '../common/admin-page'
import { ImageUrlField } from '../common/field-kit'
import { GuideIdsSelect, IconNameInput, TemplateIdsSelect } from './home-field-controls'

type ContentLocale = 'vi' | 'en'

const sectionsKey = (locale: ContentLocale) => adminKeys.bmt('home-sections', locale)

/**
 * Bản dịch mặc định của một ngôn ngữ, đọc theo yêu cầu để không đưa cả hai file `messages` vào bundle của màn admin.
 * Đây là chữ trang chủ đang hiển thị khi khối chưa được biên tập.
 */
const loadMessages = (locale: ContentLocale): Promise<unknown> =>
  import(`../../../../../messages/${locale}.json`).then((module) => module.default as unknown)

/**
 * NỘI DUNG TRANG CHỦ. Một màn gom chữ, ảnh, icon, mẫu và video nổi bật của 11 khối trang chủ, xếp theo đúng thứ tự
 * người đọc thấy khi cuộn trang.
 *
 * Mỗi khối lưu riêng từng ngôn ngữ. Khối chưa sửa dùng nội dung có sẵn trong ứng dụng nên form mở ra với đúng chữ đang
 * hiển thị (sửa tại chỗ); chỉ những trường khác bản có sẵn mới được lưu, và ngôn ngữ chưa sửa không mượn nội dung của
 * ngôn ngữ khác.
 */
export function HomeContentManager() {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')
  const [locale, setLocale] = useState<ContentLocale>('vi')

  const saved = useQuery({
    queryKey: sectionsKey(locale),
    queryFn: () => homeAdminApi.listSections(locale),
    staleTime: 0,
    retry: false
  })
  const defaults = useQuery({
    queryKey: adminKeys.bmt('home-sections-defaults', locale),
    queryFn: () => loadMessages(locale),
    staleTime: Infinity
  })

  // Backend chưa khai báo trang chủ (404): vẫn hiện form trên chữ có sẵn; bấm Lưu thì lỗi của BE hiện qua thông báo.
  const notDeclared = isApiError(saved.error) && saved.error.status === 404
  const loadFailed = saved.isError && !notDeclared
  const byKey = new Map((saved.data ?? []).map((section) => [section.sectionKey, section]))

  let body: ReactNode
  if (saved.isPending || defaults.isPending) {
    body = <Skeleton active />
  } else if (loadFailed || defaults.isError) {
    body = (
      <Alert type='error' showIcon title={isApiError(saved.error) ? saved.error.message : t('feedback.apiError')} />
    )
  } else {
    body = (
      <Collapse
        defaultActiveKey={[HOME_SECTIONS[0]?.key ?? '']}
        items={HOME_SECTIONS.map((section, index) => {
          const current = byKey.get(section.key) ?? null
          return {
            key: section.key,
            label: (
              <Space>
                <span className='font-semibold'>
                  {index + 1}. {tc(`sections.${section.key}.title`)}
                </span>
                {current ? <Tag color='green'>{tc('edited')}</Tag> : <Tag>{tc('usingDefault')}</Tag>}
              </Space>
            ),
            children: (
              <SectionForm
                // Đổi ngôn ngữ hoặc version thì dựng lại form để giá trị ban đầu khớp bản vừa tải.
                key={`${locale}:${section.key}:${current?.version ?? 0}`}
                section={section}
                locale={locale}
                saved={current}
                messages={defaults.data}
              />
            )
          }
        })}
      />
    )
  }

  return (
    <AdminPage
      title={t('nav.homeContent')}
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
      {body}
    </AdminPage>
  )
}

function SectionForm({
  section,
  locale,
  saved,
  messages
}: {
  section: HomeSectionDef
  locale: ContentLocale
  saved: BmtPageSectionAdmin | null
  messages: unknown
}) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')
  const texts = useHomeTexts()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)

  const initial = formValuesFor(section, saved?.content, messages)

  const fail = (err: unknown) => message.error(isApiError(err) ? err.message : t('feedback.apiError'))
  const refresh = () => queryClient.invalidateQueries({ queryKey: sectionsKey(locale) })

  const restore = async (notice = tc('restored')) => {
    setBusy(true)
    try {
      await homeAdminApi.deleteSection(section.key, locale)
      await refresh()
      message.success(notice)
    } catch (err) {
      fail(err)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    const valid = await form.validateFields().then(
      () => true,
      () => false
    )
    if (!valid) return

    const current = form.getFieldsValue(true) as Record<string, unknown>
    if (exceedsIdsTotal(section, current)) {
      message.error(tc('idsTotalExceeded', { max: section.idsTotalMax ?? 0 }))
      return
    }

    const content = buildContent(section, current, messages)

    // Mọi thứ đã về đúng bản có sẵn: không có gì để lưu, và bản đã lưu (nếu có) trở nên thừa.
    if (Object.keys(content).length === 0) {
      if (saved) await restore(tc('restoredBecauseSame'))
      else message.info(tc('unchanged'))
      return
    }
    if (saved && sameContent(content, saved.content)) {
      message.info(tc('unchanged'))
      return
    }

    setBusy(true)
    try {
      await homeAdminApi.saveSection(section.key, {
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

  return (
    <Form form={form} layout='vertical' initialValues={initial}>
      <p className='text-muted-foreground mb-4 text-sm'>{tc(`sections.${section.key}.hint`)}</p>

      {section.fields.length > 0 ? (
        <div className='grid gap-x-4 md:grid-cols-2'>
          {section.fields.map((field) => (
            <FieldItem
              key={field.name}
              field={field}
              name={field.name}
              sectionKey={section.key}
              wide={field.kind === 'textarea' || field.kind === 'image'}
            />
          ))}
        </div>
      ) : null}

      {section.lists.map((list) => (
        <div key={list.name} className='mb-2'>
          <div className='mb-2 font-semibold'>{texts(`lists.${section.key}.${list.name}.title`)}</div>
          <p className='text-muted-foreground mb-3 text-sm'>{texts(`lists.${section.key}.${list.name}.hint`)}</p>
          {list.type === 'rows' ? (
            <FixedRows list={list} section={section} messages={messages} />
          ) : list.type === 'repeat' ? (
            <RepeatRows list={list} section={section} />
          ) : (
            <IdsField list={list} section={section} />
          )}
        </div>
      ))}

      <div className='flex justify-end gap-2 border-t pt-4'>
        {saved ? (
          <Popconfirm
            title={tc('restoreConfirm')}
            okText={tc('restore')}
            cancelText={t('actions.cancel')}
            onConfirm={() => restore()}
          >
            <Button disabled={busy}>{tc('restore')}</Button>
          </Popconfirm>
        ) : null}
        <Button type='primary' loading={busy} onClick={save}>
          {t('actions.save')}
        </Button>
      </div>
    </Form>
  )
}

type LooseTranslator = ((key: string, values?: Record<string, string | number>) => string) & {
  has: (key: string) => boolean
}

/**
 * Bản dịch của màn này tra bằng khóa ghép từ mã khối và tên trường, nên không kiểm kiểu lúc biên dịch được như
 * `useTranslations` thường. Việc đó do `scripts/home-admin.test.mjs` đảm nhận: nó đối chiếu mọi khóa ghép được với
 * `vi.json` và `en.json`.
 */
function useHomeTexts() {
  return useTranslations('admin.homeContent') as unknown as LooseTranslator
}

/** Nhãn của một trường: ưu tiên nhãn riêng của khối (`fieldsBySection.<khối>.<tên>`), không có thì nhãn chung. */
function useFieldLabel(sectionKey: string) {
  const tc = useHomeTexts()
  return (name: string) =>
    tc.has(`fieldsBySection.${sectionKey}.${name}`) ? tc(`fieldsBySection.${sectionKey}.${name}`) : tc(`fields.${name}`)
}

function FieldItem({
  field,
  name,
  sectionKey,
  wide
}: {
  field: HomeField
  name: string | (string | number)[]
  sectionKey: string
  wide?: boolean
}) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')
  const label = useFieldLabel(sectionKey)(field.name)
  const wideClass = wide ? 'md:col-span-2' : undefined

  if (field.kind === 'image') {
    return (
      <div className={wideClass}>
        <ImageUrlField name={name} label={label} />
      </div>
    )
  }

  const textRules = [{ max: HOME_TEXT_MAX_LENGTH, message: t('fields.maxLength', { max: HOME_TEXT_MAX_LENGTH }) }]

  if (field.kind === 'icon') {
    return (
      <Form.Item
        className={wideClass}
        name={name}
        label={label}
        extra={tc('iconHint')}
        rules={[
          { pattern: ICON_NAME_PATTERN, message: tc('iconInvalid') },
          { whitespace: true, message: tc('iconInvalid') }
        ]}
      >
        <IconNameInput />
      </Form.Item>
    )
  }

  return (
    <Form.Item className={wideClass} name={name} label={label} rules={textRules}>
      {field.kind === 'textarea' ? (
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} maxLength={HOME_TEXT_MAX_LENGTH} showCount />
      ) : (
        <Input maxLength={HOME_TEXT_MAX_LENGTH} />
      )}
    </Form.Item>
  )
}

/** Danh sách đúng từng ấy thẻ như trang: không thêm, bớt hay đổi chỗ được. */
function FixedRows({ list, section, messages }: { list: HomeFixedList; section: HomeSectionDef; messages: unknown }) {
  const tc = useTranslations('admin.homeContent')
  const defaults = rowDefaults(list, messages)

  return (
    <Form.List name={list.name}>
      {(rows) => (
        <Space orientation='vertical' size={12} style={{ width: '100%' }}>
          {rows.map(({ key, name: index }) => {
            const hint = defaults[index]?.title ?? defaults[index]?.value
            return (
              <Card
                key={key}
                size='small'
                title={
                  <Space>
                    {tc('rowTitle', { index: index + 1 })}
                    {hint ? <span className='text-muted-foreground font-normal'>{hint}</span> : null}
                  </Space>
                }
              >
                <div className='grid gap-x-4 md:grid-cols-2'>
                  {list.fields.map((field) => (
                    <FieldItem
                      key={field.name}
                      field={field}
                      name={[index, field.name]}
                      sectionKey={section.key}
                      wide={field.kind === 'textarea' || field.kind === 'image'}
                    />
                  ))}
                </div>
              </Card>
            )
          })}
        </Space>
      )}
    </Form.List>
  )
}

/** Danh sách thêm, bớt và đổi chỗ tự do; để trống thì trang chủ dùng bộ có sẵn. */
function RepeatRows({ list, section }: { list: HomeRepeatList; section: HomeSectionDef }) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')

  return (
    <Form.List name={list.name}>
      {(rows, { add, remove, move }) => (
        <Space orientation='vertical' size={12} style={{ width: '100%' }}>
          {rows.map(({ key, name: index }, position) => (
            <Card
              key={key}
              size='small'
              title={tc('rowTitle', { index: position + 1 })}
              extra={
                <Space size={4}>
                  <Button
                    size='small'
                    icon={<ArrowUpOutlined />}
                    disabled={position === 0}
                    aria-label={tc('moveUp')}
                    onClick={() => move(position, position - 1)}
                  />
                  <Button
                    size='small'
                    icon={<ArrowDownOutlined />}
                    disabled={position === rows.length - 1}
                    aria-label={tc('moveDown')}
                    onClick={() => move(position, position + 1)}
                  />
                  <Button
                    size='small'
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={t('actions.delete')}
                    onClick={() => remove(index)}
                  />
                </Space>
              }
            >
              <div className='grid gap-x-4 md:grid-cols-2'>
                {list.fields.map((field) => (
                  <FieldItem
                    key={field.name}
                    field={field}
                    name={[index, field.name]}
                    sectionKey={section.key}
                    wide={field.kind === 'textarea' || field.kind === 'image'}
                  />
                ))}
              </div>
            </Card>
          ))}
          <Button
            icon={<PlusOutlined />}
            disabled={rows.length >= list.max}
            onClick={() => add(Object.fromEntries(list.fields.map((field) => [field.name, ''])))}
          >
            {rows.length >= list.max ? tc('maxReached', { max: list.max }) : tc('addRow')}
          </Button>
        </Space>
      )}
    </Form.List>
  )
}

/** Chọn mẫu hoặc video từ kho; thứ tự chọn là thứ tự trên trang. */
function IdsField({ list, section }: { list: HomeIdList; section: HomeSectionDef }) {
  const tc = useTranslations('admin.homeContent')
  const form = Form.useFormInstance()
  const values = Form.useWatch([], form) as Record<string, unknown> | undefined

  // Khối có giới hạn chung (2D + 3D): ô này chỉ chọn thêm được phần còn lại sau khi trừ số đã chọn ở các ô khác.
  const total = section.idsTotalMax
  const used = idsUsed(section, values)
  const raw = values?.[list.name]
  const own = Array.isArray(raw) ? raw.length : 0
  const max = total === undefined ? list.max : Math.max(0, Math.min(list.max, total - (used - own)))

  return (
    <Form.Item
      name={list.name}
      extra={total === undefined ? tc('idsHint', { max: list.max }) : tc('idsTotalHint', { max: total, used })}
    >
      {list.source === 'templates' ? <TemplateIdsSelect max={max} /> : <GuideIdsSelect max={max} />}
    </Form.Item>
  )
}
