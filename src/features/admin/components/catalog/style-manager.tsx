'use client'

import { Alert, Descriptions, Form, Image, Input, Segmented, Select, Space, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import {
  createCatalogStyle,
  updateBuildingType,
  updateCatalogStyle,
  type AdminCatalog,
  type CatalogBuildingTypeDto,
  type CatalogStyleDto,
  type CatalogStyleGroup
} from '../../api/bmt/catalog.api'
import { ESTIMATE_CATALOG_KEY, useEstimateCatalog, useFreshCatalog } from '../../hooks/use-estimate-catalog'
import { matchesKeyword, pageLocally } from '../../services/local-page.service'
import { ApiResourceManager } from '../common/api-resource-manager'
import { StatusTag } from '../common/status-tag'
import { TableThumb } from '../common/table-thumb'
import { HttpsImageField } from '../common/https-image-field'

const { Text } = Typography

const NAME_MAX = 200

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : value)

/** Loại công trình đang gán phong cách này, kèm cờ nhóm có đang bật không. */
function assignedTypes(catalog: AdminCatalog | undefined, kind: 'architecture' | 'interior', styleId: string) {
  return (catalog?.buildingTypes ?? [])
    .filter((type) => (kind === 'architecture' ? type.architectureStyleIds : type.interiorStyleIds).includes(styleId))
    .map((type) => ({
      id: type.buildingTypeId,
      name: type.name,
      enabled: kind === 'architecture' ? type.architectureEnabled : type.interiorEnabled
    }))
}

/** Giữ nguyên mọi trường của loại công trình, chỉ thay danh sách id phong cách. */
function buildingTypeInputWith(bt: CatalogBuildingTypeDto, kind: 'architecture' | 'interior', styleIds: string[]) {
  return {
    name: bt.name,
    floorsEnabled: bt.floorsEnabled,
    tumEnabled: bt.tumEnabled,
    architectureEnabled: bt.architectureEnabled,
    interiorEnabled: bt.interiorEnabled,
    floorCounts: bt.floorCounts,
    architectureStyleIds: kind === 'architecture' ? styleIds : bt.architectureStyleIds,
    interiorStyleIds: kind === 'interior' ? styleIds : bt.interiorStyleIds
  }
}

/**
 * PHONG CÁCH (STORY-PROJ-005, BR-PROJ-004) — MỘT màn cho cả phong cách kiến trúc
 * và nội thất (chung endpoint `/admin/estimate-catalog`; một payload trả cả hai
 * danh sách). Chọn Kiến trúc / Nội thất bằng Segmented thay vì tách hai mục menu.
 *
 * Phong cách có tên, một ảnh minh họa (URL https thuộc kho presign) và danh sách
 * loại công trình áp dụng — gán ngay tại đây (khỏi qua màn Loại công trình): API
 * phong cách không giữ liên kết này nên khi lưu, form cập nhật mảng
 * `architecture/interiorStyleIds` của TỪNG loại công trình (PUT tuần tự theo
 * phiên bản danh mục). API không có xóa, ẩn hay sắp xếp phong cách. `group` chỉ
 * đặt lúc tạo (không sửa được) nên form Tạo lấy theo tab đang mở.
 */
