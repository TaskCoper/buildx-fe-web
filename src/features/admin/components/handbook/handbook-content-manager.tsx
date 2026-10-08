'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Segmented,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography
} from 'antd'
import { useTranslations } from 'next-intl'
import { Suspense, useState, type ReactNode } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import { handbookAdminApi, type BmtPageSectionAdmin } from '../../api/bmt/handbook.api'
import { useFormPage } from '../../hooks/use-form-page'
import {
  HANDBOOK_SECTIONS,
  HANDBOOK_SECTION_GROUPS,
  SECTION_TEXT_MAX_LENGTH,
  buildContent,
  defaultsFor,
  formValuesFor,
  sameContent,
  type SectionDef,
  type SectionGroup,
  type SectionKey
} from '../../services/handbook-sections.service'
import { AdminPage } from '../common/admin-page'
import { ImageUrlField } from '../common/field-kit'
import { HandbookNewsletterManager } from './handbook-newsletter-manager'
import { HandbookStepManager } from './handbook-step-manager'

const { Text } = Typography

type ContentLocale = 'vi' | 'en'

/** Hai tab của màn; khối dùng chung (`shared`) nằm trên thanh tab nên không có tab riêng. */
type ContentTab = Exclude<SectionGroup, 'shared'>

/** Tên nhãn của khối trong `admin.handbookContent.sections.<key>`. */
const sectionsKey = (locale: ContentLocale) => adminKeys.bmt('handbook-sections', locale)

/**
 * Bản dịch mặc định của một ngôn ngữ, đọc theo yêu cầu để không đưa cả hai file `messages` vào bundle của màn admin.
 * Đây là chữ trang đang hiển thị khi khối chưa được biên tập.
 */
const loadMessages = (locale: ContentLocale): Promise<unknown> =>
  import(`../../../../../messages/${locale}.json`).then((module) => module.default as unknown)

/** Khối chữ theo mã để dựng đúng thẻ ở đúng chỗ. */
const SECTIONS_BY_KEY = new Map(HANDBOOK_SECTIONS.map((section) => [section.key, section]))

/**
 * NỘI DUNG TRANG CẨM NANG (STORY-HB-001 đến STORY-HB-004, BR-HB-001 đến BR-HB-003).
 *
 * Gom mọi thứ người quản lý sửa ở trang Cẩm nang vào một màn, chia hai tab theo tab của trang công khai và xếp theo
 * đúng thứ tự người đọc thấy:
 * - Tên hai tab đứng trên thanh tab vì dùng chung cho cả hai.
 * - Tab Tin tức: phần mở đầu, ba bước và chủ đề hướng dẫn, khối Bản tin với bài nổi bật, khối bài viết.
 * - Tab Thư viện mẫu: banner.
 *
 * Các thẻ chữ lưu riêng từng ngôn ngữ; khối chưa biên tập thì trang dùng bản dịch sẵn có nên form mở ra với chính chữ
 * đang hiển thị, và ngôn ngữ chưa có bản riêng không mượn bản của ngôn ngữ khác. Ba bước, chủ đề hướng dẫn và bài nổi
 * bật không theo ngôn ngữ.
 *
 * Ngôn ngữ và tab đang chọn giữ ở thành phần ngoài cùng để khi mở form sửa một bước (form thay cả màn) rồi quay lại
 * thì vẫn ở đúng chỗ cũ.
 */
export function HandbookContentManager() {
  const [locale, setLocale] = useState<ContentLocale>('vi')
  const [tab, setTab] = useState<ContentTab>('news')

  // `useFormPage` đọc `useSearchParams` nên cần ranh giới Suspense.
  return (
    <Suspense fallback={<Skeleton active />}>
      <ContentScreen locale={locale} onLocaleChange={setLocale} tab={tab} onTabChange={setTab} />
    </Suspense>
  )
}

interface ContentScreenProps {
  locale: ContentLocale
  onLocaleChange: (locale: ContentLocale) => void
  tab: ContentTab
  onTabChange: (tab: ContentTab) => void
}

