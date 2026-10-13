'use client'
import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Input, Select, Space, Tag, Typography } from 'antd'
import { useMessages, useTranslations } from 'next-intl'
import { isApiError } from '@/shared/lib/api'
import { aiRulesApi } from '../../api/bmt/ai-rules.api'
import { AdminPage } from '../common/admin-page'
import { PromptTrialPanel } from './prompt-trial-panel'
import { promptTrialsApi } from '../../api/bmt/prompt-trials.api'
import { AiRuleHistory, AI_RULES_KEY } from './ai-rule-history'
export function AiPromptEditor() {
  const t = useTranslations('admin.aiPrompts'),
    errorLabels = useMessages().apiErrors.codes as Record<string, string>,
    p = useTranslations('admin.priceRules'),
    { message, modal } = App.useApp(),
    cache = useQueryClient()
  const query = useQuery({
    queryKey: [...AI_RULES_KEY, 'prompts'],
    queryFn: aiRulesApi.prompts,
    refetchOnWindowFocus: false
  })
  const [selection, setSelection] = useState<string | null>(null),
    [draft, setDraft] = useState<{ version: number; slots: { slotKey: string; text: string }[] } | null>(null),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<string | null>(null)
  const previewHash = useRef<string | null>(null)
  const pending = useRef<{ hash: string; key: string } | null>(null)
  const selected = query.data?.catalog.find((x) => x.code === (selection ?? query.data.catalog[0]?.code)),
    version = draft?.version ?? query.data?.version
  const slots =
    draft?.slots ??
    query.data?.parts
      .filter((x) => x.promptCode === selected?.code)
      .map((x) => ({ slotKey: x.slotKey, text: x.text })) ??
    []
  function select(code: string) {
    if (draft)
      modal.confirm({
        title: p('reload'),
        content: p('reloadConfirm'),
        onOk: () => {
          setDraft(null)
          previewHash.current = null
          setSelection(code)
          previewHash.current = null
          setFailure(null)
        }
      })
    else setSelection(code)
    previewHash.current = null
  }
  async function save(restore?: number, warned = false) {
    if (!selected || version === undefined || !note.trim()) return
    setBusy(true)
    if (restore === undefined && !warned && previewHash.current) {
      try {
        const latest = (await promptTrialsApi.list(selected.code, 1, previewHash.current)).items[0]
        if (latest && (latest.state === 'Failed' || latest.state === 'TimedOut')) {
          setBusy(false)
          modal.confirm({ title: t('trialWarning'), content: t('trialWarningHelp'), onOk: () => save(undefined, true) })
          return
        }
      } catch {
        setBusy(false)
        setFailure(p('loadError'))
        return
      }
    }
    const hash = JSON.stringify({ code: selected.code, version, slots, note, restore })
    if (pending.current?.hash !== hash) pending.current = { hash, key: crypto.randomUUID() }
    setBusy(true)
    setFailure(null)
    try {
      const result =
        restore === undefined
          ? await aiRulesApi.savePrompt(selected.code, version, note.trim(), slots, pending.current.key)
          : await aiRulesApi.restore(restore, version, note.trim(), pending.current.key, selected.code)
      setDraft(null)
      previewHash.current = null
      setNote('')
      pending.current = null
      message.success(p('saved', { number: result.version }))
      for (const warning of result.warnings) message.warning(errorLabels[warning] ?? warning)
      await cache.invalidateQueries({ queryKey: AI_RULES_KEY })
    } catch (e) {
      setFailure(
        isApiError(e)
          ? [
              e.message,
              ...Object.entries(e.errors ?? {}).flatMap(([key, values]) => values.map((value) => `${key}: ${value}`))
            ].join('\n')
          : p('loadError')
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <AdminPage title={t('title')} description={t('description')}>
      {query.isError ? (
        <Alert
          type='error'
          title={p('loadError')}
          action={<Button onClick={() => void query.refetch()}>{p('retry')}</Button>}
        />
      ) : null}
      {failure ? <Alert type='error' showIcon title={failure} /> : null}
      <Select
        aria-label={t('select')}
        value={selected?.code}
        disabled={busy}
        style={{ width: '100%' }}
        showSearch
        onChange={select}
        options={query.data?.catalog.map((x) => ({ value: x.code, label: `${x.stage} · ${x.code}` }))}
      />
      <Card loading={query.isPending} title={version ? p('version', { number: version }) : t('title')}>
        <Typography.Paragraph>
          {t('affected')}{' '}
          {selected?.affectedTasks.map((task) => (
            <Tag key={task}>{task}</Tag>
          ))}
        </Typography.Paragraph>
        {selected?.slots.map((slot) => (
          <div key={slot.slotKey} className='mb-5'>
            <label htmlFor={`slot-${slot.slotKey}`}>
              <Typography.Text strong>{slot.slotKey}</Typography.Text>
            </label>
            <Typography.Paragraph type='secondary'>
              {slot.requiredVariables.length
                ? t('variables', { variables: slot.requiredVariables.map((x) => `{${x}}`).join(', ') })
                : t('noVariables')}{' '}
              {slot.allowEmpty ? t('optional') : t('required')}
            </Typography.Paragraph>
            <Input.TextArea
              id={`slot-${slot.slotKey}`}
              rows={6}
              disabled={busy}
              value={slots.find((x) => x.slotKey === slot.slotKey)?.text ?? ''}
              onChange={(e) => {
                if (version === undefined) return
                const updated = slots.some((x) => x.slotKey === slot.slotKey)
                  ? slots.map((x) => (x.slotKey === slot.slotKey ? { ...x, text: e.target.value } : x))
                  : [...slots, { slotKey: slot.slotKey, text: e.target.value }]
                previewHash.current = null
                setDraft({ version, slots: updated })
              }}
            />
          </div>
        ))}
        <label htmlFor='ai-prompt-note'>{p('note')}</label>
        <Input.TextArea
          id='ai-prompt-note'
          rows={2}
          maxLength={500}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
        />
        <Space wrap className='mt-3'>
          <Button type='primary' loading={busy} disabled={!draft || !note.trim()} onClick={() => void save()}>
            {p('save')}
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              modal.confirm({
                title: p('reload'),
                content: p('reloadConfirm'),
                onOk: async () => {
                  const result = await query.refetch()
                  if (!result.isError) {
                    setDraft(null)
                    previewHash.current = null
                    setNote('')
                    setFailure(null)
                    pending.current = null
                  }
                }
              })
            }
          >
            {p('reload')}
          </Button>
        </Space>
        <Typography.Paragraph type='secondary'>{t('restoreHelp')}</Typography.Paragraph>
      </Card>
      {selected && version !== undefined ? (
        <PromptTrialPanel
          key={selected.code}
          code={selected.code}
          version={version}
          slots={slots}
          busy={busy}
          onPreview={(hash) => {
            previewHash.current = hash
          }}
        />
      ) : null}
      <AiRuleHistory
        promptCode={selected?.code}
        busy={busy || !selected || !note.trim()}
        onRestore={(number) =>
          modal.confirm({ title: p('restore'), content: t('restoreConfirm', { number }), onOk: () => save(number) })
        }
      />
    </AdminPage>
  )
}
