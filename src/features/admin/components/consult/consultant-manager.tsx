'use client'

import { AppstoreOutlined, PictureOutlined, SwapOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Alert,
  Spin,
  Avatar,
  Button,
  Descriptions,
  Segmented,
  Space,
  Tag,
  Tabs,
  Typography,
  type FormInstance
} from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import { consultAdminApi, type BmtAdminArchitect, type BmtArchitectWrite } from '../../api/bmt/consult.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'
import { TableAvatar } from '../common/table-thumb'
import { ArchitectProfileForm, type ArchitectProfileTab } from './architect-profile-form'
import { ArchitectProjectCard } from './architect-project-card'
import { ARCHITECT_CATEGORIES_KEY, ArchitectCategoryDrawer } from './architect-category-drawer'

const { Text, Paragraph } = Typography

type VisibilityFilter = 'all' | 'visible' | 'hidden'

const RESOURCE = 'architects'

interface ArchitectFormValues {
  expectedVersion?: string
  fullName?: string
  title?: string
  avatarUrl?: string
  yearsExperience?: number
  projectCount?: number
  introduction?: string
  shortDescription?: string
  designProjects?: { name: string; imageUrls: string[] }[]
  categoryIds?: string[]
  isVisible?: boolean
  companyName?: string
  rating?: number | null
  reviewCount?: number | null
}

function toWrite(values: ArchitectFormValues): BmtArchitectWrite {
  const companyName = (values.companyName ?? '').trim()
  return {
    fullName: (values.fullName ?? '').trim(),
    title: (values.title ?? '').trim(),
    avatarUrl: (values.avatarUrl ?? '').trim(),
    yearsExperience: values.yearsExperience ?? 0,
    projectCount: values.projectCount ?? 0,
    introduction: (values.introduction ?? '').trim(),
    shortDescription: (values.shortDescription ?? '').trim(),
    designProjects: (values.designProjects ?? []).map((project) => ({
      name: project.name.trim(),
      imageUrls: project.imageUrls.map((url) => url.trim())
    })),
    categoryIds: values.categoryIds ?? [],
    isVisible: values.isVisible ?? false,
    // Ba trường tùy chọn (nullable): để trống thì gửi null.
    companyName: companyName || null,
    rating: values.rating ?? null,
    reviewCount: values.reviewCount ?? null
  }
}

/**
 * HỒ SƠ KIẾN TRÚC SƯ (STORY-CONSULT-001, BR-CONSULT-001) — dữ liệu trên BMT API.
 *
 * Bảy nhóm thông tin bắt buộc: ảnh đại diện, họ tên, chức danh, chuyên môn (ít
 * nhất một category), số năm kinh nghiệm, số công trình, giới thiệu. Người tạo tự
 * chọn Ẩn/Hiện, không qua phê duyệt. Không có xóa hồ sơ — chỉ Ẩn; hồ sơ ẩn không
 * nhận yêu cầu mới nhưng yêu cầu cũ vẫn giữ. Danh mục chuyên môn quản lý trong
 * ngăn kéo "Danh mục chuyên môn" ngay trên màn này.
 */
