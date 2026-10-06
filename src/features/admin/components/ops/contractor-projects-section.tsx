'use client'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Col,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Typography
} from 'antd'
import type { FormInstance } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useEstimateCatalog } from '../../hooks/use-estimate-catalog'
import { useFloorLabel } from '../catalog/use-floor-label'
import { constructionScopesApi } from '../../api/bmt/construction-scopes.api'
import {
  contractorsAdminApi,
  type ContractorProjectDetail,
  type ContractorProjectInput
} from '../../api/bmt/contractors.admin.api'
import { useContractorErrorMessage } from './contractor-errors'
import { ImageStrip } from './contractor-files'
import {
  MAX_IMAGES_PER_SET,
  addProjectImage,
  moveProjectImage,
  projectImagesFromDetail,
  projectImagesToRequest,
  removeProjectImage,
  type ProjectImageDraft
} from './contractor-form.logic'

const { Text } = Typography

const num = (v: unknown): number | null => (v === '' || v == null ? null : Number(v))
const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

/** Dự án nhập lúc THÊM hồ sơ: chưa có contractorId nên giữ trong form, gửi sau khi hồ sơ được tạo. */
export interface PendingProject {
  key: string
  values: Record<string, unknown>
  images: ProjectImageDraft[]
}

/** Điều khiển ẩn chỉ để Form giữ giá trị mảng. */
const HiddenValue = () => null

let pendingCounter = 0

export function buildProjectBody(
  values: Record<string, unknown>,
  images: readonly ProjectImageDraft[],
  expectedVersion: number
): ContractorProjectInput {
  return {
    expectedVersion,
    name: String(values.name).trim(),
    buildingTypeId: String(values.buildingTypeId),
    scopeId: String(values.scopeId),
    images: projectImagesToRequest(images),
    widthM: num(values.widthM),
    lengthM: num(values.lengthM),
    areaM2: num(values.areaM2),
    floorCount: num(values.floorCount),
    hasAttic: typeof values.hasAttic === 'boolean' ? values.hasAttic : null,
    locationText: str(values.locationText),
    completedYear: num(values.completedYear),
    roleText: str(values.roleText),
    mainWork: str(values.mainWork)
  }
}

/**
 * DỰ ÁN TIÊU BIỂU của nhà thầu (STORY-CTR-002, BR-CTR-003) — CRUD gọn ngay trong
 * ngăn kéo sửa hồ sơ. Mỗi dự án cần đúng một loại công trình + một phạm vi + ≥1
 * ảnh. Ảnh được chọn và tải lên qua MEDIA presign (`ContractorImage`, JPG/PNG/WebP ≤ 10 MiB) rồi
 * gửi URL cố định kèm dự án (`images: [{url, position}]`). Ảnh CŨ của dự án (chỉ có `assetId`)
 * vẫn đọc và gửi lại được; không bao giờ gửi cả hai cho một ảnh.
 *
 * Tải ảnh KHÔNG đụng version nhà thầu, nhưng tạo/sửa/xoá dự án thì có: sau mỗi lần ghi cập nhật
 * lại `expectedVersion` của form hồ sơ cha để lưu hồ sơ sau đó không bị 409.
 */
