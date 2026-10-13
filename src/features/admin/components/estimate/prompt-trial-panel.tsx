'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Collapse, Image, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { useMessages, useTranslations } from 'next-intl'
import { isApiError } from '@/shared/lib/api'
import {
  promptTrialsApi as api,
  type PromptPreview,
  type PromptTrial,
  type PromptTrialInput
} from '../../api/bmt/prompt-trials.api'
const historyKey = ['admin', 'prompt-trials'] as const
export function PromptTrialPanel({
  code,
  version,
  slots,
  busy,
  onPreview
}: {
  code: string
  version: number
  slots: { slotKey: string; text: string }[]
  busy: boolean
  onPreview: (hash: string | null) => void
}) {
  const t = useTranslations('admin.promptTrials'),
    p = useTranslations('admin.priceRules'),
    { modal } = App.useApp(),
    cache = useQueryClient()
  const caseLabels = useMessages().admin.promptTrials.cases as Record<string, string>
  const stateLabels = useMessages().admin.promptTrials.states as Record<string, string>
  const errorLabels = useMessages().apiErrors.codes as Record<string, string>
  const fixtures = useQuery({ queryKey: [...historyKey, 'fixtures', code], queryFn: () => api.fixtures(code) })
  const [caseCode, setCase] = useState<string | null>(null),
    [fixtureId, setFixture] = useState<string | null>(null),
    [working, setWorking] = useState(false),
    [error, setError] = useState<string | null>(null),
    [snapshot, setSnapshot] = useState<{ inputKey: string; value: PromptPreview } | null>(null),
    [page, setPage] = useState(1)
  const [trialId, setTrial] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : new URL(window.location.href).searchParams.get('trial')
  )
  const source = fixtures.data?.find((x) => x.id === (fixtureId ?? fixtures.data[0]?.id)),
    selectedCase = source?.cases.includes(caseCode ?? '') ? caseCode : source?.cases[0]
  const input: PromptTrialInput = {
    expectedVersion: version,
    slots,
    fixtureId: source?.id ?? '',
    fixtureVersion: source?.version ?? '',
    caseCode: selectedCase ?? ''
  }
  const inputKey = JSON.stringify({ code, ...input }),
    latest = useRef(inputKey)
  useLayoutEffect(() => {
    latest.current = inputKey
    return () => {
      latest.current = ''
    }
  }, [inputKey])
  const preview = snapshot?.inputKey === inputKey ? snapshot.value : null,
    pending = useRef<{ hash: string; key: string } | null>(null)
  const history = useQuery({
    queryKey: [...historyKey, code, page],
    queryFn: () => api.list(code, page),
    refetchInterval: (q) =>
      q.state.data?.items.some((x) => x.state === 'Queued' || x.state === 'Running') ? 2000 : false
  })
  const detail = useQuery({
    queryKey: [...historyKey, 'detail', trialId],
    queryFn: () => api.detail(trialId!),
    enabled: !!trialId,
    refetchInterval: (q) =>
      q.state.data?.trial.state === 'Queued' || q.state.data?.trial.state === 'Running' ? 2000 : false
  })
  const result = useQuery({
    queryKey: [...historyKey, 'result', trialId],
    queryFn: () => api.result(trialId!),
    enabled: !!trialId && !!detail.data?.resultContentType,
    retry: false,
    staleTime: 0
  })
  function open(id: string) {
    setTrial(id)
    const url = new URL(window.location.href)
    url.searchParams.set('trial', id)
    window.history.replaceState(null, '', url)
  }
  function fail(e: unknown) {
    setError(isApiError(e) ? e.message : p('loadError'))
  }
  async function showPreview() {
    const key = inputKey
    setWorking(true)
    setError(null)
    try {
      const value = await api.preview(code, input)
      if (latest.current === key) {
        setSnapshot({ inputKey: key, value })
        onPreview(value.previewHash)
      }
    } catch (e) {
      if (latest.current === key) fail(e)
    } finally {
      setWorking(false)
    }
  }
  async function start() {
    if (!preview) return
    const hash = preview.previewHash
    if (pending.current?.hash !== hash) pending.current = { hash, key: crypto.randomUUID() }
    setWorking(true)
    setError(null)
    try {
      const accepted = await api.start(code, input, hash, pending.current.key)
      pending.current = null
      open(accepted.trialId)
      await cache.invalidateQueries({ queryKey: historyKey })
    } catch (e) {
      fail(e)
    } finally {
      setWorking(false)
    }
  }
  function run() {
    if (preview?.request.mode === 'Live')
      modal.confirm({ title: t('liveTitle'), content: t('liveConfirm'), okText: t('run'), onOk: start })
    else void start()
  }
  return (
    <Card title={t('title')}>
      <Typography.Paragraph>{t('help')}</Typography.Paragraph>
      {error || fixtures.isError ? (
        <Alert
          type='error'
          title={error ?? p('loadError')}
          action={<Button onClick={() => void fixtures.refetch()}>{p('retry')}</Button>}
        />
      ) : null}
      <Space wrap className='mb-3'>
        <Select
          aria-label={t('fixture')}
          value={source?.id}
          disabled={busy || working}
          style={{ minWidth: 280 }}
          options={fixtures.data?.map((x) => ({ value: x.id, label: x.name }))}
          onChange={(value) => {
            setFixture(value)
            setCase(null)
            onPreview(null)
          }}
        />
        <Select
          aria-label={t('case')}
          value={selectedCase}
          disabled={busy || working}
          style={{ minWidth: 230 }}
          options={source?.cases.map((x) => ({ value: x, label: caseLabels[x] ?? x }))}
          onChange={(value) => {
            setCase(value)
            onPreview(null)
          }}
        />
        <Button loading={working} disabled={busy || !source} onClick={() => void showPreview()}>
          {t('preview')}
        </Button>
        <Button type='primary' disabled={busy || working || !preview || preview.request.mode === 'Off'} onClick={run}>
          {t('run')}
        </Button>
      </Space>
      {snapshot && !preview ? <Alert type='info' title={t('stale')} /> : null}
      {preview ? (
        <>
          <Tag color={preview.request.mode === 'Live' ? 'orange' : 'blue'}>{preview.request.mode}</Tag>
          <Typography.Paragraph type='secondary'>
            {t('sources', { version: preview.ruleVersion, fixture: preview.fixture.version })} ·{' '}
            {preview.executorVersion}
          </Typography.Paragraph>
          <Collapse
            items={[
              {
                key: 'prompt',
                label: t('prompt'),
                children: (
                  <>
                    <Typography.Text strong>{t('system')}</Typography.Text>
                    <Input.TextArea readOnly rows={8} value={preview.request.systemPrompt} />
                    <Typography.Text strong>{t('user')}</Typography.Text>
                    <Input.TextArea readOnly rows={12} value={preview.request.userText} />
                  </>
                )
              },
              {
                key: 'schema',
                label: t('schema'),
                children: (
                  <Input.TextArea
                    readOnly
                    rows={12}
                    value={preview.request.schemaJson ?? preview.request.qualitySchema ?? t('imageSchema')}
                  />
                )
              },
              {
                key: 'source',
                label: t('references'),
                children: (
                  <>
                    <pre className='overflow-auto whitespace-pre-wrap'>
                      {JSON.stringify(
                        {
                          fixture: preview.fixture,
                          configRevisionId: preview.configRevisionId,
                          ruleSetRevisionId: preview.ruleSetRevisionId,
                          priceFrameworkVersionId: preview.priceFrameworkVersionId,
                          takeoffRulesVersionId: preview.takeoffRulesVersionId,
                          images: preview.request.images,
                          matchedInstructions: preview.matchedInstructions
                        },
                        null,
                        2
                      )}
                    </pre>
                  </>
                )
              }
            ]}
          />
        </>
      ) : null}
      <Typography.Title level={5}>{t('history')}</Typography.Title>
      {history.isError ? (
        <Alert
          type='error'
          title={p('loadError')}
          action={<Button onClick={() => void history.refetch()}>{p('retry')}</Button>}
        />
      ) : null}
      <Table<PromptTrial>
        size='small'
        rowKey='trialId'
        loading={history.isPending}
        dataSource={history.data?.items}
        pagination={{
          current: page,
          pageSize: 10,
          total: history.data?.totalCount,
          onChange: setPage,
          showSizeChanger: false
        }}
        columns={[
          { title: t('created'), dataIndex: 'createdAtUtc', render: (x: string) => new Date(x).toLocaleString() },
          { title: t('case'), dataIndex: 'caseCode', render: (x: string) => caseLabels[x] ?? x },
          { title: t('state'), dataIndex: 'state', render: (x: string) => stateLabels[x] ?? x },
          {
            title: p('actions'),
            render: (_, row) => (
              <Button size='small' onClick={() => open(row.trialId)}>
                {t('view')}
              </Button>
            )
          }
        ]}
      />
      {detail.isError ? (
        <Alert
          type='error'
          title={p('loadError')}
          action={<Button onClick={() => void detail.refetch()}>{p('retry')}</Button>}
        />
      ) : null}
      {detail.data ? (
        <Card size='small' title={t('result')}>
          <Tag>{detail.data.mode}</Tag>
          <Tag>{stateLabels[detail.data.trial.state]}</Tag>
          <Typography.Paragraph>
            {t('cost')}:{' '}
            {detail.data.estimatedCostUsd === null ? t('unknownCost') : `$${detail.data.estimatedCostUsd.toFixed(6)}`}
          </Typography.Paragraph>
          {detail.data.mode === 'Fake' ? <Alert type='info' title={t('fake')} /> : null}
          {preview?.previewHash !== detail.data.trial.previewHash ? (
            <Alert type='info' title={t('differentDraft')} />
          ) : null}
          {detail.data.trial.failureCode ? (
            <Alert type='error' title={errorLabels[detail.data.trial.failureCode] ?? detail.data.trial.failureCode} />
          ) : null}
          {detail.data.validation ? (
            <Alert
              type={detail.data.validation.passed ? 'success' : 'warning'}
              title={detail.data.validation.passed ? t('structurePassed') : t('validationFailed')}
              description={detail.data.validation.errors.join('\n')}
            />
          ) : null}
          {detail.data.text ? <Input.TextArea readOnly rows={12} value={detail.data.text} /> : null}
          {result.data?.contentType.startsWith('image/') ? (
            <Image alt={t('result')} src={result.data.fileUrl} style={{ maxHeight: 500, objectFit: 'contain' }} />
          ) : null}
          {result.data ? (
            <Button href={result.data.fileUrl} target='_blank' rel='noopener noreferrer'>
              {t('download')}
            </Button>
          ) : null}
          {result.isError ? <Button onClick={() => void result.refetch()}>{p('retry')}</Button> : null}
          <Typography.Paragraph type='secondary'>{t('qualityHelp')}</Typography.Paragraph>
          <pre className='overflow-auto whitespace-pre-wrap'>{JSON.stringify(detail.data.calls, null, 2)}</pre>
        </Card>
      ) : null}
    </Card>
  )
}
