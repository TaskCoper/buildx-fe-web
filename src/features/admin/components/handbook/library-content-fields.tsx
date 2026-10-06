'use client'

import { Alert, Col, Form, Input, Row, Select, type FormInstance } from 'antd'
import { useTranslations } from 'next-intl'

import type { AdminVersionItem, DrawingKind, LibraryStyleRef, TemplateContent } from '../../api/bmt/library.api'
import type { ClassificationBuildingType, ClassificationOptions } from '../../api/bmt/library-sections.api'
import { useFloorLabel } from '../catalog/use-floor-label'
import { useLibraryClassification } from './use-library-classification'

/** Chuỗi thập phân > 0, tối đa hai chữ số lẻ — đúng định dạng BE nhận cho kích thước. */
const DECIMAL = /^\d+(\.\d{1,2})?$/

const DRAWING_KINDS: DrawingKind[] = ['2D', '3D']

const blankToNull = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : value
  return text === '' || text === undefined ? null : (text as string)
}

/** Điều khiển ẩn chỉ để Form giữ một giá trị không phải chuỗi (mảng) — không vẽ gì. */
const HiddenValue = () => null

const idsOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/**
 * Form → metadata gửi BE. Trường tắt theo loại công trình để trống (Không áp dụng), không gửi 0 / Không tum.
 *
 * Phong cách CHỈ dành cho mẫu 3D và luôn gửi thành MẢNG: bỏ qua hoặc `null` thì BE giữ nguyên tập cũ, còn
 * mẫu 2D bị từ chối nếu gắn phong cách — nên mọi mẫu không phải 3D (kể cả khi vừa đổi 3D → 2D) gửi `[]`
 * để xóa sạch, và nhóm bị loại công trình tắt cũng gửi `[]`.
 */
export function toTemplateContent(
  values: Record<string, unknown>,
  classification: ClassificationOptions | undefined
): TemplateContent {
  const buildingTypeId = blankToNull(values.buildingTypeId)
  const type = classification?.buildingTypes.find((item) => item.buildingTypeId === buildingTypeId)
  const floorCount = typeof values.floorCount === 'number' ? values.floorCount : null
  const hasTum = typeof values.hasTum === 'boolean' ? values.hasTum : null
  const drawingKind = (blankToNull(values.drawingKind) as DrawingKind | null) ?? null
  const is3d = drawingKind === '3D'
  return {
    name: blankToNull(values.name),
    description: blankToNull(values.description),
    drawingKind,
    widthM: blankToNull(values.widthM),
    lengthM: blankToNull(values.lengthM),
    areaM2: blankToNull(values.areaM2),
    buildingTypeId,
    // Loại đã ghim nhưng không còn trong danh mục hiện hành: giữ nguyên giá trị đã lưu.
    floorCount: type && !type.floorsEnabled ? null : floorCount,
    hasTum: type && !type.tumEnabled ? null : hasTum,
    architectureStyleIds: is3d && !(type && !type.architectureEnabled) ? idsOf(values.architectureStyleIds) : [],
    interiorStyleIds: is3d && !(type && !type.interiorEnabled) ? idsOf(values.interiorStyleIds) : []
  }
}

/** Phiên bản → giá trị form. */
export function toContentFormValues(version: AdminVersionItem): Record<string, unknown> {
  const architecture = version.architectureStyles ?? []
  const interior = version.interiorStyles ?? []
  return {
    name: version.name ?? '',
    description: version.description ?? '',
    drawingKind: version.drawingKind ?? undefined,
    widthM: version.widthM ?? '',
    lengthM: version.lengthM ?? '',
    areaM2: version.areaM2 ?? '',
    buildingTypeId: version.buildingTypeId ?? undefined,
    floorCount: version.floorCount ?? undefined,
    hasTum: version.hasTum ?? undefined,
    architectureStyleIds: architecture.map((style) => style.styleId),
    interiorStyleIds: interior.map((style) => style.styleId),
    // Tên loại / phong cách đã ghim — để hiện đúng khi không còn trong danh mục hiện hành.
    pinnedTypeName: version.buildingTypeName ?? undefined,
    pinnedStyles: [...architecture, ...interior].map((style) => ({ styleId: style.styleId, name: style.name }))
  }
}

