'use client'

import {
  CheckCircleOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { CmsContractor, CmsContractorProject, CmsFloorOption } from '@/shared/cms'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { useContractorSave } from '../../hooks/use-contractor-save'
import { newAdminId } from '../../services/admin.service'
import { CONTRACTOR_SCOPES, projectCounts, projectEvidenceMissing } from '../../services/contractor.service'
import { ImageUrlField, StringListField } from '../common/field-kit'

const { Text, Paragraph } = Typography

/** Các trường chính — đổi một trong số này trên dự án Đã xác minh là phải kiểm tra lại (§7). */
const MAIN_FIELDS = [
  'name',
  'buildingTypeId',
  'scope',
  'dimensions',
  'areaM2',
  'floorOptionId',
  'hasAttic',
  'location',
  'constructionStartedAt',
  'constructionEndedAt',
  'year',
  'mainItems',
  'evidence'
] as const

function mainChanged(a: CmsContractorProject, b: CmsContractorProject): boolean {
  return MAIN_FIELDS.some((key) => JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null))
}

function stamp(value?: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'
}

/** Quy mô trên thẻ và chi tiết dự án: kích thước, diện tích, Số tầng, Tum (§2). */
function scaleText(
  project: CmsContractorProject,
  floorOptions: CmsFloorOption[],
  labels: { attic: string; noAttic: string }
): string {
  return [
    project.dimensions,
    project.areaM2 ? `${project.areaM2} m²` : null,
    floorOptions.find((option) => option.id === project.floorOptionId)?.label ??
      (project.floorOptionId ? null : project.scale),
    project.hasAttic === undefined ? null : project.hasAttic ? labels.attic : labels.noAttic
  ]
    .filter(Boolean)
    .join(' · ')
}

type Sort = 'newest' | 'oldest'

/**
 * TAB DỰ ÁN ĐÃ THỰC HIỆN (ContractorManagement §2, §7).
 *
 * Tổng số và số đã xác minh đếm từ dữ liệu dự án. Không có thao tác xóa — dự
 * án chỉ Ẩn, giữ tệp và lịch sử xác minh. Xác minh bắt buộc có ảnh thực tế và
 * biên bản nghiệm thu; ngày xác minh lấy theo giờ hệ thống.
 */
