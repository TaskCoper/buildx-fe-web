'use client'

import { FileOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Drawer, Empty, Image, Skeleton, Space, Tag, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'

import type { AdminVersionItem } from '../../api/bmt/library.api'
import { loadEditTarget } from '../../api/bmt/library-create-flow'
import { adminKeys } from '../../api/admin.keys'
import { useFloorLabel } from '../catalog/use-floor-label'
import { useLibraryErrorMessage } from './library-error-message'

const { Text, Title } = Typography

interface LibraryTemplateDetailDrawerProps {
  /** Mẫu đang xem; `null` = đóng. */
  target: { templateId: string; isHidden: boolean; version: AdminVersionItem } | null
  onClose: () => void
}

/**
 * XEM CHI TIẾT một mẫu thư viện (chỉ đọc): thông tin chung của phiên bản đang hiển thị (hiện hành, chưa có thì nháp),
 * phong cách (3D) và toàn bộ hình / tệp theo từng mục. Dùng cùng bộ đọc với form Sửa nên số liệu khớp, nhưng không có
 * đường ghi nào — xem một mẫu là việc hay làm, không nên phải mở form Sửa (dễ bấm Lưu nhầm).
 */
export function LibraryTemplateDetailDrawer({ target, onClose }: LibraryTemplateDetailDrawerProps) {
  const l = useTranslations('admin.library')
  const d = useTranslations('admin.library.detail')
  const locale = useLocale()
  const floorLabel = useFloorLabel()
  const describeError = useLibraryErrorMessage()

  const detail = useQuery({
    queryKey: adminKeys.bmt('library', 'detail', target?.templateId, target?.version.versionId),
    queryFn: () => loadEditTarget(target!.templateId, (index) => String(index), target!.version.versionId),
    enabled: Boolean(target),
    staleTime: 0
  })

  const version = detail.data?.version ?? target?.version
  const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(locale) : '—')
  const dash = <Text type='secondary'>—</Text>

  const dimensions =
    version && (version.widthM || version.lengthM || version.areaM2)
      ? `${version.widthM ?? '?'} × ${version.lengthM ?? '?'} m · ${version.areaM2 ?? '?'} m²`
      : null

  return (
    <Drawer
      open={Boolean(target)}
      onClose={onClose}
      size={720}
      destroyOnHidden
      title={version?.name || l('untitled')}
      extra={
        version ? (
          <Space size={4}>
            {version.drawingKind ? <Tag color='blue'>{version.drawingKind}</Tag> : null}
            <Tag color={version.isCurrent ? 'green' : 'default'}>{version.isCurrent ? l('current') : l('draft')}</Tag>
            <Tag>{target?.isHidden ? l('hidden') : l('shown')}</Tag>
          </Space>
        ) : null
      }
    >
      {version ? (
        <div className='flex flex-col gap-6'>
          <Descriptions
            size='small'
            column={2}
            bordered
            items={[
              { key: 'building', label: l('classification'), children: version.buildingTypeName ?? dash },
              {
                key: 'floors',
                label: d('floors'),
                children: version.floorCount ? floorLabel(version.floorCount) : dash
              },
              {
                key: 'tum',
                label: l('tum'),
                children: version.hasTum === true ? l('tumYes') : version.hasTum === false ? l('tumNo') : dash
              },
              { key: 'size', label: l('dimensions'), children: dimensions ?? dash },
              {
                key: 'number',
                label: d('version'),
                children: version.number ? `#${version.number}` : l('notPublished')
              },
              { key: 'published', label: d('publishedAt'), children: date(version.publishedAtUtc) },
              { key: 'modified', label: d('modifiedAt'), children: date(version.modifiedAtUtc) },
              { key: 'assets', label: d('assetCount'), children: version.assetCount },
              ...(version.drawingKind === '3D'
                ? [
                    {
                      key: 'architecture',
                      label: d('architectureStyles'),
                      span: 2,
                      children: version.architectureStyles?.length
                        ? version.architectureStyles.map((style) => <Tag key={style.styleId}>{style.name}</Tag>)
                        : dash
                    },
                    {
                      key: 'interior',
                      label: d('interiorStyles'),
                      span: 2,
                      children: version.interiorStyles?.length
                        ? version.interiorStyles.map((style) => <Tag key={style.styleId}>{style.name}</Tag>)
                        : dash
                    }
                  ]
                : []),
              { key: 'description', label: d('description'), span: 2, children: version.description || dash }
            ]}
          />

          <section>
            <Title level={5} style={{ marginTop: 0 }}>
              {d('sections')}
            </Title>
            {detail.isPending ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : detail.isError ? (
              <Alert type='error' showIcon title={describeError(detail.error)} />
            ) : detail.data.sections.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={d('noSections')} />
            ) : (
              <div className='flex flex-col gap-5'>
                {detail.data.sections.map((section) => {
                  const images = section.assets.filter((asset) => asset.isImage)
                  const files = section.assets.filter((asset) => !asset.isImage)
                  return (
                    <div key={section.key} className='flex flex-col gap-2'>
                      <Text strong>
                        {section.name || l('untitled')}{' '}
                        <Text type='secondary' style={{ fontWeight: 400 }}>
                          ({d('fileCount', { count: section.assets.length })})
                        </Text>
                      </Text>
                      {images.length ? (
                        <Image.PreviewGroup>
                          <div className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
                            {images.map((asset) => (
                              <div key={asset.assetId} className='relative'>
                                <Image
                                  src={asset.url}
                                  alt={asset.name}
                                  width='100%'
                                  height={96}
                                  style={{ objectFit: 'cover', borderRadius: 6 }}
                                />
                                {asset.assetId === detail.data.coverAssetId ? (
                                  <Tag color='gold' className='absolute top-1 left-1' style={{ marginInlineEnd: 0 }}>
                                    {d('cover')}
                                  </Tag>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      ) : null}
                      {files.length ? (
                        <ul className='m-0 flex list-none flex-col gap-1 p-0'>
                          {files.map((asset) => (
                            <li key={asset.assetId}>
                              <FileOutlined />{' '}
                              <a href={asset.url} target='_blank' rel='noreferrer'>
                                {asset.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {section.assets.length === 0 ? <Text type='secondary'>{d('emptySection')}</Text> : null}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  )
}
