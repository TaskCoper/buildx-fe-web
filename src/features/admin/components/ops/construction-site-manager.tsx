'use client'

import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Descriptions, List, Spin, Typography } from 'antd'
import { useState } from 'react'
import { LocationMap } from '@/shared/components/common'
import { useFormatter, useLocale, useTranslations } from 'next-intl'

import type { ApiError } from '@/shared/types'
import { constructionSitesAdminApi } from '../../api/bmt/construction-sites.admin.api'
import {
  activeGrantCount,
  classifySiteError,
  formatCoordinates,
  formatSiteDecimal,
  type AdminSiteAttachment,
  grantTone,
  isKnownGrantState,
  mapLink,
  type AdminConstructionSite
} from '../../api/bmt/construction-sites.logic'
import { ApiResourceManager } from '../common/api-resource-manager'
import { StatusTag } from '../common/status-tag'

const { Text, Link } = Typography

/**
 * CÔNG TRÌNH (STORY-SITE-002) — CHỈ ĐỌC, góc nhìn nhân viên. Công trình do KHÁCH tạo và
 * quản lý ở tài khoản của họ; nhân viên, kể cả admin, chỉ xem để phân công gói giám sát
 * và biết gói nào đang gắn với công trình nào (BR-SITE-002, BR-SITE-003). Vì thế màn không
 * có tạo / sửa / xoá.
 *
 * Phạm vi thấy được do BE quyết theo quyền (`assignment.manage` → mọi công trình;
 * `supervision.complete` → chỉ công trình của gói mình phụ trách), màn chỉ hiển thị cái
 * BE trả về. API không có tìm kiếm / lọc nên màn cũng không có: lọc trong trang đã tải sẽ
 * làm con số phân trang sai.
 */
export function ConstructionSiteManager() {
  const t = useTranslations('admin')
  const c = useTranslations('admin.constructionSites')
  const format = useFormatter()

  const grantLabel = (state: string) => (isKnownGrantState(state) ? c(`grantStates.${state}`) : state)
  const dateTime = (iso: string | null) => {
    const date = iso ? new Date(iso) : null
    return date && !Number.isNaN(date.getTime())
      ? format.dateTime(date, { dateStyle: 'short', timeStyle: 'short' })
      : '—'
  }

  return (
    <ApiResourceManager<AdminConstructionSite>
      title={t('nav.constructionSites')}
      description={c('description')}
      queryKey={['admin', 'construction-sites']}
      banner={<Alert type='info' showIcon title={c('readOnlyNote')} />}
      fetchPage={async ({ pageIndex, pageSize }) => {
        try {
          return await constructionSitesAdminApi.list({ pageIndex, pageSize })
        } catch (error) {
          // Mọi lỗi "không có quyền" (kể cả công trình ngoài phạm vi) về MỘT câu dễ hiểu,
          // thay vì thông điệp thô của BE hiện trong ô rỗng của bảng.
          if (classifySiteError(error) === 'noPermission') {
            const friendly: ApiError = { status: 403, message: c('noPermission') }
            throw friendly
          }
          throw error
        }
      }}
      rowKey={(item) => item.constructionSiteId}
      drawerWidth={800}
      renderView={(item) => <SiteDetail item={item} />}
      columns={[
        {
          title: c('site'),
          key: 'site',
          render: (_, r) => (
            <div className='flex flex-col'>
              <Text strong>{r.name || '—'}</Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {r.address || '—'}
              </Text>
            </div>
          )
        },
        {
          title: c('owner'),
          key: 'owner',
          render: (_, r) =>
            r.owner ? (
              <div className='flex flex-col'>
                <Text>{r.owner.fullName || '—'}</Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {r.owner.email}
                </Text>
              </div>
            ) : (
              <Text type='secondary'>—</Text>
            )
        },
        {
          title: c('grants'),
          key: 'grants',
          render: (_, r) =>
            r.supervisionGrants.length ? (
              <div className='flex flex-wrap gap-y-1'>
                {r.supervisionGrants.map((grant, index) => (
                  <StatusTag key={grant.grantId || index} tone={grantTone(grant.state)}>
                    {grant.planName ? `${grant.planName} · ${grantLabel(grant.state)}` : grantLabel(grant.state)}
                  </StatusTag>
                ))}
              </div>
            ) : (
              <Text type='secondary'>{c('noGrants')}</Text>
            )
        },
        {
          title: c('updatedAt'),
          dataIndex: 'updatedAtUtc',
          width: 150,
          render: (_, r) => <Text style={{ fontSize: 13 }}>{dateTime(r.updatedAtUtc)}</Text>
        }
      ]}
    />
  )
}

