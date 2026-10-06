'use client'

import { DeleteOutlined, EyeOutlined, SwapOutlined } from '@ant-design/icons'
import { Alert, App, Checkbox, Form, Segmented, Space, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import {
  deleteTemplateDraft,
  getTemplateVersions,
  listAllLibraryTemplates,
  setTemplateVisibility,
  type AdminTemplateItem,
  type AdminVersionItem,
  type DrawingKind
} from '../../api/bmt/library.api'
import {
  InitialContentError,
  createTemplateWithSections,
  loadEditTarget,
  normalizeSections,
  releaseNewVersion,
  updateTemplateWithSections,
  type CreateFlowProgress,
  type EditTarget,
  type FormSection,
  type SaveFlowResult
} from '../../api/bmt/library-create-flow'
import { matchesKeyword, pageLocally } from '../../services/local-page.service'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'
import { useFloorLabel } from '../catalog/use-floor-label'
import { LibraryContentFields, toContentFormValues, toTemplateContent } from './library-content-fields'
import { useLibraryErrorMessage } from './library-error-message'
import { LibraryTemplateDetailDrawer } from './library-template-detail-drawer'
import { LibraryInitialSectionsField, newFormSection, newFormSectionKey } from './library-initial-sections-field'
import { useLibraryClassification } from './use-library-classification'

const { Text } = Typography

/** Số request đọc phiên bản chạy song song khi dựng danh sách. */
const CONCURRENCY = 6

/** Một dòng bảng: mẫu + phiên bản đại diện (bản hiện hành, chưa có thì nháp mới nhất). */
interface LibraryRow {
  template: AdminTemplateItem
  shown: AdminVersionItem | undefined
  name: string | null
  kind: string | null
}

async function mapLimited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      out[index] = await fn(items[index] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

/**
 * Danh sách quản trị của BE không có loại bản vẽ / tên nháp và không lọc hay tìm
 * được, nên màn đọc toàn bộ mẫu kèm phiên bản rồi lọc 2D/3D và tìm theo tên tại
 * chỗ (đã ghi vào danh sách thiếu gửi BE).
 */
async function loadRows(): Promise<LibraryRow[]> {
  const templates = await listAllLibraryTemplates()
  const rows = await mapLimited(templates, CONCURRENCY, async (template) => {
    const detail = await getTemplateVersions(template.templateId)
    const shown =
      detail.versions.find((version) => version.isCurrent) ??
      detail.versions.find((version) => version.state === 'Draft')
    return {
      template: { ...template, templateVersion: detail.templateVersion, isHidden: detail.isHidden },
      shown,
      name: shown?.name ?? template.currentName ?? null,
      kind: shown?.drawingKind ?? null
    }
  })
  // BE xóa bản nháp nhưng để lại "vỏ" mẫu không còn phiên bản nào: không có gì để xem/sửa nên không hiện.
  return rows.filter((row) => row.shown)
}

/**
 * THƯ VIỆN MẪU BẢN VẼ (STORY-LIB-001, BR-LIB-001) trên BMT API — MỘT màn cho cả
 * mẫu 2D và 3D (chung endpoint `/admin/library/templates`, chỉ khác `drawingKind`).
 * Lọc 2D / 3D bằng Segmented ngay trên bảng thay vì tách hai mục menu. Mỗi mẫu có
 * phiên bản: tạo mẫu là tạo nháp đầu tiên, công bố nháp để khách thấy; ẩn / hiện
 * lại không tạo phiên bản. Mẫu chưa chọn loại bản vẽ hiện ở mọi tab để không lạc.
 */
export function LibraryTemplateManager() {
  const t = useTranslations('admin')
  const l = useTranslations('admin.library')
  const { message, modal } = App.useApp()
  const floorLabel = useFloorLabel()
  const { data: classificationOptions } = useLibraryClassification()
  // Mẫu đang mở ở form Sửa (đọc lúc mở, dùng lúc Lưu để nối đúng `editVersion`).
  const editTarget = useRef<EditTarget | null>(null)
  const [activeKind, setActiveKind] = useState<'all' | DrawingKind>('all')
  const [progress, setProgress] = useState<CreateFlowProgress | null>(null)
  // Mẫu đang xem chi tiết (chỉ đọc).
  const [viewing, setViewing] = useState<LibraryRow | null>(null)
  const libraryError = useLibraryErrorMessage()

  const listKey = adminKeys.bmt('library', 'templates', activeKind)

  const classification = (version: AdminVersionItem | undefined) => {
    if (!version?.buildingTypeId) return <Text type='secondary'>-</Text>
    return (
      <Space size={4} wrap>
        <Tag>{version.buildingTypeName ?? version.buildingTypeId}</Tag>
        {version.floorCount ? <Tag>{floorLabel(version.floorCount)}</Tag> : null}
        {version.hasTum === true ? <Tag>{l('tumYes')}</Tag> : null}
        {version.hasTum === false ? <Tag>{l('tumNo')}</Tag> : null}
      </Space>
    )
  }

  const dimensions = (version: AdminVersionItem | undefined) =>
    version && (version.widthM || version.lengthM || version.areaM2)
      ? `${version.widthM ?? '?'} × ${version.lengthM ?? '?'} m · ${version.areaM2 ?? '?'} m²`
      : '-'

  /** Gom lỗi + tiến độ dùng chung cho Thêm và Sửa. */
  async function save(
    values: Record<string, unknown>,
    run: (
      content: ReturnType<typeof toTemplateContent>,
      sections: FormSection[],
      publish: boolean
    ) => Promise<SaveFlowResult>
  ) {
    const sections = normalizeSections(
      Array.isArray(values.sections) ? (values.sections as FormSection[]) : [],
      (index) => l('createFloorDefault', { index })
    )
    const publish = values.publishNow !== false
    try {
      const result = await run(toTemplateContent(values, classificationOptions), sections, publish)
      if (publish && !result.published && result.publishError) {
        message.warning(`${l('createNotPublished')} ${libraryError(result.publishError)}`, 10)
      }
      if (result.stillHidden) message.warning(l('publishedStillHidden'), 10)
      return result
    } catch (err) {
      if (!(err instanceof InitialContentError)) throw err
      // Mẫu đã lưu một phần: đóng form (để không tạo trùng / gỡ trùng) và chỉ đường mở Sửa để làm tiếp.
      message.warning(`${l('createImagesPartial', { count: err.missingFiles })} ${libraryError(err.reason)}`, 10)
      return null
    } finally {
      setProgress(null)
    }
  }

  return (
    <>
      <ApiResourceManager<LibraryRow>
        title={l('libraryTitle')}
        description={l('libraryDescription')}
        queryKey={listKey}
        searchable
        banner={
          <>
            <Segmented
              value={activeKind}
              onChange={(value) => setActiveKind(value as 'all' | DrawingKind)}
              options={[
                { value: 'all', label: l('kindAll') },
                { value: '2D', label: l('kind2d') },
                { value: '3D', label: l('kind3d') }
              ]}
              style={{ marginBottom: 16 }}
            />
          </>
        }
        fetchPage={async ({ pageIndex, pageSize, keyword }) => {
          const rows = await loadRows()
          const matching = rows.filter(
            (row) =>
              (activeKind === 'all' || row.kind === activeKind || row.kind === null) &&
              matchesKeyword(row.name, keyword)
          )
          return pageLocally(matching, pageIndex, pageSize)
        }}
        rowKey={(row) => row.template.templateId}
        drawerWidth={640}
        createValues={() => ({
          drawingKind: activeKind === 'all' ? undefined : activeKind,
          publishNow: true,
          sections: [newFormSection(l('createFloorDefault', { index: 1 }))]
        })}
        formatError={libraryError}
        // Thêm / Sửa là MỘT form: metadata + hình theo từng tầng + công bố. Các bước nối tiếp phía sau (mẫu →
        // section → tải tệp → ảnh đại diện → công bố) nằm trong `library-create-flow`; người dùng không thấy.
        onCreate={(values) =>
          save(values, (content, sections, publish) =>
            createTemplateWithSections(content, sections, { publish, onProgress: setProgress })
          )
        }
        toFormValues={async (row) => {
          const target = await loadEditTarget(row.template.templateId, newFormSectionKey)
          editTarget.current = target
          return {
            ...toContentFormValues(target.version),
            // Bản nháp chưa công bố thì mặc định công bố khi lưu; bản đang hiển thị sửa tại chỗ.
            publishNow: !target.version.isCurrent,
            sections: target.sections.length ? target.sections : [newFormSection(l('createFloorDefault', { index: 1 }))]
          }
        }}
        saveOptions={(row) =>
          // Chỉ mẫu đã có phiên bản hiện hành mới phát hành được phiên bản MỚI; mẫu nháp thì Lưu + công bố là đủ.
          row.template.currentVersionId
            ? [
                {
                  key: 'newVersion',
                  label: l('saveNewVersion'),
                  confirm: { title: l('saveNewVersionTitle'), content: l('saveNewVersionBody') }
                }
              ]
            : []
        }
        onUpdate={(values, _row, mode) => {
          const target = editTarget.current
          if (!target) return Promise.reject(new Error('LibraryVersionMissing'))
          if (mode === 'newVersion') {
            const sections = normalizeSections(
              Array.isArray(values.sections) ? (values.sections as FormSection[]) : [],
              (index) => l('createFloorDefault', { index })
            )
            return releaseNewVersion(
              target,
              toTemplateContent(values, classificationOptions),
              sections,
              newFormSectionKey,
              setProgress
            ).finally(() => setProgress(null))
          }
          return save(values, (content, sections, publish) =>
            updateTemplateWithSections(target, content, sections, { publish, onProgress: setProgress })
          )
        }}
        renderForm={(form, { item }) => (
          <>
            <Alert type='info' showIcon style={{ marginBottom: 16 }} title={l('createNote')} />
            <LibraryContentFields form={form} />
            <Form.Item name='sections' noStyle>
              <LibraryInitialSectionsField disabled={progress !== null} />
            </Form.Item>
            {item?.template.currentVersionId ? null : (
              <Form.Item name='publishNow' valuePropName='checked' extra={l('publishNowHint')}>
                <Checkbox disabled={progress !== null}>{l('publishNow')}</Checkbox>
              </Form.Item>
            )}
            {progress && progress.total > 0 ? (
              <Alert
                type='info'
                showIcon
                title={l('createUploading', { done: progress.done, total: progress.total })}
              />
            ) : null}
          </>
        )}
        rowActions={(row, ctx): RowAction[] => [
          {
            key: 'view',
            label: t('actions.view'),
            icon: <EyeOutlined />,
            disabled: !row.shown,
            onClick: () => setViewing(row)
          },
          {
            key: 'status',
            label: t('actions.switchStatus'),
            icon: <SwapOutlined />,
            onClick: () =>
              modal.confirm({
                title: t('actions.switchStatusTitle', { name: row.name ?? l('untitled') }),
                content: (
                  <div>
                    <div>
                      {t('actions.switchStatusBody', {
                        current: row.template.isHidden ? l('hidden') : l('shown'),
                        next: row.template.isHidden ? l('shown') : l('hidden')
                      })}
                    </div>
                    <Text type='secondary' style={{ display: 'block', marginTop: 8 }}>
                      {l('visibilityNote')}
                    </Text>
                  </div>
                ),
                okText: t('actions.confirm'),
                cancelText: t('actions.cancel'),
                onOk: async () => {
                  try {
                    await setTemplateVisibility(
                      row.template.templateId,
                      row.template.templateVersion,
                      !row.template.isHidden
                    )
                    message.success(t('feedback.saved'))
                  } catch (err) {
                    message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                  } finally {
                    await ctx.refresh()
                  }
                }
              })
          },
          {
            key: 'delete',
            // BE chỉ xoá được mẫu chưa công bố; mẫu đã công bố thì dùng Ẩn.
            label: row.template.currentVersionId ? l('deleteDisabled') : t('actions.delete'),
            icon: <DeleteOutlined />,
            danger: true,
            disabled: Boolean(row.template.currentVersionId) || !row.shown,
            onClick: () =>
              modal.confirm({
                title: l('deleteConfirmTitle', { name: row.name ?? l('untitled') }),
                content: l('deleteConfirmBody'),
                okText: t('actions.delete'),
                okButtonProps: { danger: true },
                cancelText: t('actions.cancel'),
                onOk: async () => {
                  try {
                    if (row.shown) {
                      await deleteTemplateDraft(row.template.templateId, row.shown.versionId, row.shown.editVersion)
                    }
                    message.success(t('feedback.deleted'))
                  } catch (err) {
                    message.error(libraryError(err))
                  } finally {
                    await ctx.refresh()
                  }
                }
              })
          }
        ]}
        columns={[
          {
            title: l('name'),
            key: 'name',
            render: (_, row) => (
              <Space orientation='vertical' size={2}>
                {row.name ? <Text strong>{row.name}</Text> : <Text type='secondary'>{l('untitled')}</Text>}
                {row.kind === null ? <StatusTag tone='warning'>{l('noDrawingKind')}</StatusTag> : null}
              </Space>
            )
          },
          { title: l('classification'), key: 'classification', render: (_, row) => classification(row.shown) },
          { title: l('dimensions'), key: 'dimensions', render: (_, row) => dimensions(row.shown) },
          {
            title: l('visibility'),
            key: 'status',
            width: 150,
            render: (_, row) =>
              !row.template.currentVersionId ? (
                <StatusTag tone='warning'>{l('notPublished')}</StatusTag>
              ) : row.template.isHidden ? (
                <StatusTag tone='off'>{l('hidden')}</StatusTag>
              ) : (
                <StatusTag tone='success'>{l('shown')}</StatusTag>
              )
          }
        ]}
      />
      <LibraryTemplateDetailDrawer
        target={
          viewing?.shown
            ? { templateId: viewing.template.templateId, isHidden: viewing.template.isHidden, version: viewing.shown }
            : null
        }
        onClose={() => setViewing(null)}
      />
    </>
  )
}
