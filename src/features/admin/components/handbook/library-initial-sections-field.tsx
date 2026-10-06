'use client'

import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { App, Button, Card, Input, Space, Tooltip, Typography, Upload, type UploadFile } from 'antd'
import { useTranslations } from 'next-intl'

import type { FormSection } from '../../api/bmt/library-create-flow'
import { LIBRARY_ACCEPT, checkFile } from '../../api/bmt/library-sections.logic'

const { Text } = Typography

interface FieldProps {
  value?: FormSection[]
  onChange?: (value: FormSection[]) => void
  disabled?: boolean
}

let counter = 0
export const newFormSectionKey = () => `form-section-${(counter += 1)}`

export const newFormSection = (name: string): FormSection => ({
  key: newFormSectionKey(),
  name,
  files: [],
  assets: [],
  removed: []
})

/**
 * Hình của mẫu theo từng tầng/phần, nhập ngay trong form Thêm / Sửa. Mỗi nhóm có TÊN (hiện cho khách như
 * "Tầng 1", "Tầng 2") và nhiều tệp. Tệp mới chỉ được giữ trong form, tải lên khi bấm Lưu; tệp đã lưu bỏ đi thì
 * gỡ khi bấm Lưu. Tầng đã lưu không xoá được (BE không có thao tác xoá section) — chỉ thay ảnh / đổi tên.
 */
export function LibraryInitialSectionsField({ value = [], onChange, disabled }: FieldProps) {
  const l = useTranslations('admin.library')
  const s = useTranslations('admin.library.sections')
  const { message } = App.useApp()

  const update = (key: string, patch: Partial<FormSection>) =>
    onChange?.(value.map((section) => (section.key === key ? { ...section, ...patch } : section)))

  const addFiles = (key: string, incoming: File[]) => {
    const section = value.find((item) => item.key === key)
    if (!section) return
    const accepted = incoming.filter((file) => {
      const problem = checkFile(file)
      if (problem) message.error(`${file.name}: ${s(`uploadErrors.${problem}`)}`)
      return problem === null
    })
    if (accepted.length) update(key, { files: [...section.files, ...accepted] })
  }

  const removeFile = (section: FormSection, uid: string) => {
    const saved = section.assets.find((asset) => asset.assetId === uid)
    if (saved) {
      update(section.key, {
        assets: section.assets.filter((asset) => asset.assetId !== uid),
        removed: [...section.removed, saved]
      })
      return
    }
    update(section.key, { files: section.files.filter((_, index) => `${section.key}-new-${index}` !== uid) })
  }

  const addSection = () => onChange?.([...value, newFormSection(l('createFloorDefault', { index: value.length + 1 }))])

  return (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{l('createImagesTitle')}</Text>
      <Text type='secondary' style={{ display: 'block', margin: '4px 0 12px', fontSize: 12 }}>
        {l('createImagesHint')}
      </Text>

      <Space orientation='vertical' size={12} style={{ width: '100%' }}>
        {value.map((section) => {
          const fileList: UploadFile[] = [
            ...section.assets.map(
              (asset): UploadFile => ({
                uid: asset.assetId,
                name: asset.name,
                status: 'done',
                url: asset.url,
                thumbUrl: asset.isImage ? asset.url : undefined
              })
            ),
            ...section.files.map(
              (file, index): UploadFile => ({
                uid: `${section.key}-new-${index}`,
                name: file.name,
                status: 'done',
                originFileObj: file as UploadFile['originFileObj']
              })
            )
          ]
          return (
            <Card
              key={section.key}
              size='small'
              title={
                <Input
                  value={section.name}
                  disabled={disabled}
                  placeholder={l('createFloorName')}
                  maxLength={120}
                  onChange={(event) => update(section.key, { name: event.target.value })}
                />
              }
              extra={
                <Tooltip title={section.sectionId ? l('createFloorSavedHint') : undefined}>
                  <Button
                    type='text'
                    danger
                    icon={<DeleteOutlined />}
                    disabled={disabled || Boolean(section.sectionId)}
                    aria-label={l('createFloorRemove')}
                    onClick={() => onChange?.(value.filter((item) => item.key !== section.key))}
                  />
                </Tooltip>
              }
            >
              <Upload
                multiple
                listType='picture'
                accept={LIBRARY_ACCEPT}
                fileList={fileList}
                disabled={disabled}
                // Giữ tệp trong form (không POST đi đâu): chỉ tải lên sau khi bấm Lưu.
                beforeUpload={(file, list) => {
                  if (file === list[0]) addFiles(section.key, list as File[])
                  return Upload.LIST_IGNORE
                }}
                onRemove={(file) => removeFile(section, file.uid)}
              >
                <Button icon={<UploadOutlined />} disabled={disabled}>
                  {l('addImage')}
                </Button>
              </Upload>
            </Card>
          )
        })}
        <Button icon={<PlusOutlined />} disabled={disabled} onClick={addSection}>
          {l('createFloorAdd')}
        </Button>
      </Space>
    </div>
  )
}