export function ContractorProjects({ contractor }: { contractor: CmsContractor }) {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const { commit, admin, isPending } = useContractorSave()
  const { data: buildingTypes = [] } = useAdminCollection('buildingTypes')
  const { data: floorOptions = [] } = useAdminCollection('floorOptions')
  const atticLabels = { attic: t('contractorProjects.attic'), noAttic: t('contractorProjects.noAttic') }

  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>()
  const [sort, setSort] = useState<Sort>('newest')
  const [viewing, setViewing] = useState<CmsContractorProject | null>(null)
  const [editing, setEditing] = useState<{ project: CmsContractorProject; isNew: boolean } | null>(null)
  const [unverifying, setUnverifying] = useState<CmsContractorProject | null>(null)
  const [reasonForm] = Form.useForm<{ reason: string }>()

  const projects = contractor.featuredProjects
  const counts = projectCounts(contractor)
  const typeLabel = (id?: string) => buildingTypes.find((type) => type.id === id)?.label ?? '-'

  const rows = projects
    .filter((project) => !verifiedOnly || project.verified)
    .filter((project) => !featuredOnly || project.featured)
    .filter((project) => !typeFilter || project.buildingTypeId === typeFilter)
    .sort((a, b) => (sort === 'newest' ? b.year - a.year : a.year - b.year) || (a.order ?? 0) - (b.order ?? 0))

  const replace = (next: CmsContractorProject, action: string, reason?: string) =>
    commit(
      { ...contractor, featuredProjects: projects.map((item) => (item.id === next.id ? next : item)) },
      { group: 'project', action, after: next.name, reason }
    )

  const verify = async (project: CmsContractorProject) => {
    await replace(
      { ...project, verified: true, verifiedAt: new Date().toISOString(), verifiedBy: admin },
      'projectVerified'
    )
    message.success(t('contractorProjects.verifiedToast'))
  }

  const submitUnverify = async () => {
    const values = await reasonForm.validateFields().catch(() => null)
    if (!values || !unverifying) return
    const reason = values.reason.trim()
    await replace(
      {
        ...unverifying,
        verified: false,
        verifiedAt: undefined,
        unverifications: [{ at: new Date().toISOString(), by: admin, reason }, ...(unverifying.unverifications ?? [])]
      },
      'projectUnverified',
      reason
    )
    setUnverifying(null)
    reasonForm.resetFields()
  }

  const typeCounts = new Map<string, number>()
  for (const project of projects) {
    if (project.buildingTypeId)
      typeCounts.set(project.buildingTypeId, (typeCounts.get(project.buildingTypeId) ?? 0) + 1)
  }

  return (
    <Card
      title={t('contractorProjects.summary', { total: counts.total, verified: counts.verified })}
      extra={
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() =>
            setEditing({
              isNew: true,
              project: {
                id: newAdminId('prj'),
                name: '',
                year: new Date().getFullYear(),
                verified: false,
                featured: false,
                hidden: false,
                order: projects.length + 1,
                galleryUrls: [],
                evidence: { sitePhotoUrls: [] }
              }
            })
          }
        >
          {t('contractorProjects.add')}
        </Button>
      }
    >
      <Space wrap size={12} style={{ marginBottom: 16 }}>
        <Checkbox checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)}>
          {t('contractorProjects.verifiedOnly')}
        </Checkbox>
        <Checkbox checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)}>
          {t('contractorProjects.featuredOnly')}
        </Checkbox>
        <Select
          allowClear
          placeholder={t('contractors.buildingTypes')}
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ minWidth: 200 }}
          options={[...typeCounts].map(([id, count]) => ({ value: id, label: `${typeLabel(id)} (${count})` }))}
        />
        <Segmented<Sort>
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: t('contractorProjects.newest') },
            { value: 'oldest', label: t('contractorProjects.oldest') }
          ]}
        />
      </Space>

      <Table<CmsContractorProject>
        rowKey='id'
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: <Empty description={t('contractorProjects.empty')} /> }}
        scroll={{ x: 1080 }}
        columns={[
          {
            title: t('contractorProjects.name'),
            key: 'name',
            render: (_, project) => (
              <Space size={10}>
                <Image
                  src={project.imageUrl}
                  alt=''
                  width={64}
                  height={44}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                  preview={false}
                  fallback='data:image/gif;base64,R0lGODlhAQABAAAAACw='
                />
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: 'block' }}>
                    {project.name}
                  </Text>
                  <Space size={4} wrap>
                    {project.verified ? <Tag color='green'>{t('contractorProjects.verified')}</Tag> : null}
                    {project.featured ? <Tag color='gold'>{t('contractorProjects.featured')}</Tag> : null}
                    {project.hidden ? <Tag>{t('contractors.hiddenTag')}</Tag> : null}
                  </Space>
                </div>
              </Space>
            )
          },
          {
            title: t('contractors.buildingTypes'),
            key: 'type',
            width: 150,
            render: (_, project) => typeLabel(project.buildingTypeId)
          },
          {
            title: t('contractors.scopes'),
            key: 'scope',
            width: 150,
            render: (_, project) => (project.scope ? t(`contractorScope.${project.scope}`) : '-')
          },
          {
            title: t('contractorProjects.scale'),
            key: 'scale',
            width: 180,
            render: (_, project) => scaleText(project, floorOptions, atticLabels) || '-'
          },
          { title: t('contractorProjects.year'), dataIndex: 'year', width: 90 },
          { title: t('contractorProjects.location'), dataIndex: 'location', width: 160, ellipsis: true },
          {
            title: t('table.actions'),
            key: 'actions',
            width: 210,
            fixed: 'right',
            render: (_, project) => (
              <Space size={0}>
                <Tooltip title={t('actions.view')}>
                  <Button type='text' size='small' icon={<EyeOutlined />} onClick={() => setViewing(project)} />
                </Tooltip>
                <Tooltip title={t('actions.edit')}>
                  <Button
                    type='text'
                    size='small'
                    icon={<EditOutlined />}
                    onClick={() => setEditing({ project, isNew: false })}
                  />
                </Tooltip>
                <Tooltip
                  title={
                    project.hidden
                      ? t('contractorProjects.featureNeedsVisible')
                      : project.featured
                        ? t('contractorProjects.unfeature')
                        : t('contractorProjects.feature')
                  }
                >
                  <Button
                    type='text'
                    size='small'
                    disabled={project.hidden || isPending}
                    icon={project.featured ? <StarFilled style={{ color: '#d97706' }} /> : <StarOutlined />}
                    onClick={() =>
                      replace(
                        { ...project, featured: !project.featured },
                        project.featured ? 'projectUnfeatured' : 'projectFeatured'
                      )
                    }
                  />
                </Tooltip>
                <Popconfirm
                  title={project.hidden ? t('contractorProjects.showConfirm') : t('contractorProjects.hideConfirm')}
                  okText={t('actions.confirm')}
                  cancelText={t('actions.cancel')}
                  onConfirm={() =>
                    replace(
                      // Ẩn dự án là tự bỏ Nổi bật (§7).
                      { ...project, hidden: !project.hidden, featured: project.hidden ? project.featured : false },
                      project.hidden ? 'projectShown' : 'projectHidden'
                    )
                  }
                >
                  <Tooltip title={project.hidden ? t('contractorProjects.show') : t('contractorProjects.hide')}>
                    <Button
                      type='text'
                      size='small'
                      disabled={isPending}
                      icon={project.hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
                {project.verified ? (
                  <Tooltip title={t('contractorProjects.unverify')}>
                    <Button
                      type='text'
                      size='small'
                      danger
                      disabled={isPending}
                      icon={<StopOutlined />}
                      onClick={() => setUnverifying(project)}
                    />
                  </Tooltip>
                ) : projectEvidenceMissing(project) ? (
                  <Tooltip title={t('contractorProjects.evidenceMissing')}>
                    <Button type='text' size='small' disabled icon={<CheckCircleOutlined />} />
                  </Tooltip>
                ) : (
                  <Popconfirm
                    title={t('contractorProjects.verifyConfirm', { name: project.name })}
                    description={<div style={{ maxWidth: 300 }}>{t('contractorProjects.verifyHint')}</div>}
                    okText={t('actions.confirm')}
                    cancelText={t('actions.cancel')}
                    onConfirm={() => verify(project)}
                  >
                    <Tooltip title={t('contractorProjects.verify')}>
                      <Button
                        type='text'
                        size='small'
                        disabled={isPending}
                        icon={<CheckCircleOutlined style={{ color: '#2a753f' }} />}
                      />
                    </Tooltip>
                  </Popconfirm>
                )}
              </Space>
            )
          }
        ]}
      />

      <ProjectView project={viewing} typeLabel={typeLabel} onClose={() => setViewing(null)} />

      {editing ? (
        <ProjectForm
          key={editing.project.id}
          project={editing.project}
          isNew={editing.isNew}
          saving={isPending}
          onClose={() => setEditing(null)}
          onSave={async (next) => {
            const previous = editing.project
            // Đổi thông tin chính của dự án đã xác minh → về Chưa xác minh để kiểm tra lại.
            const reset = !editing.isNew && previous.verified && mainChanged(previous, next)
            const saved: CmsContractorProject = {
              ...next,
              featured: next.hidden ? false : next.featured,
              verified: reset ? false : next.verified,
              verifiedAt: reset ? undefined : next.verifiedAt
            }
            const list = editing.isNew
              ? [...projects, saved]
              : projects.map((item) => (item.id === saved.id ? saved : item))
            await commit(
              { ...contractor, featuredProjects: list },
              {
                group: 'project',
                action: editing.isNew ? 'projectAdded' : 'projectUpdated',
                after: saved.name
              }
            )
            if (reset) message.warning(t('contractorProjects.resetToUnverified'))
            setEditing(null)
          }}
        />
      ) : null}

      <Modal
        open={Boolean(unverifying)}
        title={t('contractorProjects.unverifyTitle', { name: unverifying?.name ?? '' })}
        okText={t('contractorProjects.unverify')}
        okButtonProps={{ danger: true, loading: isPending }}
        cancelText={t('actions.cancel')}
        onOk={submitUnverify}
        onCancel={() => setUnverifying(null)}
        destroyOnHidden
      >
        <Form form={reasonForm} layout='vertical' preserve={false}>
          <Form.Item
            name='reason'
            label={t('contractors.reason')}
            rules={[{ required: true, whitespace: true, message: t('contractors.reasonRequired') }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

function ProjectView({
  project,
  typeLabel,
  onClose
}: {
  project: CmsContractorProject | null
  typeLabel: (id?: string) => string
  onClose: () => void
}) {
  const t = useTranslations('admin')
  const { data: floorOptions = [] } = useAdminCollection('floorOptions')
  if (!project) return <Drawer open={false} onClose={onClose} />

  const scale = scaleText(project, floorOptions, {
    attic: t('contractorProjects.attic'),
    noAttic: t('contractorProjects.noAttic')
  })

  return (
    <Drawer open title={project.name} size={640} onClose={onClose}>
      <Space orientation='vertical' size={16} style={{ width: '100%' }}>
        {project.galleryUrls?.length || project.imageUrl ? (
          <Image.PreviewGroup>
            <Space wrap>
              {[project.imageUrl, ...(project.galleryUrls ?? [])].filter(Boolean).map((url) => (
                <Image
                  key={url}
                  src={url}
                  alt=''
                  width={120}
                  height={84}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        ) : null}
        <Descriptions
          size='small'
          column={1}
          bordered
          items={[
            { key: 'type', label: t('contractors.buildingTypes'), children: typeLabel(project.buildingTypeId) },
            { key: 'scale', label: t('contractorProjects.scale'), children: scale || '-' },
            {
              key: 'scope',
              label: t('contractors.scopes'),
              children: project.scope ? t(`contractorScope.${project.scope}`) : '-'
            },
            {
              key: 'role',
              label: t('contractorProjects.role'),
              children: project.contractorRole ? t(`contractorProjects.roles.${project.contractorRole}`) : '-'
            },
            {
              key: 'time',
              label: t('contractorProjects.time'),
              children:
                project.constructionStartedAt && project.constructionEndedAt
                  ? `${project.constructionStartedAt} → ${project.constructionEndedAt}`
                  : project.year
            },
            { key: 'location', label: t('contractorProjects.location'), children: project.location || '-' },
            { key: 'items', label: t('contractorProjects.mainItems'), children: project.mainItems || '-' },
            {
              key: 'links',
              label: t('contractorProjects.links'),
              children: (
                <Space orientation='vertical' size={2}>
                  {project.photoFolderUrl ? (
                    <a href={project.photoFolderUrl} target='_blank' rel='noreferrer'>
                      {t('contractorProjects.photoFolder')}
                    </a>
                  ) : null}
                  {project.articleUrl ? (
                    <a href={project.articleUrl} target='_blank' rel='noreferrer'>
                      {t('contractorProjects.article')}
                    </a>
                  ) : null}
                  {!project.photoFolderUrl && !project.articleUrl ? '-' : null}
                </Space>
              )
            },
            {
              key: 'verify',
              label: t('contractorProjects.verification'),
              children: project.verified ? (
                <Space orientation='vertical' size={2}>
                  <Tag color='green'>{t('contractorProjects.verified')}</Tag>
                  <Text type='secondary'>
                    {t('contractorProjects.verifiedAtBy', {
                      at: stamp(project.verifiedAt),
                      by: project.verifiedBy ?? '-'
                    })}
                  </Text>
                  <Text type='secondary'>{t('contractorProjects.verifyExplain')}</Text>
                </Space>
              ) : (
                <Tag>{t('contractorProjects.unverified')}</Tag>
              )
            }
          ]}
        />
        <Card size='small' title={t('contractorProjects.evidence')}>
          {project.evidence?.sitePhotoUrls.length ? (
            <Image.PreviewGroup>
              <Space wrap>
                {project.evidence.sitePhotoUrls.map((url) => (
                  <Image
                    key={url}
                    src={url}
                    alt=''
                    width={96}
                    height={72}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          ) : (
            <Text type='secondary'>{t('contractorProjects.noSitePhotos')}</Text>
          )}
          <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
            {project.evidence?.acceptanceDocUrl ? (
              <a href={project.evidence.acceptanceDocUrl} target='_blank' rel='noreferrer'>
                {t('contractorProjects.acceptanceDoc')}
              </a>
            ) : (
              <Text type='secondary'>{t('contractorProjects.noAcceptanceDoc')}</Text>
            )}
          </Paragraph>
        </Card>
        {project.unverifications?.length ? (
          <Card size='small' title={t('contractorProjects.unverifyHistory')}>
            {project.unverifications.map((entry) => (
              <Paragraph key={entry.at} style={{ marginBottom: 6 }}>
                <Text type='secondary'>
                  {stamp(entry.at)} · {entry.by}:
                </Text>{' '}
                {entry.reason}
              </Paragraph>
            ))}
          </Card>
        ) : null}
        <Alert type='info' showIcon title={t('contractorProjects.noPriceNote')} />
      </Space>
    </Drawer>
  )
}

type ProjectFormValues = Omit<CmsContractorProject, 'constructionStartedAt' | 'constructionEndedAt'> & {
  period?: [Dayjs | null, Dayjs | null] | null
}

function ProjectForm({
  project,
  isNew,
  saving,
  onClose,
  onSave
}: {
  project: CmsContractorProject
  isNew: boolean
  saving: boolean
  onClose: () => void
  onSave: (next: CmsContractorProject) => Promise<void>
}) {
  const t = useTranslations('admin')
  const [form] = Form.useForm<ProjectFormValues>()
  const { data: buildingTypes = [] } = useAdminCollection('buildingTypes')
  const { data: floorOptions = [] } = useAdminCollection('floorOptions')
  const typeId = Form.useWatch('buildingTypeId', form) as string | undefined
  const hidden = Form.useWatch('hidden', form) as boolean | undefined
  const type = buildingTypes.find((item) => item.id === typeId)
  const required = { required: true, whitespace: true, message: t('fields.requiredMessage') }
  const url = { type: 'url' as const, message: t('contractorProjects.urlRule') }

  // Chỉ chọn mới loại Hoạt động; loại đã lưu mà nay Ngừng vẫn hiện để giữ nguyên (§7).
  const typeOptions = buildingTypes
    .filter((item) => item.status === 'active' || item.id === project.buildingTypeId)
    .map((item) => ({
      value: item.id,
      label: item.status === 'active' ? item.label : `${item.label} (${t('catalogStatus.inactive')})`,
      disabled: item.status !== 'active'
    }))
  const allowedFloors = type?.floors.applies
    ? floorOptions.filter(
        (option) =>
          type.floors.optionIds.includes(option.id) &&
          (option.status === 'active' || option.id === project.floorOptionId)
      )
    : []
  const atticChoice = type?.attic.mode === 'choice'

  const submit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const { period, ...rest } = values
    const merged = form.getFieldsValue(true) as ProjectFormValues
    const next: CmsContractorProject = {
      ...project,
      ...merged,
      ...rest,
      name: rest.name.trim(),
      constructionStartedAt: period?.[0]?.format('YYYY-MM-DD'),
      constructionEndedAt: period?.[1]?.format('YYYY-MM-DD'),
      // Trường Không áp dụng thì không lưu giá trị (§7).
      floorOptionId: type?.floors.applies ? rest.floorOptionId : undefined,
      hasAttic:
        type?.attic.mode === 'choice'
          ? rest.hasAttic
          : type?.attic.mode === 'fixed-yes'
            ? true
            : type?.attic.mode === 'fixed-no'
              ? false
              : undefined,
      galleryUrls: (merged.galleryUrls ?? []).filter(Boolean),
      evidence: {
        sitePhotoUrls: (merged.evidence?.sitePhotoUrls ?? []).filter(Boolean),
        acceptanceDocUrl: merged.evidence?.acceptanceDocUrl?.trim() || undefined
      }
    }
    delete (next as ProjectFormValues).period
    await onSave(next)
  }

  return (
    <Drawer
      open
      title={isNew ? t('contractorProjects.add') : t('contractorProjects.editTitle', { name: project.name })}
      size={720}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>{t('actions.cancel')}</Button>
          <Button type='primary' loading={saving} onClick={submit}>
            {t('actions.save')}
          </Button>
        </Space>
      }
    >
      {project.verified ? (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: 16 }}
          title={t('contractorProjects.editVerifiedWarning')}
        />
      ) : null}
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          ...project,
          period:
            project.constructionStartedAt || project.constructionEndedAt
              ? [
                  project.constructionStartedAt ? dayjs(project.constructionStartedAt) : null,
                  project.constructionEndedAt ? dayjs(project.constructionEndedAt) : null
                ]
              : null
        }}
      >
        <Form.Item name='name' label={t('contractorProjects.name')} rules={[required]}>
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name='buildingTypeId' label={t('contractors.buildingTypes')} rules={[required]}>
              <Select
                options={typeOptions}
                onChange={() => form.setFieldsValue({ floorOptionId: undefined, hasAttic: undefined })}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='contractorRole' label={t('contractorProjects.role')}>
              <Select
                allowClear
                options={(['general-contractor', 'contractor'] as const).map((value) => ({
                  value,
                  label: t(`contractorProjects.roles.${value}`)
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name='scope'
          label={t('contractors.scopes')}
          rules={[{ required: true, message: t('contractorProjects.scopeRequired') }]}
        >
          <Radio.Group
            optionType='button'
            buttonStyle='solid'
            options={CONTRACTOR_SCOPES.map((value) => ({ value, label: t(`contractorScope.${value}`) }))}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={12} md={8}>
            <Form.Item name='dimensions' label={t('contractorProjects.dimensions')}>
              <Input placeholder='5 × 20 m' />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name='areaM2' label={t('contractorProjects.area')}>
              <InputNumber min={0} suffix='m²' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          {type?.floors.applies ? (
            <Col xs={12} md={8}>
              <Form.Item
                name='floorOptionId'
                label={t('contractorProjects.floors')}
                rules={type.floors.required ? [{ required: true, message: t('fields.requiredMessage') }] : []}
              >
                <Select
                  allowClear={!type.floors.required}
                  options={allowedFloors.map((option) => ({
                    value: option.id,
                    label: option.label,
                    disabled: option.status !== 'active'
                  }))}
                />
              </Form.Item>
            </Col>
          ) : null}
          {atticChoice ? (
            <Col xs={12} md={8}>
              <Form.Item
                name='hasAttic'
                label={t('contractorProjects.atticLabel')}
                rules={type?.attic.required ? [{ required: true, message: t('fields.requiredMessage') }] : []}
              >
                <Radio.Group
                  options={[
                    { value: true, label: t('contractorProjects.attic') },
                    { value: false, label: t('contractorProjects.noAttic') }
                  ]}
                />
              </Form.Item>
            </Col>
          ) : null}
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item
              name='period'
              label={t('contractorProjects.period')}
              rules={[
                {
                  validator: (_, value?: [Dayjs | null, Dayjs | null] | null) =>
                    value?.[0] && value[1] && value[1].isBefore(value[0])
                      ? Promise.reject(new Error(t('contractorProjects.periodRule')))
                      : Promise.resolve()
                }
              ]}
            >
              <DatePicker.RangePicker allowEmpty={[true, true]} format='DD/MM/YYYY' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name='year'
              label={t('contractorProjects.year')}
              rules={[
                {
                  required: true,
                  type: 'integer',
                  min: 1900,
                  max: new Date().getFullYear(),
                  message: t('contractors.foundedRule')
                }
              ]}
            >
              <InputNumber precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='location' label={t('contractorProjects.location')}>
          <Input />
        </Form.Item>
        <Form.Item name='mainItems' label={t('contractorProjects.mainItems')}>
          <Input.TextArea rows={2} />
        </Form.Item>

        <ImageUrlField name='imageUrl' label={t('contractorProjects.cover')} />
        <StringListField name='galleryUrls' label={t('contractorProjects.gallery')} placeholder='https://…' />
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name='photoFolderUrl' label={t('contractorProjects.photoFolder')} rules={[url]}>
              <Input placeholder='https://…' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='articleUrl' label={t('contractorProjects.article')} rules={[url]}>
              <Input placeholder='https://…' />
            </Form.Item>
          </Col>
        </Row>

        <Card size='small' type='inner' title={t('contractorProjects.evidence')} style={{ marginBottom: 16 }}>
          <StringListField
            name={['evidence', 'sitePhotoUrls']}
            label={t('contractorProjects.sitePhotos')}
            placeholder='https://…'
          />
          <Form.Item
            name={['evidence', 'acceptanceDocUrl']}
            label={t('contractorProjects.acceptanceDoc')}
            rules={[url]}
          >
            <Input placeholder='https://…' />
          </Form.Item>
        </Card>

        <Row gutter={16}>
          <Col xs={8}>
            <Form.Item name='hidden' label={t('contractors.visibility')}>
              <Select
                options={[
                  { value: false, label: t('contractors.visible') },
                  { value: true, label: t('contractors.hiddenTag') }
                ]}
                onChange={(value: boolean) => (value ? form.setFieldValue('featured', false) : null)}
              />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name='featured' valuePropName='checked' label={t('contractorProjects.featured')}>
              <Switch disabled={Boolean(hidden)} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name='order' label={t('contractorProjects.order')}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  )
}
