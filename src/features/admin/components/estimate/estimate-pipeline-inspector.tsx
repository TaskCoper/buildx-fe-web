'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography
} from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { PERMISSIONS, hasPermission, useAuth } from '@/shared/auth'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import { estimatePipelineAdminApi } from '../../api/bmt/estimate-pipeline.api'
import {
  canResetStage,
  PIPELINE_STAGES,
  runCostUsd,
  type AiCallRow,
  type RunRow
} from '../../api/bmt/estimate-pipeline.logic'
import { AdminPage } from '../common/admin-page'

const { Text, Paragraph } = Typography

const STATE_COLOR: Record<string, string> = {
  Succeeded: 'green',
  Failed: 'red',
  TimedOut: 'red',
  Running: 'blue',
  Queued: 'gold'
}

/**
 * CHI TIẾT LUỒNG AI của một bản dự toán (STORY-PROJ-012 ALT-01–03). Tìm theo mã `BUILDX-…`; xem từng lần chạy với mã
 * lỗi, model, phiên bản, token và chi phí ước tính. Đặt lại bộ đếm lỗi và xem nhật ký thô cần quyền vận hành
 * `estimate.pipeline.operate`; mỗi lần mở nhật ký thô đều được BE ghi lại người xem.
 */
export function EstimatePipelineInspector() {
  const t = useTranslations('admin.estimatePipeline')
  const tAdmin = useTranslations('admin')
  const locale = useLocale() as Locale
  const { user } = useAuth()
  const canOperate = hasPermission(user, PERMISSIONS.ESTIMATE_PIPELINE_OPERATE)
  const canInspect = hasPermission(user, PERMISSIONS.ESTIMATE_PIPELINE_INSPECT)
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [raw, setRaw] = useState<{ callId: string; content: unknown } | null>(null)

  const detail = useQuery({
    queryKey: ['admin', 'estimate-pipeline', 'detail', code],
    queryFn: () => estimatePipelineAdminApi.getPipelineDetail(code),
    enabled: Boolean(code) && canInspect,
    retry: false
  })

  const reset = useMutation({
    mutationFn: ({ estimateId, stage }: { estimateId: string; stage: string }) =>
      estimatePipelineAdminApi.resetStageFailures(estimateId, stage),
    onSuccess: async () => {
      message.success(t('resetDone'))
      await queryClient.invalidateQueries({ queryKey: ['admin', 'estimate-pipeline', 'detail', code] })
    },
    onError: (error) => message.error(isApiError(error) ? error.message : tAdmin('feedback.apiError'))
  })

  const openRaw = useMutation({
    mutationFn: (callId: string) => estimatePipelineAdminApi.getAiCallRaw(callId),
    onSuccess: (content, callId) => setRaw({ callId, content }),
    onError: (error) => message.error(isApiError(error) ? error.message : tAdmin('feedback.apiError'))
  })

  const date = (value: string | null) => (value ? formatDisplayDate(value, locale, { time: true }) : '—')

  const aiCallColumns = [
    { title: t('call.task'), dataIndex: 'task' },
    { title: t('call.model'), dataIndex: 'model' },
    { title: t('call.startedAt'), dataIndex: 'startedAtUtc', render: date },
    {
      title: t('call.duration'),
      dataIndex: 'durationMs',
      render: (value: number | null) => (value === null ? '—' : `${(value / 1000).toFixed(1)} s`)
    },
    {
      title: t('call.tokens'),
      key: 'tokens',
      render: (_: unknown, call: AiCallRow) => `${call.inputTokens ?? '—'} / ${call.outputTokens ?? '—'}`
    },
    { title: t('call.retries'), dataIndex: 'retries', render: (value: number | null) => value ?? '—' },
    {
      title: t('call.outcome'),
      key: 'outcome',
      render: (_: unknown, call: AiCallRow) => (
        <Space size={4} wrap>
          <Tag color={call.outcome === 'Ok' ? 'green' : 'red'}>{call.outcome || '—'}</Tag>
          {call.errorCode ? <Text type='danger'>{call.errorCode}</Text> : null}
        </Space>
      )
    },
    {
      title: t('call.cost'),
      dataIndex: 'estimatedCostUsd',
      render: (value: number | null) => (value === null ? '—' : `$${value.toFixed(4)}`)
    },
    ...(canOperate
      ? [
          {
            title: '',
            key: 'raw',
            render: (_: unknown, call: AiCallRow) =>
              call.hasRaw ? (
                <Button
                  size='small'
                  loading={openRaw.isPending && openRaw.variables === call.callId}
                  onClick={() => openRaw.mutate(call.callId)}
                >
                  {t('viewRaw')}
                </Button>
              ) : null
          }
        ]
      : [])
  ]

  const runPanel = (run: RunRow) => {
    const cost = runCostUsd(run)
    return {
      key: run.runId,
      label: (
        <Space wrap>
          <Text strong>{t(`stage.${run.stage as 'Plan2d'}`)}</Text>
          <Tag color={STATE_COLOR[run.state] ?? 'default'}>{run.state}</Tag>
          <Text type='secondary'>{date(run.acceptedAtUtc)}</Text>
          {run.failureCode ? <Text type='danger'>{run.failureCode}</Text> : null}
          {run.countsTowardLimit ? <Tag color='orange'>{t('counted')}</Tag> : null}
          {cost !== null ? <Text type='secondary'>${cost.toFixed(4)}</Text> : null}
        </Space>
      ),
      children: (
        <Space orientation='vertical' style={{ width: '100%' }}>
          <Descriptions
            size='small'
            column={{ xs: 1, md: 3 }}
            items={[
              { key: 'run', label: t('run.id'), children: <Text copyable>{run.runId}</Text> },
              { key: 'finished', label: t('run.finishedAt'), children: date(run.finishedAtUtc) },
              { key: 'version', label: t('run.pipelineVersion'), children: run.pipelineVersion ?? '—' },
              { key: 'config', label: t('run.configRevision'), children: run.configRevision ?? '—' },
              { key: 'rules', label: t('run.ruleSetRevision'), children: run.ruleSetRevision ?? '—' },
              { key: 'detail', label: t('run.failureDetail'), children: run.failureDetail ?? '—' }
            ]}
          />
          <Table
            size='small'
            rowKey='stepKey'
            pagination={false}
            dataSource={run.steps}
            locale={{ emptyText: t('noSteps') }}
            columns={[
              { title: t('step.key'), dataIndex: 'stepKey' },
              { title: t('step.attempt'), dataIndex: 'attempt', render: (value: number | null) => value ?? '—' },
              { title: t('step.model'), dataIndex: 'model', render: (value: string | null) => value ?? '—' },
              {
                title: t('step.promptVersion'),
                dataIndex: 'promptVersion',
                render: (value: string | null) => value ?? '—'
              },
              { title: t('step.completedAt'), dataIndex: 'completedAtUtc', render: date }
            ]}
          />
          <Table
            size='small'
            rowKey='callId'
            pagination={false}
            dataSource={run.aiCalls}
            locale={{ emptyText: t('noCalls') }}
            columns={aiCallColumns}
          />
        </Space>
      )
    }
  }

  const data = detail.data
  return (
    <AdminPage title={tAdmin('nav.estimatePipeline')} description={t('description')}>
      {!canInspect ? <Alert type='warning' showIcon title={t('needInspect')} /> : null}
      <Input.Search
        placeholder={t('searchPlaceholder')}
        enterButton={t('search')}
        allowClear
        style={{ maxWidth: 420 }}
        onSearch={(value) => setCode(value.trim())}
        disabled={!canInspect}
      />
      {detail.isError ? (
        <Alert
          type='error'
          showIcon
          title={isApiError(detail.error) ? detail.error.message : tAdmin('feedback.apiError')}
        />
      ) : null}
      {detail.isFetching && !data ? <Text type='secondary'>{t('loading')}</Text> : null}
      {data ? (
        <>
          <Card size='small'>
            <Descriptions
              size='small'
              column={{ xs: 1, md: 3 }}
              items={[
                { key: 'code', label: t('code'), children: data.code || code },
                { key: 'name', label: t('name'), children: data.name || '—' },
                { key: 'id', label: t('estimateId'), children: <Text copyable>{data.estimateId}</Text> }
              ]}
            />
          </Card>
          <Card size='small' title={t('stagesTitle')}>
            <Space wrap>
              {PIPELINE_STAGES.map((stage) => {
                const resettable = canResetStage(data.runs, stage)
                return (
                  <Space key={stage} size={4}>
                    <Text>{t(`stage.${stage}`)}</Text>
                    {canOperate ? (
                      <Button
                        size='small'
                        disabled={!resettable || !data.estimateId}
                        loading={reset.isPending && reset.variables?.stage === stage}
                        onClick={() =>
                          modal.confirm({
                            title: t('resetConfirmTitle', { stage: t(`stage.${stage}`) }),
                            content: t('resetConfirmBody'),
                            okText: t('reset'),
                            onOk: () => reset.mutateAsync({ estimateId: data.estimateId, stage })
                          })
                        }
                      >
                        {t('reset')}
                      </Button>
                    ) : null}
                  </Space>
                )
              })}
            </Space>
            {canOperate ? null : (
              <Paragraph type='secondary' style={{ margin: '8px 0 0' }}>
                {t('needOperate')}
              </Paragraph>
            )}
          </Card>
          {data.runs.length ? <Collapse items={data.runs.map(runPanel)} /> : <Empty description={t('noRuns')} />}
          {data.internal ? (
            <Card size='small' title={t('internal')}>
              <pre className='max-h-96 overflow-auto text-xs whitespace-pre-wrap'>
                {JSON.stringify(data.internal, null, 2)}
              </pre>
            </Card>
          ) : null}
        </>
      ) : null}

      <Modal
        open={raw !== null}
        title={t('rawTitle')}
        width={900}
        footer={null}
        onCancel={() => setRaw(null)}
        destroyOnHidden
      >
        <Paragraph type='secondary'>{t('rawAudited')}</Paragraph>
        <pre className='max-h-[60vh] overflow-auto text-xs whitespace-pre-wrap'>
          {raw ? JSON.stringify(raw.content, null, 2) : null}
        </pre>
      </Modal>
    </AdminPage>
  )
}