export function ContractorProjectsSection({ form, contractorId }: { form: FormInstance; contractorId?: string }) {
  const t = useTranslations('admin')
  const c = useTranslations('admin.contractorsAdmin.projects')
  const { modal, message } = App.useApp()
  const describeError = useContractorErrorMessage()
  const [editing, setEditing] = useState<ContractorProjectDetail | PendingProject | 'new' | null>(null)
  const [projectForm] = Form.useForm()
  const [images, setImages] = useState<ProjectImageDraft[]>([])
  const [saving, setSaving] = useState(false)

  const projects = useQuery({
    queryKey: ['admin', 'contractor-projects', contractorId],
    queryFn: () => contractorsAdminApi.listProjects(contractorId as string),
    enabled: Boolean(contractorId)
  })

  // Chưa có hồ sơ (đang THÊM): dự án giữ trong form, tạo cùng lúc khi bấm Lưu.
  const pending = (Form.useWatch('pendingProjects', form) as PendingProject[] | undefined) ?? []
  const setPending = (next: PendingProject[]) => form.setFieldValue('pendingProjects', next)

  const catalog = useEstimateCatalog()
  const scopes = useQuery({
    queryKey: ['admin', 'contractor-project-scope-options'],
    queryFn: constructionScopesApi.list
  })
  const floorLabel = useFloorLabel()
  const buildingTypeId = Form.useWatch('buildingTypeId', projectForm) as string | undefined
  const scopeId = Form.useWatch('scopeId', projectForm) as string | undefined
  const floorCount = Form.useWatch('floorCount', projectForm) as number | null | undefined
  const selectedType = catalog.data?.buildingTypes.find((type) => type.buildingTypeId === buildingTypeId)
  const floorsApply = Boolean(selectedType?.floorsEnabled && selectedType.floorCounts.length)
  const tumApplies = Boolean(selectedType?.tumEnabled)
  const typeOptions = (catalog.data?.buildingTypes ?? []).map((type) => ({
    label: type.name,
    value: type.buildingTypeId
  }))
  const scopeOptions = (scopes.data ?? [])
    .filter((scope) => scope.isActive || scope.id === scopeId)
    .map((scope) => ({ label: scope.name, value: scope.id, disabled: !scope.isActive }))
  const floorOptions = (floorsApply ? (selectedType?.floorCounts ?? []) : [])
    .slice()
    .sort((a, b) => a - b)
    .map((value) => ({ label: floorLabel(value), value, disabled: false }))
  // Keep historical values visible when editing; changing the type reconciles them with its configuration.
  if (floorCount != null && !floorOptions.some((option) => option.value === floorCount))
    floorOptions.push({ label: c('savedFloor', { count: floorCount }), value: floorCount, disabled: true })
  const optionsFailed = catalog.isError || scopes.isError
  const optionsPending = catalog.isPending || scopes.isPending
  const typeName = (id: string) => catalog.data?.buildingTypes.find((type) => type.buildingTypeId === id)?.name ?? id
  const scopeName = (id: string) => scopes.data?.find((scope) => scope.id === id)?.name ?? id
  const retryOptions = () => {
    void catalog.refetch()
    void scopes.refetch()
  }
  const changeBuildingType = (id: string) => {
    const type = catalog.data?.buildingTypes.find((item) => item.buildingTypeId === id)
    const currentFloor = num(projectForm.getFieldValue('floorCount'))
    const currentTum: unknown = projectForm.getFieldValue('hasAttic')
    projectForm.setFieldsValue({
      floorCount:
        type?.floorsEnabled && currentFloor != null && type.floorCounts.includes(currentFloor) ? currentFloor : null,
      hasAttic: type?.tumEnabled && typeof currentTum === 'boolean' ? currentTum : null
    })
  }

  /** Đồng bộ version mới của contractor vào form hồ sơ cha + tải lại danh sách. */
  const syncVersion = async (contractorVersion: number) => {
    form.setFieldValue('expectedVersion', contractorVersion)
    await projects.refetch()
  }

  function openNew() {
    setEditing('new')
    setImages([])
    projectForm.resetFields()
  }

  function openEditPending(p: PendingProject) {
    setEditing(p)
    setImages(p.images)
    projectForm.resetFields()
    projectForm.setFieldsValue(p.values)
  }

  function openEdit(p: ContractorProjectDetail) {
    setEditing(p)
    setImages(projectImagesFromDetail(p.images, contractorId as string))
    projectForm.resetFields()
    projectForm.setFieldsValue({
      name: p.name,
      buildingTypeId: p.buildingTypeId,
      scopeId: p.scopeId,
      widthM: p.widthM ?? null,
      lengthM: p.lengthM ?? null,
      areaM2: p.areaM2 ?? null,
      floorCount: p.floorCount ?? null,
      hasAttic: p.hasAttic ?? null,
      locationText: p.locationText ?? '',
      completedYear: p.completedYear ?? null,
      roleText: p.roleText ?? '',
      mainWork: p.mainWork ?? ''
    })
  }

  async function submitProject() {
    const values = await projectForm.validateFields().catch(() => null)
    if (!values) return
    if (images.length === 0) {
      message.error(c('needImage'))
      return
    }
    if (!contractorId) {
      // Giữ lại trong form; gửi lên BE khi bấm Lưu hồ sơ.
      const entry: PendingProject = {
        key:
          editing !== null && editing !== 'new'
            ? (editing as PendingProject).key
            : `pending-project-${(pendingCounter += 1)}`,
        values,
        images
      }
      setPending(
        editing === 'new' || editing === null
          ? [...pending, entry]
          : pending.map((item) => (item.key === entry.key ? entry : item))
      )
      setEditing(null)
      return
    }
    setSaving(true)
    try {
      const body = buildProjectBody(values, images, Number(form.getFieldValue('expectedVersion')))
      const saved =
        editing === 'new'
          ? await contractorsAdminApi.createProject(contractorId, body)
          : await contractorsAdminApi.updateProject(contractorId, (editing as ContractorProjectDetail).id, body)
      await syncVersion(saved.contractorVersion)
      message.success(t('feedback.saved'))
      setEditing(null)
    } catch (err) {
      message.error(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(p: ContractorProjectDetail) {
    modal.confirm({
      title: c('deleteConfirmTitle', { name: p.name }),
      okText: t('actions.delete'),
      okButtonProps: { danger: true },
      cancelText: t('actions.cancel'),
      onOk: async () => {
        try {
          await contractorsAdminApi.deleteProject(
            contractorId as string,
            p.id,
            Number(form.getFieldValue('expectedVersion'))
          )
          message.success(t('feedback.deleted'))
          // deleteProject trả 204, version đã tăng ở BE → tải lại để lấy version mới.
          await projects.refetch()
        } catch (err) {
          message.error(describeError(err))
        }
      }
    })
  }

  interface ProjectRow {
    key: string
    name: string
    buildingTypeId: string
    scopeId: string
    floorCount?: number | null
    hasAttic?: boolean | null
    completedYear?: number | null
    thumb?: string
    onEdit: () => void
    onDelete: () => void
  }

  const rowsToShow: ProjectRow[] = contractorId
    ? (projects.data?.items ?? []).map((p) => ({
        key: p.id,
        name: p.name,
        buildingTypeId: p.buildingTypeId,
        scopeId: p.scopeId,
        floorCount: p.floorCount,
        hasAttic: p.hasAttic,
        completedYear: p.completedYear,
        thumb: projectImagesFromDetail(p.images, contractorId)[0]?.previewUrl,
        onEdit: () => openEdit(p),
        onDelete: () => confirmDelete(p)
      }))
    : pending.map((p) => ({
        key: p.key,
        name: String(p.values.name ?? ''),
        buildingTypeId: String(p.values.buildingTypeId ?? ''),
        scopeId: String(p.values.scopeId ?? ''),
        floorCount: num(p.values.floorCount),
        hasAttic: typeof p.values.hasAttic === 'boolean' ? p.values.hasAttic : null,
        completedYear: num(p.values.completedYear),
        thumb: p.images[0]?.previewUrl,
        onEdit: () => openEditPending(p),
        onDelete: () => setPending(pending.filter((item) => item.key !== p.key))
      }))

  return (
    <>
      <Divider titlePlacement='start'>{c('title')}</Divider>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text type='secondary' style={{ fontSize: 12 }}>
          {c('hint')}
        </Text>
        <Button size='small' icon={<PlusOutlined />} onClick={openNew}>
          {c('add')}
        </Button>
      </div>

      <Form.Item name='pendingProjects' hidden>
        <HiddenValue />
      </Form.Item>

      {rowsToShow.length ? (
        <Space orientation='vertical' size={8} style={{ width: '100%' }}>
          {rowsToShow.map((row) => (
            <div
              key={row.key}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: 8,
                border: '1px solid var(--admin-border)',
                borderRadius: 8
              }}
            >
              {row.thumb ? (
                <Image
                  src={row.thumb}
                  alt=''
                  width={56}
                  height={40}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                  preview={false}
                />
              ) : (
                <div style={{ width: 56, height: 40, borderRadius: 6, background: 'var(--admin-placeholder)' }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong>{row.name}</Text>
                <div>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {[
                      typeName(row.buildingTypeId),
                      row.floorCount == null
                        ? null
                        : row.floorCount > 0
                          ? floorLabel(row.floorCount)
                          : c('savedFloor', { count: row.floorCount }),
                      row.hasAttic == null ? null : c(row.hasAttic ? 'hasTum' : 'noTum'),
                      scopeName(row.scopeId),
                      row.completedYear
                    ]
                      .filter((value) => value != null && value !== '')
                      .join(' · ')}
                  </Text>
                </div>
              </div>
              <Button size='small' type='text' onClick={row.onEdit}>
                {t('actions.edit')}
              </Button>
              <Button
                size='small'
                type='text'
                danger
                icon={<DeleteOutlined />}
                aria-label={t('actions.delete')}
                onClick={row.onDelete}
              />
            </div>
          ))}
        </Space>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={c('empty')} />
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? c('add') : c('editTitle')}
        onCancel={() => setEditing(null)}
        onOk={submitProject}
        okButtonProps={{ loading: saving, disabled: optionsFailed || optionsPending }}
        okText={t('actions.save')}
        cancelText={t('actions.cancel')}
        destroyOnHidden
        width={640}
      >
        {optionsFailed ? (
          <Alert
            type='error'
            showIcon
            title={c('categoryError')}
            action={<Button onClick={retryOptions}>{c('retry')}</Button>}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form name='contractor-project' form={projectForm} layout='vertical'>
          <Form.Item name='widthM' hidden>
            <HiddenValue />
          </Form.Item>
          <Form.Item name='lengthM' hidden>
            <HiddenValue />
          </Form.Item>
          <Form.Item
            name='name'
            label={c('name')}
            rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name='buildingTypeId'
            label={c('buildingType')}
            rules={[{ required: true, message: t('fields.requiredMessage') }]}
          >
            <Select
              options={typeOptions}
              loading={catalog.isPending}
              disabled={catalog.isError || saving}
              optionFilterProp='label'
              showSearch
              onChange={changeBuildingType}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name='floorCount' label={c('floorCount')} extra={c('classificationHint')}>
                <Select
                  options={floorOptions}
                  allowClear
                  disabled={!floorsApply || saving}
                  placeholder={
                    floorsApply ? c('selectOptional') : selectedType ? c('notApplicable') : c('selectTypeFirst')
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='hasAttic'
                label={c('tum')}
                getValueProps={(value: boolean | null | undefined) => ({
                  value: typeof value === 'boolean' ? (value ? 'yes' : 'no') : undefined
                })}
                normalize={(value: string | undefined) => (value == null ? null : value === 'yes')}
              >
                <Select
                  options={[
                    { label: c('hasTum'), value: 'yes' },
                    { label: c('noTum'), value: 'no' }
                  ]}
                  allowClear
                  disabled={!tumApplies || saving}
                  placeholder={
                    tumApplies ? c('selectOptional') : selectedType ? c('notApplicable') : c('selectTypeFirst')
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name='scopeId'
            label={c('scope')}
            rules={[{ required: true, message: t('fields.requiredMessage') }]}
          >
            <Select
              options={scopeOptions}
              loading={scopes.isPending}
              disabled={scopes.isError || saving}
              optionFilterProp='label'
              showSearch
            />
          </Form.Item>
          <Form.Item label={c('images')} required extra={c('imagesHint')}>
            <ImageStrip
              items={images.map((image) => ({ key: image.key, src: image.previewUrl ?? '' }))}
              max={MAX_IMAGES_PER_SET}
              onUploaded={(url) => setImages((current) => addProjectImage(current, url))}
              onRemove={(key) => setImages((current) => removeProjectImage(current, key))}
              onMove={(key, delta) => setImages((current) => moveProjectImage(current, key, delta))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name='areaM2' label={c('areaM2')}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='completedYear' label={c('completedYear')}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name='locationText' label={c('locationText')}>
            <Input />
          </Form.Item>
          <Form.Item name='roleText' label={c('roleText')}>
            <Input />
          </Form.Item>
          <Form.Item name='mainWork' label={c('mainWork')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