export function ConsultantManager() {
  const t = useTranslations('admin')
  const ta = useTranslations('admin.architects')
  const { modal, message } = App.useApp()
  const locale = useLocale() as Locale
  const queryClient = useQueryClient()
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editorTab, setEditorTab] = useState<{ form: FormInstance; tab: ArchitectProfileTab } | null>(null)
  const { data: categories = [] } = useQuery({
    queryKey: ARCHITECT_CATEGORIES_KEY,
    queryFn: consultAdminApi.listAllCategories
  })

  const refreshProfiles = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.bmt(RESOURCE) }),
      queryClient.invalidateQueries({ queryKey: ['consultation', 'consultants'] })
    ])

  const statusLabel = (visible: boolean) => (visible ? ta('shown') : ta('hidden'))

  return (
    <>
      <ApiResourceManager<BmtAdminArchitect>
        title={t('nav.consultants')}
        description={ta('description')}
        queryKey={adminKeys.bmt(RESOURCE, visibility)}
        fetchPage={(params) =>
          consultAdminApi.listArchitects({
            pageIndex: params.pageIndex,
            pageSize: params.pageSize,
            isVisible: visibility === 'all' ? undefined : visibility === 'visible'
          })
        }
        rowKey={(item) => item.id}
        drawerWidth={960}
        extraActions={
          <Button icon={<AppstoreOutlined />} onClick={() => setCategoriesOpen(true)}>
            {ta('manageCategories')}
          </Button>
        }
        banner={
          <Segmented<VisibilityFilter>
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'all', label: ta('allStatuses') },
              { value: 'visible', label: ta('shown') },
              { value: 'hidden', label: ta('hidden') }
            ]}
          />
        }
        columns={[
          {
            title: ta('name'),
            key: 'name',
            render: (_, record) => (
              <Space size={10}>
                <TableAvatar src={record.avatarUrl} name={record.fullName} />
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: 'block' }}>
                    {record.fullName}
                  </Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {record.title}
                  </Text>
                </div>
              </Space>
            )
          },
          {
            title: ta('categories'),
            key: 'categories',
            width: 240,
            render: (_, record) => (
              <Space size={4} wrap>
                {record.categories.map((category) => (
                  <Tag key={category.id}>{category.name}</Tag>
                ))}
              </Space>
            )
          },
          {
            title: ta('experience'),
            dataIndex: 'yearsExperience',
            width: 130,
            render: (years: number) => ta('years', { years })
          },
          {
            title: ta('projectCount'),
            dataIndex: 'projectCount',
            width: 130,
            align: 'right'
          },
          {
            title: ta('status'),
            dataIndex: 'isVisible',
            width: 120,
            render: (visible: boolean) => (
              <StatusTag tone={visible ? 'success' : 'off'}>{statusLabel(visible)}</StatusTag>
            )
          }
        ]}
        // Không đặt sẵn Ẩn/Hiện: người tạo phải tự chọn (BR-CONSULT-001 khoản 8).
        createValues={() => ({
          shortDescription: '',
          designProjects: [],
          categoryIds: [],
          yearsExperience: null,
          projectCount: null,
          isVisible: undefined
        })}
        onCreate={async (values) => {
          const result = await consultAdminApi.createArchitect(toWrite(values as ArchitectFormValues))
          await refreshProfiles()
          return result
        }}
        toFormValues={async (item) => {
          const detail = await consultAdminApi.getArchitect(item.id)
          return {
            expectedVersion: detail.version,
            fullName: detail.fullName,
            title: detail.title,
            avatarUrl: detail.avatarUrl,
            yearsExperience: detail.yearsExperience,
            projectCount: detail.projectCount,
            introduction: detail.introduction,
            shortDescription: detail.shortDescription ?? '',
            designProjects: detail.designProjects ?? [],
            categoryIds: detail.categoryIds,
            isVisible: detail.isVisible,
            companyName: detail.companyName ?? undefined,
            rating: detail.rating ?? null,
            reviewCount: detail.reviewCount ?? null
          }
        }}
        onUpdate={async (values, item) => {
          const form = values as ArchitectFormValues
          const result = await consultAdminApi.updateArchitect(item.id, {
            ...toWrite(form),
            expectedVersion: form.expectedVersion ?? item.version
          })
          await refreshProfiles()
          return result
        }}
        rowActions={(item, ctx) => {
          const current = item.isVisible ? ta('shown') : ta('hidden')
          const next = item.isVisible ? ta('hidden') : ta('shown')
          return [
            {
              key: 'visibility',
              label: t('actions.switchStatus'),
              icon: <SwapOutlined />,
              onClick: () =>
                modal.confirm({
                  title: t('actions.switchStatusTitle', { name: item.fullName }),
                  content: (
                    <div style={{ maxWidth: 300 }}>
                      <Text>{t('actions.switchStatusBody', { current, next })}</Text>
                      {item.isVisible ? (
                        <div style={{ marginTop: 6 }}>
                          <Text type='warning'>{ta('hideWarning')}</Text>
                        </div>
                      ) : null}
                    </div>
                  ),
                  okText: t('actions.confirm'),
                  cancelText: t('actions.cancel'),
                  // Danh sách không đủ trường (thiếu `version` và tập category);
                  // đọc bản chi tiết rồi gửi lại nguyên hồ sơ với `isVisible` đảo.
                  onOk: async () => {
                    try {
                      const detail = await consultAdminApi.getArchitect(item.id)
                      await consultAdminApi.updateArchitect(item.id, {
                        fullName: detail.fullName,
                        title: detail.title,
                        avatarUrl: detail.avatarUrl,
                        yearsExperience: detail.yearsExperience,
                        projectCount: detail.projectCount,
                        introduction: detail.introduction,
                        shortDescription: detail.shortDescription ?? '',
                        designProjects: detail.designProjects ?? [],
                        categoryIds: detail.categoryIds,
                        isVisible: !detail.isVisible,
                        companyName: detail.companyName ?? null,
                        rating: detail.rating ?? null,
                        reviewCount: detail.reviewCount ?? null,
                        expectedVersion: detail.version
                      })
                      await refreshProfiles()
                      await ctx.refresh()
                      message.success(t('feedback.saved'))
                    } catch (err) {
                      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                    }
                  }
                })
            }
          ] satisfies RowAction[]
        }}
        renderView={(item) => <ArchitectView item={item} locale={locale} />}
        renderForm={(form) => (
          <ArchitectProfileForm
            categories={categories}
            activeTab={editorTab?.form === form ? editorTab.tab : 'profile'}
            onTabChange={(tab) => setEditorTab({ form, tab })}
          />
        )}
        onValidationFailed={(form) => {
          const error = form.getFieldsError().find((field) => field.errors.length > 0)
          if (!error) return
          setEditorTab({ form, tab: error.name[0] === 'designProjects' ? 'projects' : 'profile' })
          requestAnimationFrame(() => form.scrollToField(error.name, { block: 'center', focus: true }))
        }}
      />

      <ArchitectCategoryDrawer
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        // Đổi tên category thì tên trong bảng KTS cũng phải đổi theo.
        onChanged={() => queryClient.invalidateQueries({ queryKey: adminKeys.bmt(RESOURCE) })}
      />
    </>
  )
}

