'use client'

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Popconfirm,
  Segmented,
  Skeleton,
  Space,
  Tag,
  theme
} from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import type { BmtPageSectionAdmin } from '../../api/bmt/handbook.api'
import { homeAdminApi } from '../../api/bmt/home.api'
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard'
import {
  HOME_SECTIONS,
  HOME_TEXT_MAX_LENGTH,
  ICON_NAME_PATTERN,
  formValuesFor,
  formValuesForAll,
  planSectionSave,
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
import {
  ArchitectIdsSelect,
  ArticleIdsSelect,
  GuideIdsSelect,
  IconNameInput,
  TemplateIdsSelect
} from './home-field-controls'

type ContentLocale = 'vi' | 'en'

/** Giá trị cả form: mỗi khối theo mã khối. */
type PageValues = Record<string, Record<string, unknown>>

/** Đường dẫn tên trường trong form cả trang: `[mã khối, tên trường, ...]`. */
type FieldPath = (string | number)[]

const sectionsKey = (locale: ContentLocale) => adminKeys.bmt('home-sections', locale)

/**
 * Bản dịch mặc định của một ngôn ngữ, đọc theo yêu cầu để không đưa cả hai file `messages` vào bundle của màn admin.
 * Đây là chữ trang chủ đang hiển thị khi khối chưa được biên tập.
 */
const loadMessages = (locale: ContentLocale): Promise<unknown> =>
  import(`../../../../../messages/${locale}.json`).then((module) => module.default as unknown)

/**
 * NỘI DUNG TRANG CHỦ. Một màn gom chữ, ảnh, icon, mẫu và video nổi bật của 12 khối trang chủ, xếp theo đúng thứ tự
 * người đọc thấy khi cuộn trang.
 *
 * Cả trang là MỘT form và MỘT nút "Lưu tất cả": bấm thì chỉ các khối đang có thay đổi được gửi lên (khối nào đưa về đúng
 * bản có sẵn thì gỡ bản đã lưu). Mỗi khối lưu riêng từng ngôn ngữ. Khối chưa sửa dùng nội dung có sẵn trong ứng dụng nên
 * form mở ra với đúng chữ đang hiển thị (sửa tại chỗ); chỉ những trường khác bản có sẵn mới được lưu, và ngôn ngữ chưa
 * sửa không mượn nội dung của ngôn ngữ khác.
 */
export function HomeContentManager() {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')
  const { modal } = App.useApp()
  const [locale, setLocale] = useState<ContentLocale>('vi')
  const [pending, setPending] = useState(0)

  const saved = useQuery({
    queryKey: sectionsKey(locale),
    queryFn: () => homeAdminApi.listSections(locale),
    staleTime: 0,
    retry: false,
    // Form giữ thứ người dùng đang sửa nên danh sách đã lưu chỉ đổi do chính thao tác lưu ở màn này; tự tải lại khi quay
    // lại tab sẽ làm lệch phiên bản đang gửi lên.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
  const defaults = useQuery({
    queryKey: adminKeys.bmt('home-sections-defaults', locale),
    queryFn: () => loadMessages(locale),
    staleTime: Infinity
  })

  // Backend chưa khai báo trang chủ (404): vẫn hiện form trên chữ có sẵn; bấm Lưu thì lỗi của BE hiện qua thông báo.
  const notDeclared = isApiError(saved.error) && saved.error.status === 404
  const loadFailed = saved.isError && !notDeclared

  const changeLocale = (next: ContentLocale) => {
    if (next === locale) return
    if (pending === 0) {
      setLocale(next)
      return
    }
    modal.confirm({
      title: tc('unsavedTitle'),
      content: tc('unsavedBody'),
      okText: tc('discard'),
      cancelText: tc('keepEditing'),
      onOk: () => {
        setPending(0)
        setLocale(next)
      }
    })
  }

  let body: ReactNode
  if (saved.isPending || defaults.isPending) {
    body = <Skeleton active />
  } else if (loadFailed || defaults.isError) {
    body = (
      <Alert type='error' showIcon title={isApiError(saved.error) ? saved.error.message : t('feedback.apiError')} />
    )
  } else {
    body = (
      <HomeContentForm
        // Đổi ngôn ngữ thì dựng lại cả form để giá trị ban đầu khớp bản của ngôn ngữ đó.
        key={locale}
        locale={locale}
        saved={saved.data ?? []}
        messages={defaults.data}
        onPendingChange={setPending}
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
          onChange={changeLocale}
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

function HomeContentForm({
  locale,
  saved,
  messages,
  onPendingChange
}: {
  locale: ContentLocale
  saved: BmtPageSectionAdmin[]
  messages: unknown
  onPendingChange: (count: number) => void
}) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.homeContent')
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)

  const savedByKey = useMemo(() => new Map(saved.map((section) => [section.sectionKey, section])), [saved])

  // Giá trị ban đầu chỉ tính một lần lúc form dựng; sau khi lưu, form giữ nguyên thứ người dùng đã nhập.
  const [initial] = useState<PageValues>(() =>
    formValuesForAll(Object.fromEntries(saved.map((section) => [section.sectionKey, section.content])), messages)
  )
  const [snapshot, setSnapshot] = useState<PageValues>(initial)
  // Mốc để biết người dùng đã đụng tới khối nào: giá trị lúc nạp, và được cập nhật mỗi khi một khối lưu xong, nạp lại
  // hoặc khôi phục, để đưa nội dung về như trước khi lưu vẫn được tính là một thay đổi.
  const [baseline, setBaseline] = useState<PageValues>(initial)

  // Khối nào cần làm gì khi bấm Lưu tất cả. Khối người dùng chưa đụng tới thì không bao giờ tính là có thay đổi, kể cả
  // khi bản đã lưu do công cụ khác ghi theo hình dạng hơi khác.
  const plans = useMemo(
    () =>
      HOME_SECTIONS.map((section) => {
        const touched = !sameContent(snapshot[section.key], baseline[section.key])
        const plan = touched
          ? planSectionSave(section, snapshot[section.key], messages, savedByKey.get(section.key))
          : ({ action: 'none' } as const)
        return { section, plan }
      }),
    [snapshot, baseline, messages, savedByKey]
  )
  const pending = plans.filter(({ plan }) => plan.action !== 'none')
  const changedKeys = new Set(pending.map(({ section }) => section.key))

  useUnsavedGuard(pending.length > 0)
  useEffect(() => {
    onPendingChange(pending.length)
    return () => onPendingChange(0)
  }, [pending.length, onPendingChange])

  const readValues = () => form.getFieldsValue(true) as PageValues
  const refresh = () => queryClient.invalidateQueries({ queryKey: sectionsKey(locale) })
  const errorText = (err: unknown) => (isApiError(err) ? err.message : t('feedback.apiError'))
  const titleOf = (section: HomeSectionDef) => tc(`sections.${section.key}.title`)

  const saveAll = async () => {
    const invalid = await form.validateFields().then(
      () => null,
      (error: { errorFields?: { name: FieldPath }[] }) => error
    )
    if (invalid) {
      message.error(tc('fixErrors'))
      const first = invalid.errorFields?.[0]?.name
      if (first) form.scrollToField(first)
      return
    }

    setBusy(true)
    const failures: { section: HomeSectionDef; err: unknown }[] = []
    const succeeded: HomeSectionDef[] = []

    // Lần lượt từng khối: một khối lỗi (xung đột, sai hình dạng) không làm mất các khối còn lại.
    for (const { section, plan } of plans) {
      if (plan.action === 'none') continue
      const current = savedByKey.get(section.key)
      try {
        if (plan.action === 'delete') {
          await homeAdminApi.deleteSection(section.key, locale)
        } else {
          await homeAdminApi.saveSection(section.key, {
            locale,
            schemaVersion: current?.schemaVersion ?? 1,
            content: plan.content,
            expectedVersion: current?.version
          })
        }
        succeeded.push(section)
      } catch (err) {
        failures.push({ section, err })
      }
    }
    const done = succeeded.length

    await refresh()
    const fresh = queryClient.getQueryData<BmtPageSectionAdmin[]>(sectionsKey(locale)) ?? []

    // Khối vừa bị người khác sửa: nạp lại bản mới của khối đó, để lần lưu sau không đè lên thay đổi của họ.
    const conflicts = failures.filter(({ err }) => isApiError(err) && err.status === 409).map(({ section }) => section)
    for (const section of conflicts) {
      const latest = fresh.find((item) => item.sectionKey === section.key)
      form.setFieldValue(section.key, formValuesFor(section, latest?.content, messages))
    }
    const after = readValues()
    setSnapshot(after)
    // Khối đã lưu xong hoặc vừa nạp lại từ backend trở thành mốc mới; khối lỗi giữ nguyên để vẫn tính là có thay đổi.
    setBaseline((previous) => {
      const next = { ...previous }
      for (const section of [...succeeded, ...conflicts]) next[section.key] = after[section.key] ?? {}
      return next
    })

    if (failures.length === 0) {
      message.success(tc('savedAll', { count: done }))
    } else {
      const first = errorText(failures[0]?.err)
      message.error({
        content:
          done === 0
            ? first
            : `${tc('savePartial', { done, failed: failures.length, names: failures.map(({ section }) => titleOf(section)).join(', ') })} ${first}`,
        duration: 6
      })
    }
    if (conflicts.length > 0) {
      message.warning({ content: tc('conflictReloaded', { names: conflicts.map(titleOf).join(', ') }), duration: 6 })
    }
    setBusy(false)
  }

  const restoreSection = async (section: HomeSectionDef) => {
    setBusy(true)
    try {
      await homeAdminApi.deleteSection(section.key, locale)
      await refresh()
      form.setFieldValue(section.key, formValuesFor(section, undefined, messages))
      const after = readValues()
      setSnapshot(after)
      setBaseline((previous) => ({ ...previous, [section.key]: after[section.key] ?? {} }))
      message.success(tc('restored'))
    } catch (err) {
      message.error(errorText(err))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Form form={form} layout='vertical' initialValues={initial} onValuesChange={() => setSnapshot(readValues())}>
      <Collapse
        defaultActiveKey={[HOME_SECTIONS[0]?.key ?? '']}
        items={HOME_SECTIONS.map((section, index) => {
          const current = savedByKey.get(section.key) ?? null
          return {
            key: section.key,
            label: (
              <Space>
                <span className='font-semibold'>
                  {index + 1}. {titleOf(section)}
                </span>
                {current ? <Tag color='green'>{tc('edited')}</Tag> : <Tag>{tc('usingDefault')}</Tag>}
                {changedKeys.has(section.key) ? <Tag color='orange'>{tc('changed')}</Tag> : null}
              </Space>
            ),
            children: (
              <SectionBody
                section={section}
                messages={messages}
                hasSaved={current !== null}
                busy={busy}
                onRestore={() => restoreSection(section)}
              />
            )
          }
        })}
      />

      <div
        className='sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3'
        style={{
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG
        }}
      >
        <span className='text-muted-foreground text-sm'>
          {pending.length > 0 ? tc('pendingCount', { count: pending.length }) : tc('noPending')}
        </span>
        <Button type='primary' loading={busy} disabled={pending.length === 0} onClick={saveAll}>
          {tc('saveAll')}
        </Button>
      </div>
    </Form>
  )
}

function SectionBody({
  section,
  messages,
  hasSaved,
  busy,
  onRestore
}: {
  section: HomeSectionDef
  messages: unknown
  hasSaved: boolean
  busy: boolean
  onRestore: () => void
}) {
  const tc = useTranslations('admin.homeContent')
  const t = useTranslations('admin')
  const texts = useHomeTexts()

  return (
    <>
      <div className='mb-4 flex items-start justify-between gap-4'>
        <p className='text-muted-foreground text-sm'>{tc(`sections.${section.key}.hint`)}</p>
        {hasSaved ? (
          <Popconfirm
            title={tc('restoreConfirm')}
            okText={tc('restore')}
            cancelText={t('actions.cancel')}
            onConfirm={onRestore}
          >
            <Button size='small' disabled={busy}>
              {tc('restore')}
            </Button>
          </Popconfirm>
        ) : null}
      </div>

      {section.fields.length > 0 ? (
        <div className='grid gap-x-4 md:grid-cols-2'>
          {section.fields.map((field) => (
            <FieldItem
              key={field.name}
              field={field}
              name={[section.key, field.name]}
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
    </>
  )
}

type LooseTranslator = ((key: string, values?: Record<string, string | number>) => string) & {
  has: (key: string) => boolean
}

/**
 * Bản dịch của màn này tra bằng khóa ghép từ mã khối và tên trường, nên không kiểm kiểu lúc biên dịch được như
 * `useTranslations` thường. Việc đó do `scripts/home-contract.test.mjs` đảm nhận: nó đối chiếu mọi khóa ghép được với
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
  name: FieldPath
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
    <Form.List name={[section.key, list.name]}>
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
    <Form.List name={[section.key, list.name]}>
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

/** Chọn mẫu, bài viết, video hoặc kiến trúc sư từ kho công khai; thứ tự chọn là thứ tự trên trang. */
function IdsField({ list, section }: { list: HomeIdList; section: HomeSectionDef }) {
  const tc = useTranslations('admin.homeContent')

  return (
    <Form.Item name={[section.key, list.name]} extra={tc('idsHint', { max: list.max })}>
      {list.source === 'templates' ? (
        <TemplateIdsSelect kind={list.drawingKind ?? '2D'} max={list.max} />
      ) : list.source === 'articles' ? (
        <ArticleIdsSelect max={list.max} />
      ) : list.source === 'guides' ? (
        <GuideIdsSelect max={list.max} />
      ) : (
        <ArchitectIdsSelect max={list.max} />
      )}
    </Form.Item>
  )
}