export function StyleManager() {
  const t = useTranslations('admin')
  const c = useTranslations('admin.estimateCatalog')
  const { data: catalog } = useEstimateCatalog()
  const { fetchFresh, invalidate } = useFreshCatalog()
  const [group, setGroup] = useState<CatalogStyleGroup>('Architecture')
  const kind: 'architecture' | 'interior' = group === 'Architecture' ? 'architecture' : 'interior'
  const pick = (source: AdminCatalog) => (kind === 'architecture' ? source.architectureStyles : source.interiorStyles)
  const typeEnabled = (bt: CatalogBuildingTypeDto) =>
    kind === 'architecture' ? bt.architectureEnabled : bt.interiorEnabled

  /** Loại công trình chọn được: chỉ những loại đang BẬT nhóm phong cách này. */
  const typeOptions = (catalog?.buildingTypes ?? [])
    .filter(typeEnabled)
    .map((bt) => ({ label: bt.name, value: bt.buildingTypeId }))

  /**
   * Đồng bộ danh sách loại công trình áp dụng phong cách `styleId` với lựa chọn
   * `selectedIds`. Danh mục có phiên bản nên phải PUT TUẦN TỰ từng loại, lấy
   * `catalogVersion` mới sau mỗi lần. Chỉ đụng loại đang BẬT nhóm — loại tắt giữ
   * nguyên để không mất liên kết cũ.
   */
  async function applyAssignment(styleId: string, selectedIds: string[]) {
    const fresh = await fetchFresh()
    let version = fresh.catalogVersion
    const selected = new Set(selectedIds)
    for (const bt of fresh.buildingTypes) {
      if (!typeEnabled(bt)) continue
      const current = kind === 'architecture' ? bt.architectureStyleIds : bt.interiorStyleIds
      const has = current.includes(styleId)
      const should = selected.has(bt.buildingTypeId)
      if (has === should) continue
      const nextIds = should ? [...current, styleId] : current.filter((id) => id !== styleId)
      const saved = await updateBuildingType(bt.buildingTypeId, version, buildingTypeInputWith(bt, kind, nextIds))
      version = saved.catalogVersion
    }
  }

  const typeTags = (styleId: string) => (
    <Space size={4} wrap style={{ maxWidth: 360 }}>
      {assignedTypes(catalog, kind, styleId).map((type) => (
        <StatusTag key={type.id} tone={type.enabled ? 'info' : 'off'}>
          {type.enabled ? type.name : c('typeGroupOff', { name: type.name })}
        </StatusTag>
      ))}
    </Space>
  )

  return (
    <ApiResourceManager<CatalogStyleDto>
      title={t('nav.styles')}
      description={c(kind === 'architecture' ? 'architectureDescription' : 'interiorDescription')}
      queryKey={[...ESTIMATE_CATALOG_KEY, 'styles', group]}
      searchable
      banner={
        <Segmented
          value={group}
          onChange={(value) => setGroup(value as CatalogStyleGroup)}
          options={[
            { value: 'Architecture', label: c('groupArchitecture') },
            { value: 'Interior', label: c('groupInterior') }
          ]}
          style={{ marginBottom: 16 }}
        />
      }
      fetchPage={async ({ pageIndex, pageSize, keyword }) => {
        const fresh = await fetchFresh()
        return pageLocally(
          pick(fresh).filter((style) => matchesKeyword(style.name, keyword)),
          pageIndex,
          pageSize
        )
      }}
      rowKey={(item) => item.styleId}
      drawerWidth={560}
      createValues={() => ({
        expectedCatalogVersion: catalog?.catalogVersion ?? 0,
        name: '',
        imageUrl: '',
        buildingTypeIds: []
      })}
      onCreate={async (values) => {
        const saved = await createCatalogStyle(Number(values.expectedCatalogVersion), group, {
          name: String(values.name ?? '').trim(),
          imageUrl: String(values.imageUrl ?? '').trim()
        })
        await applyAssignment(saved.styleId, (values.buildingTypeIds as string[] | undefined) ?? [])
        await invalidate()
      }}
      toFormValues={async (item) => {
        const fresh = await fetchFresh()
        const latest = pick(fresh).find((style) => style.styleId === item.styleId) ?? item
        const buildingTypeIds = assignedTypes(fresh, kind, item.styleId)
          .filter((type) => type.enabled)
          .map((type) => type.id)
        return { ...latest, expectedCatalogVersion: fresh.catalogVersion, buildingTypeIds }
      }}
      onUpdate={async (values, item) => {
        await updateCatalogStyle(item.styleId, Number(values.expectedCatalogVersion), {
          name: String(values.name ?? '').trim(),
          imageUrl: String(values.imageUrl ?? '').trim()
        })
        await applyAssignment(item.styleId, (values.buildingTypeIds as string[] | undefined) ?? [])
        await invalidate()
      }}
      columns={[
        {
          title: c('styleName'),
          dataIndex: 'name',
          render: (_, record) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TableThumb src={record.imageUrl} />
              <Text strong>{record.name}</Text>
            </div>
          )
        },
        {
          title: c('assignedTypes'),
          key: 'types',
          render: (_, record) => typeTags(record.styleId)
        }
      ]}
      renderView={(item) => (
        <Space orientation='vertical' size={16} style={{ width: '100%' }}>
          {item.imageUrl ? <Image src={item.imageUrl} alt='' style={{ borderRadius: 8 }} /> : null}
          <Descriptions
            size='small'
            column={1}
            bordered
            items={[
              { key: 'name', label: c('styleName'), children: item.name },
              { key: 'types', label: c('assignedTypes'), children: typeTags(item.styleId) }
            ]}
          />
        </Space>
      )}
      renderForm={() => (
        <>
          <Form.Item name='expectedCatalogVersion' hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name='name'
            label={c('styleName')}
            rules={[
              { required: true, whitespace: true, message: t('fields.requiredMessage') },
              { max: NAME_MAX, transform: trimmed, message: t('fields.maxLength', { max: NAME_MAX }) }
            ]}
          >
            <Input showCount maxLength={NAME_MAX + 20} />
          </Form.Item>
          <HttpsImageField name='imageUrl' label={c('styleImage')} />
          <Alert type='info' showIcon title={c('styleImageNote')} style={{ marginBottom: 12 }} />
          <Form.Item name='buildingTypeIds' label={c('styleAssignLabel')} extra={c('styleAssignHint')}>
            <Select
              mode='multiple'
              allowClear
              options={typeOptions}
              placeholder={c('styleAssignPlaceholder')}
              optionFilterProp='label'
            />
          </Form.Item>
        </>
      )}
    />
  )
}
