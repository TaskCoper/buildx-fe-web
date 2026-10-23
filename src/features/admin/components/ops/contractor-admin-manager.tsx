'use client'

import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { App, Col, Divider, Form, Input, InputNumber, Row, Segmented, Select, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { getContractorFilterOptions, type ContractorFilterOptions } from '@/shared/contractors'
import {
  contractorsAdminApi,
  type AdminContractorDetail,
  type AdminContractorItem,
  type ContractorProfileInput,
  type ContractorProfileUpdate
} from '../../api/bmt/contractors.admin.api'
import { constructionScopesApi } from '../../api/bmt/construction-scopes.api'
import { ContractorAddressField, contractorAddressKey } from './contractor-address-field'
import { ApiResourceManager } from '../common/api-resource-manager'
import { useContractorErrorMessage } from './contractor-errors'
import { ContractorImagesField, ContractorLicensesField, ContractorPartnershipField } from './contractor-files'
import {
  emptyPartnership,
  imagesFromDetail,
  imagesToRequest,
  licenseProblems,
  licensesFromDetail,
  licensesToRequest,
  partnershipDateOrderInvalid,
  partnershipFromDetail,
  partnershipToRequest,
  type LicenseDraft,
  type PartnershipDraft,
  type ProfileImageDraft
} from './contractor-form.logic'
import { ContractorProjectsSection, buildProjectBody, type PendingProject } from './contractor-projects-section'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'

const { Text } = Typography

const num = (v: unknown): number | null => (v === '' || v == null ? null : Number(v))
const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

type FilterOptions = ContractorFilterOptions

/**
 * Form chỉ có MỘT ô "Số KTS & kỹ sư" (góp ý case 19) còn BE vẫn lưu hai số riêng. Ô hiện tổng của hai số;
 * khách cũng chỉ thấy tổng (xem `normalizeContractor`).
 */
function teamCountOf(profile?: ContractorProfileInput): number | null {
  const architects = profile?.architectCount
  const engineers = profile?.engineerCount
  return architects == null && engineers == null ? null : (architects ?? 0) + (engineers ?? 0)
}

/**
 * Hai số gửi lên BE. Người dùng không đổi tổng thì giữ nguyên hai số đã lưu để không làm lệch dữ liệu;
 * đổi tổng thì ghi vào số KTS và để trống số kỹ sư (tổng vẫn đúng).
 */
function teamCountFields(values: Record<string, unknown>, profile?: ContractorProfileInput) {
  const next = num(values.teamCount)
  if (profile && next === teamCountOf(profile)) {
    return { architectCount: profile.architectCount ?? null, engineerCount: profile.engineerCount ?? null }
  }
  return { architectCount: next, engineerCount: null }
}

/**
 * QUẢN LÝ NHÀ THẦU (STORY-CTR-001, BR-CTR-002/004) — CRUD gọn: danh sách → form
 * tạo/sửa hồ sơ (gộp một chỗ) → ẩn/hiện → xoá. BE tách API granular nhưng màn
 * này gộp lại theo ý người dùng.
 *
 * Hồ sơ mới lưu ẨN; muốn HIỆN BE đòi đủ name + address + toạ độ + ≥1 loại công trình
 * + ≥1 phạm vi (`ContractorRules.Visible`, lỗi 422 `ContractorProfileIncomplete`). Form bắt buộc
 * đúng các trường đó ngay lúc lưu để hồ sơ nào đã lưu cũng Hiện được.
 *
 * Ảnh hồ sơ, giấy phép (kèm bản quét) và hợp tác BuildX nằm CHUNG form này. Tệp được chọn và
 * tải lên qua MEDIA presign ngay trong form (kể cả lúc TẠO, vì tải lên không cần hồ sơ tồn tại
 * và không đụng version); hồ sơ chỉ lưu URL. PUT thay TOÀN BỘ từng section nên form giữ đủ
 * dữ liệu của chúng — kể cả tệp CŨ chỉ có `assetId` — để sửa hồ sơ không làm mất gì.
 */
/**
 * Thân PUT hồ sơ — dùng chung cho cả lúc TẠO và lúc SỬA.
 *
 * `prev` là bản chi tiết đã tải (chỉ có khi sửa): PUT thay TOÀN BỘ từng section
 * nên phải gửi lại giấy phép / hợp tác / ảnh mà form này chưa quản lý, không thì
 * chúng bị xoá.
 */
function buildProfileBody(
  values: Record<string, unknown>,
  expectedVersion: number,
  prev?: AdminContractorDetail
): ContractorProfileUpdate {
  return {
    expectedVersion,
    profile: {
      name: String(values.name ?? '').trim(),
      shortDescription: str(values.shortDescription),
      introduction: str(values.introduction),
      // Form không còn ô Loại nhà thầu, Khu vực phục vụ và Đang nhận việc (góp ý case 19, 21): PUT thay toàn bộ
      // hồ sơ nên giữ giá trị đã lưu thay vì xoá; hồ sơ mới mặc định đang nhận dự án.
      contractorType: prev?.profile.contractorType ?? null,
      address: str(values.address),
      ...(values._structuredAddress
        ? {
            provinceCode: str(values.provinceCode),
            wardCode: str(values.wardCode),
            addressDetail: str(values.addressDetail),
            locationDatasetVersion:
              str(values.provinceCode) || str(values.wardCode) || str(values.addressDetail)
                ? str(values.locationDatasetVersion)
                : null
          }
        : { provinceCode: str(values.provinceCode) }),
      latitude: num(values.latitude),
      longitude: num(values.longitude),
      foundedYear: num(values.foundedYear),
      ...teamCountFields(values, prev?.profile),
      serviceAreaText: prev?.profile.serviceAreaText ?? null,
      surveyHours: num(values.surveyHours),
      warrantyMonths: num(values.warrantyMonths),
      acceptingProjects: prev?.profile.acceptingProjects ?? true,
      rating: num(values.rating),
      ratingCount: num(values.ratingCount),
      contactPerson: str(values.contactPerson),
      contactPhone: str(values.contactPhone),
      contactEmail: str(values.contactEmail)
    },
    buildingTypeIds: (values.buildingTypeIds as string[] | undefined) ?? [],
    scopeIds: (values.scopeIds as string[] | undefined) ?? [],
    legal: {
      ...(prev?.legal ?? {}),
      legalName: str(values.legalName),
      taxCode: str(values.taxCode),
      representative: str(values.representative),
      registeredAddress: str(values.registeredAddress),
      industry: str(values.industry)
    },
    // Form giữ đủ dữ liệu của ba phần này nên không cần mượn từ bản chi tiết đã tải.
    licenses: licensesToRequest((values.licenses as LicenseDraft[] | undefined) ?? []),
    // `null` = xoá section hợp tác (form để trống hoàn toàn).
    partnership: partnershipToRequest(values.partnership as PartnershipDraft | undefined),
    images: imagesToRequest((values.images as ProfileImageDraft[] | undefined) ?? [])
  }
}

type ContractorStatusFilter = 'all' | 'Visible' | 'Hidden'

export function ContractorAdminManager() {
  const t = useTranslations('admin')
  const c = useTranslations('admin.contractorsAdmin')
  const { modal, message } = App.useApp()
  const describeError = useContractorErrorMessage()
  // Giữ bản chi tiết đã tải để lưu lại ảnh/giấy phép/hợp tác chưa quản lý ở form
  // CRUD này (tránh gửi rỗng làm BE xoá mất).
  const detailRef = useRef(new Map<string, AdminContractorDetail>())
  // Lọc theo trạng thái hiển thị: gửi `status` lên `GET /admin/contractors` (BE chưa có tìm theo tên).
  const [status, setStatus] = useState<ContractorStatusFilter>('all')

  const options = useQuery<FilterOptions>({
    queryKey: ['admin', 'contractor-form-options'],
    queryFn: async () => {
      const [filter, scopes] = await Promise.all([getContractorFilterOptions(), constructionScopesApi.list()])
      return {
        ...filter,
        buildingTypes: filter.buildingTypes,
        scopes: scopes.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name }))
      }
    }
  })

  const buildingTypeOptions = (options.data?.buildingTypes ?? []).map((b) => ({ label: b.name, value: b.id }))
  const scopeOptions = (options.data?.scopes ?? []).map((s) => ({ label: s.name, value: s.id }))

  return (
    <ApiResourceManager<AdminContractorItem>
      title={t('nav.contractors')}
      description={c('description')}
      queryKey={['admin', 'contractors', status]}
      fetchPage={({ pageIndex, pageSize }) =>
        contractorsAdminApi.list({ pageIndex, pageSize, status: status === 'all' ? undefined : status })
      }
      banner={
        <Segmented<ContractorStatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: c('allStatuses') },
            { value: 'Visible', label: c('visible') },
            { value: 'Hidden', label: c('hidden') }
          ]}
        />
      }
      rowKey={(item) => item.contractorId}
      drawerWidth={720}
      onValidationFailed={(form) => {
        // Form dài: cuộn tới ô lỗi đầu tiên để người nhập biết còn thiếu gì.
        const error = form.getFieldsError().find((field) => field.errors.length > 0)
        if (error) requestAnimationFrame(() => form.scrollToField(error.name, { block: 'center', focus: true }))
      }}
      createValues={() => ({
        name: '',
        shortDescription: '',
        introduction: '',
        address: '',
        _structuredAddress: true,
        _addressCoordinateKey: '',
        provinceCode: null,
        wardCode: null,
        locationDatasetVersion: null,
        addressDetail: null,
        latitude: null,
        longitude: null,
        foundedYear: null,
        teamCount: null,
        surveyHours: null,
        warrantyMonths: null,
        rating: null,
        ratingCount: null,
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        buildingTypeIds: [],
        scopeIds: [],
        legalName: '',
        taxCode: '',
        representative: '',
        registeredAddress: '',
        industry: '',
        images: [] as ProfileImageDraft[],
        licenses: [] as LicenseDraft[],
        partnership: emptyPartnership()
      })}
      onCreate={async (values) => {
        // API tạo của BE chỉ nhận tên, nhưng người vận hành chỉ thấy MỘT form:
        // tạo xong gửi luôn phần còn lại bằng PUT với version vừa nhận được.
        // Hỏng ở bước PUT thì hồ sơ vẫn tồn tại ở trạng thái Ẩn, mở ra sửa tiếp
        // được — không mất dữ liệu đã nhập ngoài lần bấm đó.
        const created = await contractorsAdminApi.create(String(values.name ?? '').trim())
        const saved = await contractorsAdminApi.update(created.contractorId, buildProfileBody(values, created.version))
        // Dự án tiêu biểu nhập ngay trong form: mỗi lần tạo dự án tăng version nên nối tiếp từng cái.
        let version = saved.version
        for (const project of (values.pendingProjects as PendingProject[] | undefined) ?? []) {
          const projectSaved = await contractorsAdminApi.createProject(
            created.contractorId,
            buildProjectBody(project.values, project.images, version)
          )
          version = projectSaved.contractorVersion
        }
      }}
      toFormValues={async (item) => {
        const d = await contractorsAdminApi.get(item.contractorId)
        detailRef.current.set(item.contractorId, d)
        const p = d.profile
        return {
          expectedVersion: d.version,
          name: p.name ?? '',
          shortDescription: p.shortDescription ?? '',
          introduction: p.introduction ?? '',
          address: p.address ?? '',
          provinceCode: p.provinceCode ?? null,
          wardCode: p.wardCode ?? null,
          locationDatasetVersion: p.locationDatasetVersion ?? null,
          addressDetail: p.addressDetail ?? null,
          _structuredAddress: Boolean(p.locationDatasetVersion),
          _originalProvinceCode: p.provinceCode,
          _originalWardCode: p.wardCode,
          _originalDatasetVersion: p.locationDatasetVersion,
          _provinceName: p.provinceName,
          _wardName: p.wardName,
          _addressCoordinateKey: p.locationDatasetVersion
            ? contractorAddressKey(p as unknown as Record<string, unknown>)
            : '',
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
          foundedYear: p.foundedYear ?? null,
          teamCount: teamCountOf(p),
          surveyHours: p.surveyHours ?? null,
          warrantyMonths: p.warrantyMonths ?? null,
          rating: p.rating ?? null,
          ratingCount: p.ratingCount ?? null,
          contactPerson: p.contactPerson ?? '',
          contactPhone: p.contactPhone ?? '',
          contactEmail: p.contactEmail ?? '',
          buildingTypeIds: d.buildingTypeIds ?? [],
          scopeIds: d.scopeIds ?? [],
          legalName: d.legal?.legalName ?? '',
          taxCode: d.legal?.taxCode ?? '',
          representative: d.legal?.representative ?? '',
          registeredAddress: d.legal?.registeredAddress ?? '',
          industry: d.legal?.industry ?? '',
          images: imagesFromDetail(d.images),
          licenses: licensesFromDetail(d.licenses),
          partnership: partnershipFromDetail(d.partnership)
        }
      }}
      onUpdate={async (values, item) => {
        await contractorsAdminApi.update(
          item.contractorId,
          buildProfileBody(values, Number(values.expectedVersion), detailRef.current.get(item.contractorId))
        )
      }}
      rowActions={(item, ctx): RowAction[] => {
        const visible = item.status === 'Visible'
        return [
          {
            key: 'visibility',
            label: visible ? c('hide') : c('show'),
            icon: visible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
            onClick: async () => {
              try {
                await contractorsAdminApi.setVisibility(item.contractorId, item.version, !visible)
                message.success(t('feedback.saved'))
                await ctx.refresh()
              } catch (err) {
                message.error(describeError(err))
              }
            }
          },
          {
            key: 'delete',
            label: t('actions.delete'),
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () =>
              modal.confirm({
                title: c('deleteConfirmTitle', { name: item.name }),
                content: c('deleteConfirmBody'),
                okText: t('actions.delete'),
                okButtonProps: { danger: true },
                cancelText: t('actions.cancel'),
                onOk: async () => {
                  try {
                    await contractorsAdminApi.remove(item.contractorId, item.version)
                    message.success(t('feedback.deleted'))
                    await ctx.refresh()
                  } catch (err) {
                    message.error(describeError(err))
                  }
                }
              })
          }
        ]
      }}
      columns={[
        { title: c('name'), dataIndex: 'name', render: (_, r) => <Text strong>{r.name}</Text> },
        {
          title: c('address'),
          dataIndex: 'address',
          render: (_, r) => <Text type='secondary'>{r.address || '—'}</Text>
        },
        {
          title: c('statusLabel'),
          key: 'status',
          width: 130,
          render: (_, r) => (
            <StatusTag tone={r.status === 'Visible' ? 'success' : 'off'}>
              {c(r.status === 'Visible' ? 'visible' : 'hidden')}
            </StatusTag>
          )
        }
      ]}
      renderForm={(form, ctx) => {
        return (
          <>
            <Form.Item name='expectedVersion' hidden>
              <Input />
            </Form.Item>
            <Divider titlePlacement='start'>{c('sections.general')}</Divider>
            <Form.Item
              name='name'
              label={c('name')}
              rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name='shortDescription' label={c('shortDescription')}>
              <Input.TextArea rows={2} maxLength={300} showCount />
            </Form.Item>
            <Form.Item name='introduction' label={c('introduction')}>
              <Input.TextArea rows={4} />
            </Form.Item>

            <Divider titlePlacement='start'>{c('sections.location')}</Divider>
            <ContractorAddressField form={form} visible={ctx.item?.status === 'Visible'} />

            <Divider titlePlacement='start'>{c('sections.capability')}</Divider>
            <Form.Item
              name='buildingTypeIds'
              label={c('buildingTypes')}
              rules={[{ required: true, type: 'array', min: 1, message: c('buildingTypesRequired') }]}
            >
              <Select
                mode='multiple'
                allowClear
                loading={options.isPending}
                options={buildingTypeOptions}
                labelRender={({ value, label }) =>
                  options.data?.retiredBuildingTypes.find((type) => type.id === value)?.name ?? label ?? String(value)
                }
                optionFilterProp='label'
              />
            </Form.Item>
            <Form.Item
              name='scopeIds'
              label={c('scopes')}
              rules={[{ required: true, type: 'array', min: 1, message: c('scopesRequired') }]}
            >
              <Select
                mode='multiple'
                allowClear
                loading={options.isPending}
                options={scopeOptions}
                optionFilterProp='label'
              />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name='foundedYear' label={c('foundedYear')}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='teamCount' label={c('teamCount')}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name='surveyHours' label={c('surveyHours')}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='warrantyMonths' label={c('warrantyMonths')}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name='rating' label={c('rating')} extra={c('ratingHint')}>
                  <InputNumber style={{ width: '100%' }} min={0} max={5} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='ratingCount' label={c('ratingCount')}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement='start'>{c('sections.contact')}</Divider>
            <Text type='secondary'>{c('contactNote')}</Text>
            <Row gutter={12} style={{ marginTop: 8 }}>
              <Col span={8}>
                <Form.Item name='contactPerson' label={c('contactPerson')}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name='contactPhone' label={c('contactPhone')}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name='contactEmail' label={c('contactEmail')}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement='start'>{c('sections.legal')}</Divider>
            <Form.Item
              name='legalName'
              label={c('legalName')}
              rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
            >
              <Input />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name='taxCode' label={c('taxCode')}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='representative' label={c('representative')}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name='registeredAddress' label={c('registeredAddress')}>
              <Input />
            </Form.Item>
            <Form.Item name='industry' label={c('industry')}>
              <Input />
            </Form.Item>

            <Divider titlePlacement='start'>{c('sections.images')}</Divider>
            <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              {c('files.savedNote')}
            </Text>
            <Form.Item name='images'>
              <ContractorImagesField fieldName='images' contractorId={ctx.item?.contractorId} />
            </Form.Item>

            <Divider titlePlacement='start'>{c('sections.licenses')}</Divider>
            <Form.Item
              name='licenses'
              rules={[
                {
                  validator: (_, list?: LicenseDraft[]) =>
                    licenseProblems(list ?? []).length > 0
                      ? Promise.reject(new Error(c('files.licenses.fixBeforeSave')))
                      : Promise.resolve()
                }
              ]}
            >
              <ContractorLicensesField fieldName='licenses' contractorId={ctx.item?.contractorId} />
            </Form.Item>

            <Divider titlePlacement='start'>{c('sections.partnership')}</Divider>
            <Form.Item
              name='partnership'
              rules={[
                {
                  validator: (_, draft?: PartnershipDraft) =>
                    partnershipDateOrderInvalid(draft)
                      ? Promise.reject(new Error(c('files.partnership.dateOrder')))
                      : Promise.resolve()
                }
              ]}
            >
              <ContractorPartnershipField fieldName='partnership' contractorId={ctx.item?.contractorId} />
            </Form.Item>

            <ContractorProjectsSection form={form} contractorId={ctx.item?.contractorId} />
          </>
        )
      }}
    />
  )
}
