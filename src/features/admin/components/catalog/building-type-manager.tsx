'use client'

import { DeleteOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, App, Descriptions, Form, Input, Select, Space, Switch, Tag, Typography, type FormInstance } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import {
  createBuildingType,
  deleteBuildingType,
  updateBuildingType,
  type AdminCatalog,
  type BuildingTypeInput,
  type CatalogBuildingTypeDto,
  type CatalogStyleDto
} from '../../api/bmt/catalog.api'
import { ESTIMATE_CATALOG_KEY, useEstimateCatalog, useFreshCatalog } from '../../hooks/use-estimate-catalog'
import { matchesKeyword, pageLocally } from '../../services/local-page.service'
import { ApiResourceManager } from '../common/api-resource-manager'
import { StatusTag } from '../common/status-tag'
import { useFloorLabel } from './use-floor-label'

const { Text } = Typography

/** Số tầng chọn được: 1–4 (BR-PROJ-004, CHECK `FloorCount BETWEEN 1 AND 4` của TDD-PROJ-007). Số cũ đã lưu vẫn hiện. */
const FLOOR_CHOICES = Array.from({ length: 4 }, (_, index) => index + 1)

/** Mã gốc của app demo mà luồng AI dùng để chọn luật lô đất, mái, tầng (TDD-PROJ-007 mục B). */
const BASE_CODES = ['nha-pho', 'villa-biet-thu', 'nha-mai', 'nha-vuon-cap4', 'can-ho'] as const
const NAME_MAX = 200

type Filter = 'all' | 'yes' | 'no'

interface Filters {
  floors: Filter
  tum: Filter
}

type BuildingTypeRow = CatalogBuildingTypeDto & { catalogVersion: number }

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : value)

function toInput(values: Record<string, unknown>, aiMapping: boolean): BuildingTypeInput {
  const list = <T,>(value: unknown) => (Array.isArray(value) ? (value as T[]) : [])
  const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)
  return {
    // Chỉ gửi khi BE đã có hai trường này; BE cũ trả 422 với trường lạ.
    ...(aiMapping ? { baseCode: text(values.baseCode), defaultBaseStyleCode: text(values.defaultBaseStyleCode) } : {}),
    name: String(values.name ?? '').trim(),
    floorsEnabled: Boolean(values.floorsEnabled),
    tumEnabled: Boolean(values.tumEnabled),
    architectureEnabled: Boolean(values.architectureEnabled),
    interiorEnabled: Boolean(values.interiorEnabled),
    // Nhóm tắt vẫn gửi kèm danh sách để bật lại không phải nhập lại (TDD-PROJ-001, quyết định lần 2).
    floorCounts: [...new Set(list<number>(values.floorCounts))].sort((a, b) => a - b),
    architectureStyleIds: [...new Set(list<string>(values.architectureStyleIds))],
    interiorStyleIds: [...new Set(list<string>(values.interiorStyleIds))]
  }
}

/**
 * LOẠI CÔNG TRÌNH (STORY-PROJ-005, BR-PROJ-004) — danh mục dự toán trên BMT API.
 *
 * Mỗi loại bật / tắt riêng: chọn số tầng (kèm danh sách số tầng), chọn Có/Không
 * tum, chọn phong cách kiến trúc và phong cách nội thất (kèm phong cách được
 * gán). Nhóm bật phải có ít nhất một lựa chọn; nhóm tắt vẫn giữ danh sách.
 *
 * Danh mục có phiên bản: lưu xong chỉ bản dự toán MỚI dùng cấu hình mới, bản cũ
 * giữ cấu hình đã ghim. Xóa chỉ bỏ loại khỏi danh mục cho lựa chọn mới.
 */