function ContentScreen(props: ContentScreenProps) {
  const formPage = useFormPage()

  // Form Thêm / Sửa / Xem của một bước là một trang riêng thay cả màn (cách `ApiResourceManager` hoạt động), nên khi
  // đang mở form chỉ dựng phần ba bước; phần còn lại quay lại khi đóng form.
  if (formPage.mode) return <HandbookStepManager />

  return <ContentLayout {...props} />
}

function ContentLayout({ locale, onLocaleChange, tab, onTabChange }: ContentScreenProps) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.handbookContent')

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

  const byKey = new Map((saved.data ?? []).map((section) => [section.sectionKey, section]))

  /**
   * Thẻ chữ của một khối. Lỗi hoặc đang tải chỉ ảnh hưởng các thẻ chữ: ba bước và bài nổi bật tự tải riêng nên vẫn
   * dùng được khi API khối chữ gặp sự cố.
   */
  const card = (key: SectionKey) => {
    const section = SECTIONS_BY_KEY.get(key)
    if (!section) return null
    if (saved.isPending || defaults.isPending) return <Skeleton key={key} active />
    if (saved.error || !saved.data || defaults.error) {
      return (
        <Alert
          key={key}
          type='error'
          showIcon
          title={isApiError(saved.error) ? saved.error.message : t('feedback.apiError')}
        />
      )
    }
    return (
      <SectionCard
        // Đổi ngôn ngữ hoặc version thì dựng lại form để giá trị ban đầu khớp bản vừa tải.
        key={`${locale}:${key}:${byKey.get(key)?.version ?? 0}`}
        section={section}
        locale={locale}
        saved={byKey.get(key) ?? null}
        messages={defaults.data}
      />
    )
  }

  return (
    <AdminPage
      title={t('nav.handbookContent')}
      description={tc('description')}
      actions={
        <Segmented<ContentLocale>
          value={locale}
          onChange={onLocaleChange}
          options={[
            { value: 'vi', label: tc('locales.vi') },
            { value: 'en', label: tc('locales.en') }
          ]}
        />
      }
    >
      <Space orientation='vertical' size={16} style={{ width: '100%' }}>
        {/* Tên hai tab đặt tên cho chính thanh tab nên dùng chung cho cả hai tab. */}
        {HANDBOOK_SECTION_GROUPS.shared.map(card)}
        <Tabs
          activeKey={tab}
          onChange={(key) => onTabChange(key as ContentTab)}
          items={[
            {
              key: 'news',
              label: tc('groups.news'),
              children: (
                <Space orientation='vertical' size={32} style={{ width: '100%' }}>
                  <ContentGroup title={tc('newsGroups.top.title')} hint={tc('newsGroups.top.hint')}>
                    {card('hero')}
                    {card('stagesHeading')}
                    <HandbookStepManager />
                  </ContentGroup>
                  <ContentGroup title={tc('newsGroups.newsletter.title')} hint={tc('newsGroups.newsletter.hint')}>
                    {card('newsletterHeading')}
                    <HandbookNewsletterManager />
                  </ContentGroup>
                  <ContentGroup title={tc('newsGroups.articles.title')} hint={tc('newsGroups.articles.hint')}>
                    {card('articlesHeading')}
                  </ContentGroup>
                </Space>
              )
            },
            {
              key: 'library',
              label: tc('groups.library'),
              children: (
                <Space orientation='vertical' size={16} style={{ width: '100%' }}>
                  {HANDBOOK_SECTION_GROUPS.library.map(card)}
                </Space>
              )
            }
          ]}
        />
      </Space>
    </AdminPage>
  )
}

/** Một nhóm theo vùng của trang công khai: tiêu đề, một dòng nói vùng đó nằm ở đâu, rồi các thẻ sửa. */
function ContentGroup({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className='flex flex-col gap-4'>
      <div className='border-primary border-l-4 pl-3'>
        <div className='text-base font-semibold'>{title}</div>
        <Text type='secondary'>{hint}</Text>
      </div>
      {children}
    </section>
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
