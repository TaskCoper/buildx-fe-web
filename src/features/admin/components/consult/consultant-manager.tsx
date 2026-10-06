'use client'

import { AppstoreOutlined, SwapOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Avatar,
  Button,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography
} from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import {
  CONSULT_LIMITS,
  consultAdminApi,
  type BmtAdminArchitect,
  type BmtArchitectWrite
} from '../../api/bmt/consult.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import { ImageUrlField } from '../common/field-kit'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'
import { TableAvatar } from '../common/table-thumb'
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
  const { data: categories = [] } = useQuery({
    queryKey: ARCHITECT_CATEGORIES_KEY,
    queryFn: consultAdminApi.listAllCategories
  })

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
        drawerWidth={680}
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
        createValues={() => ({ categoryIds: [], yearsExperience: null, projectCount: null, isVisible: undefined })}
        onCreate={(values) => consultAdminApi.createArchitect(toWrite(values as ArchitectFormValues))}
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
            categoryIds: detail.categoryIds,
            isVisible: detail.isVisible,
            companyName: detail.companyName ?? undefined,
            rating: detail.rating ?? null,
            reviewCount: detail.reviewCount ?? null
          }
        }}
        onUpdate={(values, item) => {
          const form = values as ArchitectFormValues
          return consultAdminApi.updateArchitect(item.id, {
            ...toWrite(form),
            expectedVersion: form.expectedVersion ?? item.version
          })
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
                        categoryIds: detail.categoryIds,
                        isVisible: !detail.isVisible,
                        companyName: detail.companyName ?? null,
                        rating: detail.rating ?? null,
                        reviewCount: detail.reviewCount ?? null,
                        expectedVersion: detail.version
                      })
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
        renderForm={() => (
          <>
            <Form.Item name='expectedVersion' hidden>
              <Input />
            </Form.Item>
            <ImageUrlField name='avatarUrl' label={ta('avatar')} required />
            <Text type='secondary' style={{ display: 'block', marginTop: -8, marginBottom: 16, fontSize: 12 }}>
              {ta('avatarHint')}
            </Text>
            <Row gutter={16}>
              <Col xs={24} md={14}>
                <Form.Item
                  name='fullName'
                  label={ta('name')}
                  rules={[
                    { required: true, whitespace: true, message: t('fields.requiredMessage') },
                    { max: CONSULT_LIMITS.fullName, message: t('fields.maxLength', { max: CONSULT_LIMITS.fullName }) }
                  ]}
                >
                  <Input maxLength={CONSULT_LIMITS.fullName} />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item
                  name='title'
                  label={ta('title')}
                  rules={[
                    { required: true, whitespace: true, message: t('fields.requiredMessage') },
                    { max: CONSULT_LIMITS.title, message: t('fields.maxLength', { max: CONSULT_LIMITS.title }) }
                  ]}
                >
                  <Input maxLength={CONSULT_LIMITS.title} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name='companyName' label={ta('companyName')}>
              <Input maxLength={CONSULT_LIMITS.companyName} />
            </Form.Item>
            <Form.Item
              name='categoryIds'
              label={ta('categories')}
              extra={categories.length ? ta('categoriesHint') : <Text type='warning'>{ta('noCategories')}</Text>}
              rules={[{ required: true, type: 'array', min: 1, message: ta('categoryRequired') }]}
            >
              <Select
                mode='multiple'
                optionFilterProp='label'
                options={categories.map((category) => ({ value: category.id, label: category.name }))}
              />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name='yearsExperience'
                  label={ta('experience')}
                  rules={[{ required: true, type: 'integer', min: 0, message: ta('nonNegative') }]}
                >
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name='projectCount'
                  label={ta('projectCount')}
                  rules={[{ required: true, type: 'integer', min: 0, message: ta('nonNegative') }]}
                >
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name='isVisible'
                  label={ta('status')}
                  rules={[{ required: true, message: ta('statusRequired') }]}
                >
                  <Select
                    placeholder={ta('pickStatus')}
                    options={[
                      { value: true, label: ta('shown') },
                      { value: false, label: ta('hidden') }
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name='rating' label={ta('rating')}>
                  <InputNumber min={0} max={5} step={0.1} precision={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name='reviewCount' label={ta('reviewCount')}>
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name='introduction'
              label={ta('intro')}
              rules={[
                { required: true, whitespace: true, message: t('fields.requiredMessage') },
                {
                  max: CONSULT_LIMITS.introduction,
                  message: t('fields.maxLength', { max: CONSULT_LIMITS.introduction })
                }
              ]}
            >
              <Input.TextArea rows={6} maxLength={CONSULT_LIMITS.introduction} showCount />
            </Form.Item>
          </>
        )}
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
  const { data } = useQuery({
    queryKey: adminKeys.bmt(RESOURCE, 'detail', item.id),
    queryFn: () => consultAdminApi.getArchitect(item.id)
  })
  const dash = '—'
  return (
    <Descriptions
      size='small'
      column={1}
      bordered
      items={[
        { key: 'avatar', label: ta('avatar'), children: <Avatar src={item.avatarUrl} size={64} /> },
        { key: 'name', label: ta('name'), children: item.fullName },
        { key: 'title', label: ta('title'), children: item.title },
        { key: 'company', label: ta('companyName'), children: data?.companyName?.trim() || dash },
        {
          key: 'categories',
          label: ta('categories'),
          children: item.categories.map((category) => <Tag key={category.id}>{category.name}</Tag>)
        },
        { key: 'years', label: ta('experience'), children: ta('years', { years: item.yearsExperience }) },
        { key: 'projects', label: ta('projectCount'), children: item.projectCount },
        { key: 'rating', label: ta('rating'), children: data?.rating ?? dash },
        { key: 'reviewCount', label: ta('reviewCount'), children: data?.reviewCount ?? dash },
        {
          key: 'intro',
          label: ta('intro'),
          children: <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>{item.introduction}</Paragraph>
        },
        { key: 'status', label: ta('status'), children: item.isVisible ? ta('shown') : ta('hidden') },
        { key: 'created', label: ta('createdAt'), children: formatDisplayDate(item.createdOnUtc, locale) }
      ]}
    />
  )
}