export function BuildingTypeManager() {
  const t = useTranslations('admin')
  const c = useTranslations('admin.estimateCatalog')
  const floorLabel = useFloorLabel()
  const { modal, message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: catalog } = useEstimateCatalog()
  const { fetchFresh, invalidate } = useFreshCatalog()
  const [filters, setFilters] = useState<Filters>({ floors: 'all', tum: 'all' })

  const matches = (type: CatalogBuildingTypeDto) =>
    (filters.floors === 'all' || type.floorsEnabled === (filters.floors === 'yes')) &&
    (filters.tum === 'all' || type.tumEnabled === (filters.tum === 'yes'))

  const styleNames = (ids: readonly string[], styles: readonly CatalogStyleDto[] | undefined) =>
    ids.map((id) => styles?.find((style) => style.styleId === id)?.name ?? id)

  const groupCell = (enabled: boolean, count: number) =>
    enabled ? (
      <StatusTag tone='success'>{c('enabledCount', { count })}</StatusTag>
    ) : (
      <StatusTag tone='off'>{c('notApplies')}</StatusTag>
    )

  const filterSelect = (key: keyof Filters, label: string) => (
    <Select<Filter>
      value={filters[key]}
      onChange={(value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      style={{ minWidth: 190 }}
      options={(['all', 'yes', 'no'] as const).map((value) => ({
        value,
        label: `${label}: ${c(`filter.${value}`)}`
      }))}
    />
  )

  return (
    <ApiResourceManager<BuildingTypeRow>
      title={t('nav.buildingTypes')}
      description={c('buildingTypesDescription')}
      queryKey={[...ESTIMATE_CATALOG_KEY, 'building-types', filters]}
      searchable
      fetchPage={async ({ pageIndex, pageSize, keyword }) => {
        const fresh = await fetchFresh()
        const rows = fresh.buildingTypes
          .filter((type) => matches(type) && matchesKeyword(type.name, keyword))
          .map((type) => ({ ...type, catalogVersion: fresh.catalogVersion }))
        return pageLocally(rows, pageIndex, pageSize)
      }}
      rowKey={(item) => item.buildingTypeId}
      drawerWidth={640}
      banner={
        <Space wrap style={{ marginBottom: 16 }}>
          {filterSelect('floors', c('floors'))}
          {filterSelect('tum', c('tum'))}
        </Space>
      }
      createValues={() => ({
        expectedCatalogVersion: catalog?.catalogVersion ?? 0,
        name: '',
        floorsEnabled: false,
        tumEnabled: false,
        architectureEnabled: false,
        interiorEnabled: false,
        floorCounts: [],
        architectureStyleIds: [],
        interiorStyleIds: [],
        baseCode: null,
        defaultBaseStyleCode: null
      })}
      onCreate={async (values) => {
        await createBuildingType(
          Number(values.expectedCatalogVersion),
          toInput(values, Boolean(catalog?.supportsAiMapping))
        )
        await invalidate()
      }}
      toFormValues={async (item) => {
        // Đọc lại danh mục để form hiện cấu hình mới nhất và giữ đúng version.
        const fresh = await fetchFresh()
        const latest = fresh.buildingTypes.find((type) => type.buildingTypeId === item.buildingTypeId) ?? item
        return { ...latest, expectedCatalogVersion: fresh.catalogVersion }
      }}
      onUpdate={async (values, item) => {
        await updateBuildingType(
          item.buildingTypeId,
          Number(values.expectedCatalogVersion),
          toInput(values, Boolean(catalog?.supportsAiMapping))
        )
        await invalidate()
      }}
      rowActions={(item) => [
        {
          key: 'delete',
          label: t('actions.delete'),
          icon: <DeleteOutlined />,
          danger: true,
          disabled: !catalog,
          onClick: () => {
            if (!catalog) return
            // Giữ phiên bản và khóa của lần xác nhận, kể cả khi mạng lỗi hoặc cache tải lại.
            const version = item.catalogVersion
            const requestKey = crypto.randomUUID()
            modal.confirm({
              title: c('deleteTypeTitle', { name: item.name }),
              content: c('deleteTypeBody'),
              okText: t('actions.delete'),
              cancelText: t('actions.cancel'),
              okButtonProps: { danger: true },
              onOk: async () => {
                try {
                  await deleteBuildingType(item.buildingTypeId, version, requestKey)
                } catch (error) {
                  message.error(isApiError(error) ? error.message : t('feedback.apiError'))
                  if (isApiError(error) && (error.status === 409 || error.status === 404)) {
                    void invalidate()
                    return
                  }
                  throw error
                }
                message.success(c('deleteTypeSuccess'))
                void Promise.all([
                  invalidate(),
                  queryClient.invalidateQueries({ queryKey: ['admin', 'contractor-form-options'] }),
                  queryClient.invalidateQueries({ queryKey: ['admin', 'contractor-type-options'] })
                ]).catch((error: unknown) => {
                  message.error(isApiError(error) ? error.message : t('feedback.apiError'))
                })
              }
            })
          }
        }
      ]}
      columns={[
        {
          title: c('buildingTypeName'),
          dataIndex: 'name',
          render: (name: string) => <Text strong>{name}</Text>
        },
        ...(catalog?.supportsAiMapping
          ? [
              {
                title: c('baseCode'),
                key: 'baseCode',
                width: 150,
                render: (_: unknown, record: CatalogBuildingTypeDto) =>
                  record.baseCode ? (
                    <Tag>{c(`baseCodes.${record.baseCode as (typeof BASE_CODES)[number]}`)}</Tag>
                  ) : (
                    <StatusTag tone='off'>{c('baseCodeMissing')}</StatusTag>
                  )
              }
            ]
          : []),
        {
          title: c('floors'),
          key: 'floors',
          render: (_, record) =>
            record.floorsEnabled ? (
              <Space size={4} wrap style={{ maxWidth: 320 }}>
                {record.floorCounts.map((count) => (
                  <Tag key={count} color='blue'>
                    {floorLabel(count)}
                  </Tag>
                ))}
              </Space>
            ) : (
              <StatusTag tone='off'>{c('notApplies')}</StatusTag>
            )
        },
        {
          title: c('tum'),
          key: 'tum',
          width: 140,
          render: (_, record) =>
            record.tumEnabled ? (
              <StatusTag tone='success'>{c('applies')}</StatusTag>
            ) : (
              <StatusTag tone='off'>{c('notApplies')}</StatusTag>
            )
        },
        {
          title: c('architectureStyles'),
          key: 'architecture',
          width: 170,
          render: (_, record) => groupCell(record.architectureEnabled, record.architectureStyleIds.length)
        },
        {
          title: c('interiorStyles'),
          key: 'interior',
          width: 170,
          render: (_, record) => groupCell(record.interiorEnabled, record.interiorStyleIds.length)
        }
      ]}
      renderView={(item) => {
        const group = (enabled: boolean, names: string[]) => (
          <Space orientation='vertical' size={4}>
            <Text>{enabled ? c('applies') : c('notApplies')}</Text>
            {names.length > 0 ? (
              <Space size={4} wrap>
                {names.map((name, index) => (
                  <StatusTag key={`${name}-${index}`} tone={enabled ? 'info' : 'off'}>
                    {name}
                  </StatusTag>
                ))}
              </Space>
            ) : null}
            {!enabled && names.length > 0 ? (
              <Text type='secondary' style={{ fontSize: 12 }}>
                {c('keptWhileDisabled')}
              </Text>
            ) : null}
          </Space>
        )
        return (
          <Descriptions
            size='small'
            column={1}
            bordered
            items={[
              { key: 'name', label: c('buildingTypeName'), children: item.name },
              ...(catalog?.supportsAiMapping
                ? [
                    {
                      key: 'baseCode',
                      label: c('baseCode'),
                      children: item.baseCode
                        ? c(`baseCodes.${item.baseCode as (typeof BASE_CODES)[number]}`)
                        : c('baseCodeMissing')
                    },
                    {
                      key: 'defaultBaseStyleCode',
                      label: c('defaultBaseStyleCode'),
                      children: item.defaultBaseStyleCode ?? '—'
                    }
                  ]
                : []),
              {
                key: 'floors',
                label: c('floors'),
                children: group(item.floorsEnabled, item.floorCounts.map(floorLabel))
              },
              { key: 'tum', label: c('tum'), children: item.tumEnabled ? c('applies') : c('notApplies') },
              {
                key: 'architecture',
                label: c('architectureStyles'),
                children: group(
                  item.architectureEnabled,
                  styleNames(item.architectureStyleIds, catalog?.architectureStyles)
                )
              },
              {
                key: 'interior',
                label: c('interiorStyles'),
                children: group(item.interiorEnabled, styleNames(item.interiorStyleIds, catalog?.interiorStyles))
              }
            ]}
          />
        )
      }}
      renderForm={(form) => <BuildingTypeFields form={form} catalog={catalog} />}
    />
  )
}

function BuildingTypeFields({ form, catalog }: { form: FormInstance; catalog: AdminCatalog | undefined }) {
  const t = useTranslations('admin')
  const c = useTranslations('admin.estimateCatalog')
  const floorLabel = useFloorLabel()
  const floorCounts = (Form.useWatch('floorCounts', form) as number[] | undefined) ?? []

  const floorOptions = [...new Set([...FLOOR_CHOICES, ...floorCounts])]
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: floorLabel(value) }))

  const styleOptions = (styles: readonly CatalogStyleDto[] | undefined) =>
    (styles ?? []).map((style) => ({ value: style.styleId, label: style.name }))

  /** Nhóm đang bật phải có ít nhất một lựa chọn (BR-PROJ-004 khoản 13). */
  const requiredWhen = (flag: string, message: string) => [
    ({ getFieldValue }: { getFieldValue: (name: string) => unknown }) => ({
      validator: (_: unknown, value: unknown[] | undefined) =>
        getFieldValue(flag) && (value ?? []).length === 0 ? Promise.reject(new Error(message)) : Promise.resolve()
    })
  ]

  const group = (
    flag: string,
    list: string,
    label: string,
    emptyMessage: string,
    options: { value: string | number; label: string }[]
  ) => (
    <>
      <Form.Item name={flag} valuePropName='checked' label={label} style={{ marginBottom: 8 }}>
        <Switch />
      </Form.Item>
      <Form.Item
        name={list}
        dependencies={[flag]}
        rules={requiredWhen(flag, emptyMessage)}
        extra={c('keptWhileDisabled')}
      >
        <Select mode='multiple' allowClear options={options} optionFilterProp='label' />
      </Form.Item>
    </>
  )

  return (
    <>
      <Form.Item name='expectedCatalogVersion' hidden>
        <Input />
      </Form.Item>
      <Form.Item
        name='name'
        label={c('buildingTypeName')}
        rules={[
          { required: true, whitespace: true, message: t('fields.requiredMessage') },
          { max: NAME_MAX, transform: trimmed, message: t('fields.maxLength', { max: NAME_MAX }) }
        ]}
      >
        <Input showCount maxLength={NAME_MAX + 20} />
      </Form.Item>

      {catalog?.supportsAiMapping ? (
        <>
          <Form.Item name='baseCode' label={c('baseCode')} extra={c('baseCodeHint')}>
            <Select
              allowClear
              options={BASE_CODES.map((value) => ({ value, label: c(`baseCodes.${value}`) }))}
              placeholder={c('baseCodeMissing')}
            />
          </Form.Item>
          <Form.Item
            name='defaultBaseStyleCode'
            label={c('defaultBaseStyleCode')}
            extra={c('defaultBaseStyleCodeHint')}
            rules={[{ max: 64, transform: trimmed, message: t('fields.maxLength', { max: 64 }) }]}
          >
            <Input allowClear />
          </Form.Item>
        </>
      ) : null}

      {group('floorsEnabled', 'floorCounts', c('floorsEnabled'), c('floorsEmpty'), floorOptions)}

      <Form.Item name='tumEnabled' valuePropName='checked' label={c('tumEnabled')} extra={c('tumHint')}>
        <Switch />
      </Form.Item>

      {group(
        'architectureEnabled',
        'architectureStyleIds',
        c('architectureEnabled'),
        c('architectureEmpty'),
        styleOptions(catalog?.architectureStyles)
      )}
      {group(
        'interiorEnabled',
        'interiorStyleIds',
        c('interiorEnabled'),
        c('interiorEmpty'),
        styleOptions(catalog?.interiorStyles)
      )}

      <Alert type='info' showIcon title={c('versionNote')} />
    </>
  )
}
