'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import {
  estimatePipelineAdminApi,
  type PipelineRunFilters,
  type PipelineRunListItem
} from '../../api/bmt/estimate-pipeline.api'
import { PIPELINE_STAGES } from '../../api/bmt/estimate-pipeline.logic'

const states = ['Queued', 'Running', 'Succeeded', 'Failed', 'TimedOut'] as const
const colors: Record<string, string> = {
  Queued: 'gold',
  Running: 'blue',
  Succeeded: 'green',
  Failed: 'red',
  TimedOut: 'red'
}

export function PipelineRunList({ onSelect }: { onSelect: (run: PipelineRunListItem) => void }) {
  const t = useTranslations('admin.estimatePipeline')
  const tAdmin = useTranslations('admin')
  const locale = useLocale() as Locale
  const [filters, setFilters] = useState<PipelineRunFilters>({ search: '', pageIndex: 1, pageSize: 20 })
  const runs = useQuery({
    queryKey: ['admin', 'estimate-pipeline', 'runs', filters],
    queryFn: () => estimatePipelineAdminApi.listRuns(filters),
    refetchInterval: 15000
  })
  const date = (value: string | null) => (value ? formatDisplayDate(value, locale, { time: true }) : '—')
  return (
    <>
      <Space wrap>
        <Input.Search
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          allowClear
          maxLength={200}
          enterButton={t('search')}
          style={{ width: 'min(420px, 100%)' }}
          onSearch={(search) => setFilters((current) => ({ ...current, search: search.trim(), pageIndex: 1 }))}
        />
        <Select
          allowClear
          placeholder={t('allStages')}
          aria-label={t('allStages')}
          style={{ minWidth: 150 }}
          value={filters.stage}
          options={PIPELINE_STAGES.map((stage) => ({ value: stage, label: t(`stage.${stage}`) }))}
          onChange={(stage: string | undefined) => setFilters((current) => ({ ...current, stage, pageIndex: 1 }))}
        />
        <Select
          allowClear
          placeholder={t('allStates')}
          aria-label={t('allStates')}
          style={{ minWidth: 160 }}
          value={filters.state}
          options={states.map((state) => ({ value: state, label: t(`state.${state}`) }))}
          onChange={(state: string | undefined) => setFilters((current) => ({ ...current, state, pageIndex: 1 }))}
        />
        <Button loading={runs.isFetching} onClick={() => void runs.refetch()}>
          {t('refresh')}
        </Button>
      </Space>
      {runs.isError ? (
        <Alert
          type='error'
          showIcon
          title={isApiError(runs.error) ? runs.error.message : tAdmin('feedback.apiError')}
          action={<Button onClick={() => void runs.refetch()}>{t('refresh')}</Button>}
        />
      ) : (
        <Table<PipelineRunListItem>
          rowKey='runId'
          loading={runs.isFetching}
          dataSource={runs.data?.items ?? []}
          scroll={{ x: 1250 }}
          locale={{ emptyText: t('noMatchingRuns') }}
          pagination={{
            current: filters.pageIndex,
            pageSize: filters.pageSize,
            total: runs.data?.totalCount ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => t('totalRuns', { total }),
            onChange: (pageIndex, pageSize) =>
              setFilters((current) => ({
                ...current,
                pageIndex: pageSize === current.pageSize ? pageIndex : 1,
                pageSize
              }))
          }}
          columns={[
            {
              title: t('customer'),
              key: 'customer',
              width: 230,
              render: (_, run) => (
                <Space orientation='vertical' size={0}>
                  <Typography.Text>{run.customerName || run.customerEmail}</Typography.Text>
                  {run.customerName ? <Typography.Text type='secondary'>{run.customerEmail}</Typography.Text> : null}
                </Space>
              )
            },
            {
              title: t('project'),
              key: 'project',
              width: 300,
              render: (_, run) => (
                <Space orientation='vertical' size={0}>
                  <Typography.Text strong>{run.estimateName}</Typography.Text>
                  <Typography.Text type='secondary'>{run.estimateCode}</Typography.Text>
                  {run.estimateDeleted ? <Tag>{t('deletedProject')}</Tag> : null}
                </Space>
              )
            },
            {
              title: t('runStage'),
              dataIndex: 'stage',
              width: 140,
              render: (stage: PipelineRunListItem['stage']) => t(`stage.${stage}`)
            },
            {
              title: t('runState'),
              key: 'state',
              width: 170,
              render: (_, run) => (
                <Space orientation='vertical' size={0}>
                  <Tag color={colors[run.state]}>{t(`state.${run.state}`)}</Tag>
                  {run.failureCode ? <Typography.Text type='danger'>{run.failureCode}</Typography.Text> : null}
                </Space>
              )
            },
            { title: t('acceptedAt'), dataIndex: 'acceptedAtUtc', width: 175, render: date },
            { title: t('run.finishedAt'), dataIndex: 'finishedAtUtc', width: 175, render: date },
            {
              title: t('actions'),
              key: 'actions',
              fixed: 'right',
              width: 125,
              render: (_, run) => <Button onClick={() => onSelect(run)}>{t('viewDetails')}</Button>
            }
          ]}
        />
      )}
    </>
  )
}