/** Chi tiết một công trình: hiện ngay bản của danh sách, bản chi tiết (có thể mới hơn) thay thế khi về. */
function SiteDetail({ item }: { item: AdminConstructionSite }) {
  const c = useTranslations('admin.constructionSites')
  const locale = useLocale()
  const format = useFormatter()
  const detail = useQuery({
    queryKey: ['admin', 'construction-sites', item.constructionSiteId],
    queryFn: () => constructionSitesAdminApi.get(item.constructionSiteId),
    retry: false
  })

  const site = detail.data ?? item
  const errorKind = detail.isError ? classifySiteError(detail.error) : null

  const grantLabel = (state: string) => (isKnownGrantState(state) ? c(`grantStates.${state}`) : state)
  const dateTime = (iso: string | null) => {
    const date = iso ? new Date(iso) : null
    return date && !Number.isNaN(date.getTime())
      ? format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
      : '—'
  }
  const coordinates = formatCoordinates(site.latitude, site.longitude)
  const link = mapLink(site.latitude, site.longitude)

  if (detail.isPending) return <Spin size='small' />
  if (detail.isError)
    return (
      <Alert
        type='warning'
        showIcon
        title={c(errorKind === 'noPermission' ? 'noPermission' : errorKind === 'notFound' ? 'notFound' : 'loadError')}
        action={<Button onClick={() => void detail.refetch()}>{c('retry')}</Button>}
      />
    )

  return (
    <div className='flex flex-col gap-4'>
      <Descriptions
        size='small'
        column={1}
        bordered
        items={[
          { key: 'name', label: c('site'), children: site.name || '—' },
          { key: 'province', label: c('province'), children: site.provinceName || '—' },
          { key: 'ward', label: c('ward'), children: site.wardName || '—' },
          { key: 'street', label: c('street'), children: site.profile.addressDetail || '—' },
          { key: 'area', label: c('area'), children: `${formatSiteDecimal(site.profile.areaM2, locale)} m²` },
          { key: 'condition', label: c('condition'), children: site.conditionName || '—' },
          { key: 'budget', label: c('budget'), children: `${formatSiteDecimal(site.budgetVnd, locale)} ₫` },
          { key: 'start', label: c('plannedStart'), children: c(`startOptions.${site.plannedStart}`) },
          { key: 'type', label: c('buildingType'), children: site.buildingTypeName || '—' },
          {
            key: 'floors',
            label: c('floors'),
            children:
              site.profile.floorCount === null
                ? c('notApplicable')
                : c('floorCount', { count: site.profile.floorCount })
          },
          {
            key: 'tum',
            label: c('tum'),
            children: site.profile.hasTum === null ? c('notApplicable') : c(site.profile.hasTum ? 'hasTum' : 'noTum')
          },
          {
            key: 'architecture',
            label: c('architecture'),
            children: site.profile.architectureStyleId === null ? c('notApplicable') : site.architectureStyleName || '—'
          },
          {
            key: 'interior',
            label: c('interior'),
            children: site.profile.interiorStyleId === null ? c('notApplicable') : site.interiorStyleName || '—'
          },
          {
            key: 'source',
            label: c('source'),
            children: site.sourceEstimateId ? (
              <div className='flex min-w-0 flex-col gap-1'>
                <Text>{c('fromEstimate')}</Text>
                <Text copyable style={{ wordBreak: 'break-all' }}>
                  {site.sourceEstimateId}
                </Text>
                <Text type='secondary'>{c('sourceNote')}</Text>
              </div>
            ) : (
              c('independent')
            )
          },
          { key: 'owner', label: c('owner'), children: site.owner?.fullName || '—' },
          {
            key: 'email',
            label: c('email'),
            children: site.owner?.email ? <Text copyable>{site.owner.email}</Text> : '—'
          },
          ...(coordinates
            ? [
                {
                  key: 'coordinates',
                  label: c('coordinates'),
                  children: link ? (
                    <Link href={link} target='_blank' rel='noreferrer'>
                      {coordinates}
                    </Link>
                  ) : (
                    coordinates
                  )
                }
              ]
            : []),
          { key: 'activeGrants', label: c('activeGrants'), children: activeGrantCount(site) },
          { key: 'createdAt', label: c('createdAt'), children: dateTime(site.createdAtUtc) },
          { key: 'updatedAt', label: c('updatedAt'), children: dateTime(site.updatedAtUtc) }
        ]}
      />

      {coordinates ? (
        <section aria-label={c('map')} className='space-y-2'>
          <Text strong>{c('map')}</Text>
          <LocationMap latitude={site.latitude} longitude={site.longitude} />
        </section>
      ) : null}
      <section aria-label={c('files')} className='space-y-2'>
        <Text strong>
          {c('files')} ({site.files.length})
        </Text>
        <List
          size='small'
          bordered
          dataSource={site.files}
          locale={{ emptyText: c('noFiles') }}
          renderItem={(file) => (
            <List.Item>
              <SiteFile siteId={site.constructionSiteId} file={file} />
            </List.Item>
          )}
        />
      </section>

      <div>
        <Text strong>{c('grants')}</Text>
        <List
          size='small'
          bordered
          className='mt-2'
          dataSource={site.supervisionGrants}
          locale={{ emptyText: c('noGrants') }}
          renderItem={(grant) => (
            <List.Item>
              <div className='flex w-full flex-col gap-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Text strong>{grant.planName || '—'}</Text>
                  <StatusTag tone={grantTone(grant.state)}>{grantLabel(grant.state)}</StatusTag>
                </div>
                {grant.firstAssignedAtUtc ? (
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {c('firstAssignedAt')}: {dateTime(grant.firstAssignedAtUtc)}
                  </Text>
                ) : null}
                {grant.assignedAtUtc ? (
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {c('assignedAt')}: {dateTime(grant.assignedAtUtc)}
                  </Text>
                ) : null}
              </div>
            </List.Item>
          )}
        />
      </div>
    </div>
  )
}

function SiteFile({ siteId, file }: { siteId: string; file: AdminSiteAttachment }) {
  const c = useTranslations('admin.constructionSites')
  const format = useFormatter()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  async function download() {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      const blob = await constructionSitesAdminApi.download(siteId, file.id)
      if (blob.size !== file.sizeBytes) throw new Error('IncompleteDownload')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.originalName.replace(/[\\/\x00-\x1f]/g, '_')
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className='flex w-full min-w-0 flex-col gap-2'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <Text style={{ wordBreak: 'break-word' }}>{file.originalName}</Text>
          <div>
            <Text type='secondary'>
              {c(`fileGroups.${file.attachmentGroup}`)} ·{' '}
              {format.number(file.sizeBytes / 1_000_000, { maximumFractionDigits: 2 })} MB
            </Text>
          </div>
        </div>
        <Button loading={busy} onClick={() => void download()}>
          {c('download')}
        </Button>
      </div>
      {failed ? <Alert type='error' showIcon title={c('downloadError')} /> : null}
    </div>
  )
}
