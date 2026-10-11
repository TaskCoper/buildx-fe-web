'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Checkbox, Input, Select, Table, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { estimatePipelineAdminApi } from '../../api/bmt/estimate-pipeline.api'
import {
  changedRegionRows,
  PRICE_REGIONS,
  regionRowProblem,
  type PriceRegion,
  type PricingRegionRow
} from '../../api/bmt/estimate-pipeline.logic'
import { AdminPage } from '../common/admin-page'

const { Text } = Typography
const REGIONS_KEY = ['admin', 'estimate-pricing', 'regions'] as const

/**
 * MIỀN GIÁ THEO TỈNH (BR-PROJ-013, TDD-PROJ-008 mục G): mỗi tỉnh thuộc một miền Bắc, Trung hoặc Nam; tỉnh miền Trung
 * có thể đánh dấu Tây Nguyên. Giá trị được chụp vào đầu vào lúc chạy chặng 2D, nên đổi ở đây chỉ áp cho lần chạy sau.
 * Chỉ gửi những dòng đã đổi kèm phiên bản từng dòng; người khác vừa sửa cùng dòng thì báo tải lại. Cần quyền
 * `estimate.pricing.manage`.
 */
export function PricingRegionEditor() {
  const t = useTranslations('admin.pricingRegions')
  const tAdmin = useTranslations('admin')
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const regions = useQuery({ queryKey: REGIONS_KEY, queryFn: () => estimatePipelineAdminApi.getPricingRegions() })
  // Chỉ giữ phần đã sửa theo mã tỉnh; bảng hiển thị = dữ liệu BE + phần sửa (không chép dữ liệu BE vào state).
  const [edits, setEdits] = useState<Record<string, Pick<PricingRegionRow, 'region' | 'highland'>>>({})
  const [keyword, setKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  const rows = useMemo(
    () => (regions.data?.rows ?? []).map((row) => ({ ...row, ...edits[row.provinceCode] })),
    [edits, regions.data]
  )
  const changed = useMemo(() => changedRegionRows(regions.data?.rows ?? [], rows), [regions.data, rows])
  const problems = rows.filter((row) => regionRowProblem(row))
  const visible = rows.filter((row) => row.provinceName.toLowerCase().includes(keyword.trim().toLowerCase()))

  const update = (provinceCode: string, patch: Partial<Pick<PricingRegionRow, 'region' | 'highland'>>) => {
    const row = rows.find((item) => item.provinceCode === provinceCode)
    if (!row) return
    const next = { region: patch.region ?? row.region, highland: patch.highland ?? row.highland }
    // Dấu Tây Nguyên chỉ đi với miền Trung: đổi sang miền khác thì bỏ dấu.
    setEdits((current) => ({
      ...current,
      [provinceCode]: next.region !== 'Central' ? { ...next, highland: false } : next
    }))
  }

  async function save() {
    if (changed.length === 0 || problems.length > 0) return
    setSaving(true)
    try {
      await estimatePipelineAdminApi.savePricingRegions(changed)
      message.success(t('saved'))
      await queryClient.invalidateQueries({ queryKey: REGIONS_KEY })
      setEdits({})
    } catch (error) {
      if (isApiError(error) && (error.messageCode ?? error.code) === 'VersionConflict') {
        modal.confirm({
          title: t('conflictTitle'),
          content: t('conflictBody'),
          okText: t('reload'),
          onOk: () => queryClient.invalidateQueries({ queryKey: REGIONS_KEY })
        })
        return
      }
      message.error(isApiError(error) ? error.message : tAdmin('feedback.apiError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage
      title={tAdmin('nav.pricingRegions')}
      description={t('description')}
      sticky
      actions={
        <>
          <Button disabled={changed.length === 0} onClick={() => setEdits({})}>
            {t('discard')}
          </Button>
          <Button
            type='primary'
            loading={saving}
            disabled={changed.length === 0 || problems.length > 0}
            onClick={() => void save()}
          >
            {t('save', { count: changed.length })}
          </Button>
        </>
      }
    >
      {regions.isError ? (
        <Alert
          type='error'
          showIcon
          title={isApiError(regions.error) ? regions.error.message : tAdmin('feedback.apiError')}
          action={<Button onClick={() => void regions.refetch()}>{t('reload')}</Button>}
        />
      ) : null}
      {problems.length > 0 ? <Alert type='warning' showIcon title={t('problems', { count: problems.length })} /> : null}
      <div className='flex flex-wrap items-center gap-3'>
        <Input.Search
          allowClear
          placeholder={t('search')}
          style={{ maxWidth: 320 }}
          onChange={(event) => setKeyword(event.target.value)}
        />
        {regions.data?.tableVersion !== null && regions.data?.tableVersion !== undefined ? (
          <Text type='secondary'>{t('tableVersion', { version: regions.data.tableVersion })}</Text>
        ) : null}
      </div>
      <Table<PricingRegionRow>
        size='small'
        rowKey='provinceCode'
        loading={regions.isPending}
        dataSource={visible}
        pagination={false}
        columns={[
          { title: t('code'), dataIndex: 'provinceCode', width: 90 },
          { title: t('province'), dataIndex: 'provinceName' },
          {
            title: t('region'),
            key: 'region',
            width: 200,
            render: (_, row) => (
              <Select<PriceRegion>
                value={row.region ?? undefined}
                status={row.region ? undefined : 'error'}
                placeholder={t('choose')}
                style={{ width: 170 }}
                options={PRICE_REGIONS.map((region) => ({ value: region, label: t(`regions.${region}`) }))}
                onChange={(region) => update(row.provinceCode, { region })}
              />
            )
          },
          {
            title: t('highland'),
            key: 'highland',
            width: 140,
            render: (_, row) => (
              <Checkbox
                checked={row.highland}
                disabled={row.region !== 'Central'}
                onChange={(event) => update(row.provinceCode, { highland: event.target.checked })}
              />
            )
          },
          {
            title: '',
            key: 'state',
            width: 120,
            render: (_, row) =>
              changed.some((item) => item.provinceCode === row.provinceCode) ? (
                <Tag color='blue'>{t('edited')}</Tag>
              ) : null
          }
        ]}
      />
    </AdminPage>
  )
}