/**
 * Ngăn kéo "Xem chi tiết". Đọc bản chi tiết để có thêm `companyName`, `rating`,
 * `reviewCount` (danh sách không trả), dùng dòng danh sách làm nền khi đang tải.
 */
function ArchitectView({ item, locale }: { item: BmtAdminArchitect; locale: Locale }) {
  const ta = useTranslations('admin.architects')
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.bmt(RESOURCE, 'detail', item.id),
    queryFn: () => consultAdminApi.getArchitect(item.id)
  })
  if (isPending) return <Spin />
  if (isError) return <Alert type='error' showIcon title={ta('detailError')} />
  const dash = '—'
  return (
    <div className='space-y-7'>
      <div className='flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center'>
        <Avatar src={item.avatarUrl} shape='square' size={88} style={{ borderRadius: 16, flexShrink: 0 }} />
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='flex flex-wrap items-center gap-3'>
            <h2 className='text-xl font-semibold break-words'>{item.fullName}</h2>
            <StatusTag tone={item.isVisible ? 'success' : 'off'}>
              {item.isVisible ? ta('shown') : ta('hidden')}
            </StatusTag>
          </div>
          <p className='text-muted-foreground text-sm'>{item.title}</p>
          <p className='text-sm'>{data?.companyName?.trim() || dash}</p>
          <Space size={4} wrap>
            {item.categories.map((category) => (
              <Tag key={category.id}>{category.name}</Tag>
            ))}
          </Space>
        </div>
      </div>

      <Tabs
        defaultActiveKey='profile'
        items={[
          {
            key: 'profile',
            label: ta('tabs.profile'),
            icon: <UserOutlined />,
            children: (
              <div className='space-y-7'>
                <Descriptions
                  size='small'
                  column={{ xs: 1, sm: 2 }}
                  items={[
                    { key: 'years', label: ta('experience'), children: ta('years', { years: item.yearsExperience }) },
                    { key: 'projects', label: ta('projectCount'), children: item.projectCount },
                    { key: 'rating', label: ta('rating'), children: data?.rating ?? dash },
                    { key: 'reviewCount', label: ta('reviewCount'), children: data?.reviewCount ?? dash },
                    { key: 'created', label: ta('createdAt'), children: formatDisplayDate(item.createdOnUtc, locale) }
                  ]}
                />

                <section className='space-y-4 border-t border-border pt-6' aria-label={ta('sections.about')}>
                  <h2 className='text-base font-semibold'>{ta('sections.about')}</h2>
                  <div className='rounded-xl bg-muted/40 p-4'>
                    <p className='text-muted-foreground mb-2 text-xs font-medium'>{ta('shortDescription')}</p>
                    <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>
                      {data?.shortDescription || dash}
                    </Paragraph>
                  </div>
                  <div>
                    <p className='text-muted-foreground mb-2 text-xs font-medium'>{ta('intro')}</p>
                    <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>{item.introduction}</Paragraph>
                  </div>
                </section>
              </div>
            )
          },
          {
            key: 'projects',
            label: ta('tabs.projects'),
            icon: <PictureOutlined />,
            children: (
              <section className='space-y-5' aria-label={ta('designProjects')}>
                <h2 className='text-base font-semibold'>{ta('designProjects')}</h2>
                {data?.designProjects?.length ? (
                  <ul className='flex snap-x snap-proximity gap-4 overflow-x-auto pb-3'>
                    {data.designProjects.map((project, index) => (
                      <li key={index} className='w-64 max-w-full shrink-0 snap-start sm:w-72 lg:w-80'>
                        <ArchitectProjectCard project={project} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className='rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center'>
                    <p className='text-muted-foreground text-sm'>{ta('noDesignProjects')}</p>
                  </div>
                )}
              </section>
            )
          }
        ]}
      />
    </div>
  )
}