/** Lựa chọn của một nhóm phong cách: danh mục hiện hành + những mục đã chọn mà danh mục không còn. */
function styleOptions(
  available: readonly LibraryStyleRef[],
  selected: readonly string[],
  pinned: readonly { styleId: string; name: string }[]
) {
  const known = new Set(available.map((style) => style.styleId))
  return [
    ...available.map((style) => ({ value: style.styleId, label: style.name })),
    ...selected
      .filter((id) => !known.has(id))
      .map((id) => ({ value: id, label: pinned.find((style) => style.styleId === id)?.name ?? id }))
  ]
}

/**
 * Các trường metadata của một phiên bản mẫu (BR-LIB-001). Lưu nháp được phép thiếu mọi trường; đủ hay chưa
 * do BE kiểm lúc công bố. Loại công trình, số tầng, tum và phong cách lấy từ `classification-options` (danh
 * mục dự toán hiện hành) — không cần quyền sửa danh mục. Mẫu 3D công bố phải có ít nhất một phong cách cho mỗi
 * nhóm mà loại công trình đang bật.
 */
export function LibraryContentFields({ form }: { form: FormInstance }) {
  const l = useTranslations('admin.library')
  const floorLabel = useFloorLabel()
  const { data: classification, isError } = useLibraryClassification()

  const typeId = Form.useWatch('buildingTypeId', form) as string | undefined
  const floorCount = Form.useWatch('floorCount', form) as number | undefined
  const pinnedName = Form.useWatch('pinnedTypeName', form) as string | undefined
  const hasTum = Form.useWatch('hasTum', form) as boolean | undefined
  const drawingKind = Form.useWatch('drawingKind', form) as DrawingKind | undefined
  const architectureIds = (Form.useWatch('architectureStyleIds', form) as string[] | undefined) ?? []
  const interiorIds = (Form.useWatch('interiorStyleIds', form) as string[] | undefined) ?? []
  const pinnedStyles = (Form.useWatch('pinnedStyles', form) as { styleId: string; name: string }[] | undefined) ?? []

  const types = classification?.buildingTypes ?? []
  const type: ClassificationBuildingType | undefined = types.find((item) => item.buildingTypeId === typeId)
  const unknownType = Boolean(typeId) && !type

  const typeOptions = [
    ...types.map((item) => ({ value: item.buildingTypeId, label: item.name })),
    ...(unknownType && typeId ? [{ value: typeId, label: pinnedName ?? typeId }] : [])
  ]
  const floorOptions = [...new Set([...(type?.floorCounts ?? []), ...(floorCount ? [floorCount] : [])])]
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: floorLabel(value) }))

  const decimalRule = (label: string) => ({
    validator: (_: unknown, value: unknown) => {
      const text = String(value ?? '').trim()
      if (!text) return Promise.resolve()
      return DECIMAL.test(text) && Number(text) > 0
        ? Promise.resolve()
        : Promise.reject(new Error(l('decimal', { field: label })))
    }
  })

  /** Đổi loại: bỏ số tầng / tum / phong cách không còn hợp lệ với loại mới. */
  const changeType = (next: string | undefined) => {
    const nextType = types.find((item) => item.buildingTypeId === next)
    const current = form.getFieldValue('floorCount') as number | undefined
    const keep = (ids: string[], styles: readonly LibraryStyleRef[] | undefined) =>
      styles ? ids.filter((id) => styles.some((style) => style.styleId === id)) : ids
    form.setFieldsValue({
      buildingTypeId: next,
      floorCount:
        nextType?.floorsEnabled && current !== undefined && nextType.floorCounts.includes(current)
          ? current
          : undefined,
      hasTum: nextType?.tumEnabled ? form.getFieldValue('hasTum') : undefined,
      architectureStyleIds: keep(
        (form.getFieldValue('architectureStyleIds') as string[] | undefined) ?? [],
        nextType?.architectureStyles
      ),
      interiorStyleIds: keep(
        (form.getFieldValue('interiorStyleIds') as string[] | undefined) ?? [],
        nextType?.interiorStyles
      )
    })
  }

  const showFloors = unknownType ? floorCount !== undefined : Boolean(type?.floorsEnabled)
  const showTum = unknownType ? hasTum !== undefined : Boolean(type?.tumEnabled)

  return (
    <>
      <Form.Item name='pinnedTypeName' hidden>
        <Input />
      </Form.Item>
      <Form.Item name='pinnedStyles' hidden>
        <HiddenValue />
      </Form.Item>
      <Form.Item name='name' label={l('name')} extra={l('draftHint')}>
        <Input />
      </Form.Item>
      <Form.Item name='drawingKind' label={l('drawingKind')}>
        <Select allowClear options={DRAWING_KINDS.map((value) => ({ value, label: value }))} />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name='widthM' label={l('widthM')} rules={[decimalRule(l('widthM'))]}>
            <Input suffix='m' inputMode='decimal' />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name='lengthM' label={l('lengthM')} rules={[decimalRule(l('lengthM'))]}>
            <Input suffix='m' inputMode='decimal' />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name='areaM2' label={l('areaM2')} rules={[decimalRule(l('areaM2'))]} extra={l('areaHint')}>
            <Input suffix='m²' inputMode='decimal' />
          </Form.Item>
        </Col>
      </Row>

      {isError ? <Alert type='warning' showIcon style={{ marginBottom: 16 }} title={l('catalogUnavailable')} /> : null}
      <Form.Item name='buildingTypeId' label={l('buildingType')}>
        <Select allowClear options={typeOptions} onChange={changeType} optionFilterProp='label' showSearch />
      </Form.Item>
      {unknownType ? <Alert type='info' showIcon style={{ marginBottom: 16 }} title={l('pinnedTypeNote')} /> : null}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {showFloors ? (
            <Form.Item name='floorCount' label={l('floorCount')}>
              <Select allowClear options={floorOptions} />
            </Form.Item>
          ) : (
            <Form.Item label={l('floorCount')}>
              <Input disabled value={typeId ? l('notApplies') : ''} />
            </Form.Item>
          )}
        </Col>
        <Col xs={24} md={12}>
          {showTum ? (
            <Form.Item name='hasTum' label={l('tum')}>
              <Select
                allowClear
                options={[
                  { value: true, label: l('tumYes') },
                  { value: false, label: l('tumNo') }
                ]}
              />
            </Form.Item>
          ) : (
            <Form.Item label={l('tum')}>
              <Input disabled value={typeId ? l('notApplies') : ''} />
            </Form.Item>
          )}
        </Col>
      </Row>

      {drawingKind === '3D' ? (
        <>
          <Alert type='info' showIcon style={{ marginBottom: 16 }} title={l('styles3dNote')} />
          {type && !type.architectureEnabled ? null : (
            <Form.Item
              name='architectureStyleIds'
              label={l('architectureStyles')}
              extra={typeId ? undefined : l('stylesNeedType')}
            >
              <Select
                mode='multiple'
                allowClear
                disabled={!typeId}
                options={styleOptions(type?.architectureStyles ?? [], architectureIds, pinnedStyles)}
                optionFilterProp='label'
              />
            </Form.Item>
          )}
          {type && !type.interiorEnabled ? null : (
            <Form.Item
              name='interiorStyleIds'
              label={l('interiorStyles')}
              extra={typeId ? undefined : l('stylesNeedType')}
            >
              <Select
                mode='multiple'
                allowClear
                disabled={!typeId}
                options={styleOptions(type?.interiorStyles ?? [], interiorIds, pinnedStyles)}
                optionFilterProp='label'
              />
            </Form.Item>
          )}
        </>
      ) : null}

      <Form.Item name='description' label={l('description')}>
        <Input.TextArea rows={4} />
      </Form.Item>
    </>
  )
}
