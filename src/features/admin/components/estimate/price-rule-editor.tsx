'use client'
import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Input, InputNumber, Space, Table, Tabs, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { isApiError } from '@/shared/lib/api'
import {
  estimatePriceRulesApi as api,
  type PriceRuleKind,
  type PricePreview,
  type PriceRuleVersion
} from '../../api/bmt/estimate-price-rules.api'
import { AdminPage } from '../common/admin-page'
import { RevisionTextDiff } from './revision-text-diff'
const rootKey = ['admin', 'estimate-price-rules'] as const
export function PriceRuleEditor() {
  const t = useTranslations('admin.priceRules')
  const [kind, setKind] = useState<PriceRuleKind>('PriceFramework')
  return (
    <AdminPage title={t('title')} description={t('description')}>
      <Tabs
        activeKey={kind}
        onChange={(value) => setKind(value as PriceRuleKind)}
        items={(['PriceFramework', 'TakeoffRules'] as const).map((value) => ({
          key: value,
          label: t(value),
          children: <PriceRuleDraft kind={value} />
        }))}
      />
    </AdminPage>
  )
}
function PriceRuleDraft({ kind }: { kind: PriceRuleKind }) {
  const t = useTranslations('admin.priceRules'),
    { message, modal } = App.useApp(),
    cache = useQueryClient()
  const current = useQuery({ queryKey: [...rootKey, 'current'], queryFn: api.current, refetchOnWindowFocus: false })
  const source = current.data?.find((x) => x.kind === kind)
  const [draft, setDraft] = useState<{ version: number; content: string } | null>(null),
    [note, setNote] = useState('')
  const content = draft?.content ?? source?.content ?? '',
    expectedVersion = draft?.version ?? source?.number
  const [failure, setFailure] = useState<{ message: string; conflict: boolean; fields: string[] } | null>(null)
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<PricePreview | null>(null)
  const [page, setPage] = useState(1),
    [left, setLeft] = useState<number | null>(null),
    [right, setRight] = useState<number | null>(null)
  const history = useQuery({ queryKey: [...rootKey, kind, 'history', page], queryFn: () => api.versions(kind, page) })
  const before = useQuery({
    queryKey: [...rootKey, kind, 'version', left],
    queryFn: () => api.version(kind, left!),
    enabled: left !== null
  })
  const after = useQuery({
    queryKey: [...rootKey, kind, 'version', right],
    queryFn: () => api.version(kind, right!),
    enabled: right !== null
  })
  const revision = useRef(0),
    pending = useRef<{ hash: string; key: string } | null>(null)
  function mutationKey(hash: string) {
    if (pending.current?.hash !== hash) pending.current = { hash, key: crypto.randomUUID() }
    return pending.current.key
  }
  function error(e: unknown) {
    setFailure({
      message: isApiError(e) ? e.message : t('loadError'),
      conflict: isApiError(e) && e.status === 409,
      fields: isApiError(e)
        ? Object.entries(e.errors ?? {}).flatMap(([field, messages]) => messages.map((value) => `${field}: ${value}`))
        : []
    })
  }
  async function save(restoreNumber?: number) {
    if (expectedVersion === undefined || !note.trim()) return
    // Freeze the exact body/key across a transport retry. A newer server version never silently rebases the draft.
    const body =
      restoreNumber === undefined
        ? { expectedVersion, content, note: note.trim() }
        : { expectedVersion, note: note.trim() }
    const key = mutationKey(JSON.stringify({ kind, restoreNumber, body }))
    setBusy(true)
    setFailure(null)
    try {
      const result =
        restoreNumber === undefined
          ? await api.save(kind, { expectedVersion, content, note: note.trim() }, key)
          : await api.restore(kind, restoreNumber, { expectedVersion, note: note.trim() }, key)
      setDraft(null)
      setNote('')
      setPreview(null)
      pending.current = null
      revision.current++
      message.success(t('saved', { number: result.number }))
      if (result.warnings.length) message.warning(result.warnings.join(' · '))
      await cache.invalidateQueries({ queryKey: rootKey })
    } catch (e) {
      error(e)
    } finally {
      setBusy(false)
    }
  }
  async function showPreview() {
    const stamp = revision.current
    setBusy(true)
    setFailure(null)
    try {
      const result = await api.preview(content)
      if (stamp === revision.current) setPreview(result)
    } catch (e) {
      if (stamp === revision.current) error(e)
    } finally {
      setBusy(false)
    }
  }
  const reload = () =>
    modal.confirm({
      title: t('reload'),
      content: t('reloadConfirm'),
      onOk: async () => {
        const result = await current.refetch()
        if (result.isError) {
          error(result.error)
          return
        }
        setDraft(null)
        setNote('')
        setPreview(null)
        setFailure(null)
        pending.current = null
        revision.current++
      }
    })
  return (
    <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
      {current.isError || history.isError || before.isError || after.isError ? (
        <Alert
          type='error'
          showIcon
          title={t('loadError')}
          action={
            <Button
              onClick={() => {
                void current.refetch()
                void history.refetch()
                if (left !== null) void before.refetch()
                if (right !== null) void after.refetch()
              }}
            >
              {t('retry')}
            </Button>
          }
        />
      ) : null}
      {failure ? (
        <Alert
          type='error'
          showIcon
          title={failure.message}
          description={failure.fields.map((field, i) => (
            <div key={i}>{field}</div>
          ))}
          action={failure.conflict ? <Button onClick={reload}>{t('reload')}</Button> : undefined}
        />
      ) : null}
      <Card
        loading={current.isPending}
        title={source ? t('version', { number: expectedVersion ?? source.number }) : t(kind)}
      >
        {kind === 'PriceFramework' ? <Alert type='info' showIcon title={t('frameworkHelp')} className='mb-4' /> : null}
        <label htmlFor='price-rule-content'>{t('content')}</label>
        <Input.TextArea
          id='price-rule-content'
          value={content}
          disabled={!source || busy}
          rows={24}
          maxLength={200000}
          onChange={(e) => {
            setDraft({ version: expectedVersion!, content: e.target.value })
            revision.current++
            setPreview(null)
          }}
        />
        <label htmlFor='price-rule-note'>{t('note')}</label>
        <Input.TextArea
          id='price-rule-note'
          value={note}
          disabled={busy}
          maxLength={500}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
        />
        <Space wrap className='mt-3'>
          {kind === 'PriceFramework' ? (
            <Button disabled={!source || !content.trim()} loading={busy} onClick={() => void showPreview()}>
              {t('preview')}
            </Button>
          ) : null}
          <Button
            type='primary'
            loading={busy}
            disabled={!source || !content.trim() || !note.trim()}
            onClick={() => void save()}
          >
            {t('save')}
          </Button>
          <Button disabled={busy} onClick={reload}>
            {t('reload')}
          </Button>
        </Space>
      </Card>
      {preview ? (
        <Card title={t('bands')}>
          {preview.warnings.length ? (
            <Alert type='warning' title={preview.warnings.join(' · ')} className='mb-3' />
          ) : null}
          <Table
            dataSource={preview.bands}
            rowKey={(x) => `${x.priceType}:${x.part}:${x.package}`}
            scroll={{ x: 700 }}
            size='small'
            pagination={false}
            columns={[
              { title: t('priceType'), dataIndex: 'priceType' },
              { title: t('part'), dataIndex: 'part' },
              { title: t('package'), dataIndex: 'package' },
              {
                title: t('current'),
                key: 'current',
                render: (_, x) => `${x.currentLowTrM2 ?? '—'} – ${x.currentHighTrM2 ?? '—'}`
              },
              { title: t('new'), key: 'new', render: (_, x) => `${x.lowTrM2} – ${x.highTrM2}` }
            ]}
          />
        </Card>
      ) : null}
      <Card title={t('history')}>
        <Table<PriceRuleVersion>
          rowKey='versionId'
          dataSource={history.data?.items}
          loading={history.isPending}
          scroll={{ x: 780 }}
          pagination={{
            current: page,
            pageSize: 10,
            total: history.data?.totalCount,
            showSizeChanger: false,
            onChange: setPage
          }}
          columns={[
            { title: t('number'), dataIndex: 'number' },
            {
              title: t('date'),
              dataIndex: 'createdAtUtc',
              render: (value: string) => new Date(value).toLocaleString()
            },
            { title: t('author'), dataIndex: 'createdBy', render: (value: string | null) => value ?? t('seed') },
            { title: t('note'), dataIndex: 'note' },
            { title: t('restoredFrom'), dataIndex: 'restoredFromNumber' },
            {
              title: t('actions'),
              key: 'actions',
              render: (_, row) => (
                <Space>
                  <Button size='small' onClick={() => setLeft(row.number)}>
                    {t('before')}
                  </Button>
                  <Button size='small' onClick={() => setRight(row.number)}>
                    {t('after')}
                  </Button>
                  <Button
                    size='small'
                    disabled={busy || !note.trim() || !source}
                    onClick={() =>
                      modal.confirm({
                        title: t('restore'),
                        content: t('restoreConfirm', { number: row.number }),
                        onOk: () => save(row.number)
                      })
                    }
                  >
                    {t('restore')}
                  </Button>
                </Space>
              )
            }
          ]}
        />
        <Typography.Paragraph type='secondary'>{t('historyHelp')}</Typography.Paragraph>
        <Space wrap>
          <label>
            {t('before')} <InputNumber min={1} precision={0} value={left} onChange={setLeft} />
          </label>
          <label>
            {t('after')} <InputNumber min={1} precision={0} value={right} onChange={setRight} />
          </label>
        </Space>
        {before.data && after.data && !before.isError && !after.isError ? (
          <RevisionTextDiff before={before.data.content} after={after.data.content} />
        ) : null}
      </Card>
    </Space>
  )
}
