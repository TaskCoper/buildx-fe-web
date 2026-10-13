'use client'
import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Typography
} from 'antd'
import { useMessages, useTranslations } from 'next-intl'
import { isApiError } from '@/shared/lib/api'
import { aiRulesApi, ruleContent, type RuleGroup, type RuleContent } from '../../api/bmt/ai-rules.api'
import { architectureOptions, ruleFields, ruleRowKey } from '../../services/ai-rule-fields'
import { BuildingTypeRules } from './building-type-rules'
import { AdminPage } from '../common/admin-page'
import { AiRuleHistory, AI_RULES_KEY } from './ai-rule-history'
export function AiRuleEditor() {
  const t = useTranslations('admin.aiRules'),
    p = useTranslations('admin.priceRules'),
    { message, modal } = App.useApp(),
    cache = useQueryClient()
  const valueLabels = useMessages().admin.aiRules.values as Record<string, string>
  const fieldLabels = useMessages().admin.aiRules.fields as Record<string, string>
  const groupLabels = useMessages().admin.aiRules.groups as Record<string, string>
  const label = (value: string) => valueLabels[value] ?? value
  const current = useQuery({
    queryKey: [...AI_RULES_KEY, 'current'],
    queryFn: aiRulesApi.current,
    refetchOnWindowFocus: false
  })
  const catalog = useQuery({ queryKey: [...AI_RULES_KEY, 'catalog'], queryFn: aiRulesApi.catalog })
  const [group, setGroup] = useState<RuleGroup>('baseTypes'),
    [draft, setDraft] = useState<{ version: number; content: RuleContent } | null>(null),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<{ text: string; conflict: boolean; fields: string[] } | null>(null),
    [edit, setEdit] = useState<number | null>(null),
    [form] = Form.useForm<Record<string, unknown>>()
  const selectedBuildingType = Form.useWatch('buildingTypeId', form)
  const pending = useRef<{ hash: string; key: string } | null>(null)
  const source = draft?.content ?? current.data?.content,
    version = draft?.version ?? current.data?.version,
    rows = source?.[group] ?? []
  function optionsFor(field: (typeof ruleFields)[RuleGroup][number]) {
    if (field.key === 'buildingTypeId')
      return catalog.data?.buildingTypes.map((item) => ({ value: item.id, label: item.name })) ?? []
    if (field.key === 'styleId')
      return [{ value: '', label: t('defaultRoof') }, ...architectureOptions(catalog.data, selectedBuildingType)]
    return (field.options ? (catalog.data?.[field.options] ?? []) : []).map((value) => ({ value, label: label(value) }))
  }
  function display(field: string, value: unknown) {
    if (field === 'buildingTypeId')
      return catalog.data?.buildingTypes.find((item) => item.id === value)?.name ?? String(value ?? '—')
    if (field === 'styleId')
      return value == null
        ? t('defaultRoof')
        : (catalog.data?.architectureStyles.find((item) => item.id === value)?.name ?? String(value))
    return typeof value === 'boolean' ? (value ? t('yes') : t('no')) : label(String(value ?? '—'))
  }
  function error(e: unknown) {
    setFailure({
      text: isApiError(e) ? e.message : p('loadError'),
      conflict: isApiError(e) && e.status === 409,
      fields: isApiError(e)
        ? Object.entries(e.errors ?? {}).flatMap(([field, values]) => values.map((value) => `${field}: ${value}`))
        : []
    })
  }
  function changeRows(values: unknown[]) {
    if (!source || version === undefined) return false
    const result = ruleContent.safeParse({ ...source, [group]: values })
    if (!result.success) {
      message.error(t('invalid'))
      return false
    }
    setDraft({ version, content: result.data })
    return true
  }
  function startEdit(index: number) {
    form.resetFields()
    const existing = rows[index]
    form.setFieldsValue(
      existing ??
        Object.fromEntries(
          ruleFields[group].map((field) => [
            field.key,
            field.optional ? null : field.kind === 'boolean' ? false : undefined
          ])
        )
    )
    setEdit(index)
  }
  async function applyEdit() {
    const values = await form.validateFields()
    const row: Record<string, unknown> = { ...rows[edit ?? -1], ...values }
    for (const field of ruleFields[group])
      if (field.optional && (row[field.key] === undefined || row[field.key] === '')) row[field.key] = null
    if (group === 'instructions' && !row.id) row.id = crypto.randomUUID()
    const updated: unknown[] = [...rows]
    if (edit === -1) updated.push(row)
    else if (edit !== null) updated[edit] = row
    if (changeRows(updated)) setEdit(null)
  }
  function switchGroup(value: string) {
    if (draft) {
      modal.confirm({
        title: t('switchTitle'),
        content: p('reloadConfirm'),
        onOk: () => {
          setDraft(null)
          setGroup(value as RuleGroup)
          setFailure(null)
        }
      })
    } else setGroup(value as RuleGroup)
  }
  async function save(restore?: number) {
    if (version === undefined || !source || !note.trim()) {
      message.warning(t('noteRequired'))
      return
    }
    const hash = JSON.stringify({ group, version, note, items: source[group], restore })
    if (pending.current?.hash !== hash) pending.current = { hash, key: crypto.randomUUID() }
    setBusy(true)
    setFailure(null)
    try {
      const result =
        restore === undefined
          ? await aiRulesApi.save(group, version, note.trim(), source[group], pending.current.key)
          : await aiRulesApi.restore(restore, version, note.trim(), pending.current.key)
      setDraft(null)
      setNote('')
      pending.current = null
      message.success(p('saved', { number: result.version }))
      await cache.invalidateQueries({ queryKey: AI_RULES_KEY })
    } catch (e) {
      error(e)
    } finally {
      setBusy(false)
    }
  }
  function reload() {
    modal.confirm({
      title: p('reload'),
      content: p('reloadConfirm'),
      onOk: async () => {
        const next = await current.refetch()
        if (next.isError) {
          error(next.error)
          return
        }
        setDraft(null)
        setFailure(null)
        setNote('')
        pending.current = null
      }
    })
  }
  return (
    <AdminPage title={t('title')} description={t('description')}>
      {current.isError || catalog.isError ? (
        <Alert
          type='error'
          title={p('loadError')}
          action={
            <Button
              onClick={() => {
                void current.refetch()
                void catalog.refetch()
              }}
            >
              {p('retry')}
            </Button>
          }
        />
      ) : null}
      {failure ? (
        <Alert
          showIcon
          type='error'
          title={failure.text}
          description={failure.fields.map((text, i) => (
            <div key={i}>{text}</div>
          ))}
          action={failure.conflict ? <Button onClick={reload}>{p('reload')}</Button> : undefined}
        />
      ) : null}
      <Tabs
        activeKey={group}
        onChange={switchGroup}
        items={Object.keys(ruleFields).map((key) => ({ key, label: groupLabels[key] ?? key, disabled: busy }))}
      />
      <Card
        loading={current.isPending || catalog.isPending}
        title={version ? p('version', { number: version }) : t('title')}
      >
        {group === 'baseTypes' && current.data && catalog.data ? (
          <BuildingTypeRules
            content={current.data.content}
            version={current.data.version}
            catalog={catalog.data}
            onSaved={async () => {
              await cache.invalidateQueries({ queryKey: AI_RULES_KEY })
            }}
          />
        ) : null}
        {group !== 'baseTypes' ? (
          <>
            {group === 'regionInstructions' ? (
              <Alert type='info' showIcon title={t('regionHelp')} className='mb-4' />
            ) : null}
            {
              <Button disabled={busy || !catalog.data || !source} onClick={() => startEdit(-1)}>
                {t('add')}
              </Button>
            }
            {group === 'roofRules' ? (
              <Typography.Paragraph type='secondary'>{t('catalogHelp')}</Typography.Paragraph>
            ) : null}
            <Table<Record<string, unknown>>
              size='small'
              dataSource={rows}
              rowKey={(row) => ruleRowKey(group, row)}
              scroll={{ x: 1000 }}
              columns={[
                ...ruleFields[group].map((field) => ({
                  title: fieldLabels[field.key] ?? field.key,
                  dataIndex: field.key,
                  ellipsis: true,
                  width: field.kind === 'text' || field.key === 'buildingTypeId' || field.key === 'styleId' ? 230 : 130,
                  render: (value: unknown) => display(field.key, value)
                })),
                {
                  title: p('actions'),
                  key: 'actions',
                  fixed: 'right',
                  width: 160,
                  render: (_, row) => (
                    <Space>
                      <Button size='small' disabled={busy} onClick={() => startEdit(rows.findIndex((x) => x === row))}>
                        {t('edit')}
                      </Button>
                      {
                        <Button
                          danger
                          size='small'
                          disabled={busy}
                          onClick={() =>
                            modal.confirm({
                              title: t('remove'),
                              content: t('removeConfirm'),
                              onOk: () => changeRows(rows.filter((x) => x !== row))
                            })
                          }
                        >
                          {t('remove')}
                        </Button>
                      }
                    </Space>
                  )
                }
              ]}
            />
            <label htmlFor='ai-rule-note'>{p('note')}</label>
            <Input.TextArea
              id='ai-rule-note'
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
              <Button disabled={busy} onClick={reload}>
                {p('reload')}
              </Button>
            </Space>
          </>
        ) : null}
        <Typography.Paragraph type='secondary'>{t('restoreHelp')}</Typography.Paragraph>
      </Card>
      <AiRuleHistory
        busy={busy || !source}
        onRestore={(number) =>
          modal.confirm({ title: p('restore'), content: t('restoreConfirm', { number }), onOk: () => save(number) })
        }
      />
      <Drawer
        open={edit !== null}
        title={edit === -1 ? t('add') : t('edit')}
        onClose={() => setEdit(null)}
        size='large'
        extra={
          <Button type='primary' onClick={() => void applyEdit()}>
            {t('apply')}
          </Button>
        }
      >
        <Form
          form={form}
          layout='vertical'
          onValuesChange={(changed) => {
            if ('buildingTypeId' in changed && group === 'roofRules') form.setFieldValue('styleId', null)
          }}
        >
          {ruleFields[group].map((field) => (
            <Form.Item
              key={field.key}
              name={field.key}
              label={fieldLabels[field.key] ?? field.key}
              valuePropName={field.kind === 'boolean' ? 'checked' : 'value'}
              rules={
                field.kind === 'boolean'
                  ? []
                  : [
                      { required: !field.optional, message: t('required') },
                      ...(field.max ? [{ max: field.max, message: t('max', { max: field.max }) }] : [])
                    ]
              }
            >
              {field.kind === 'boolean' ? (
                <Switch />
              ) : field.kind === 'number' ? (
                <InputNumber
                  style={{ width: '100%' }}
                  precision={field.key === 'maxFloors' || field.key === 'sortOrder' ? 0 : 2}
                />
              ) : field.kind === 'select' ? (
                <Select
                  allowClear={field.optional}
                  showSearch
                  optionFilterProp='label'
                  placeholder={field.key === 'styleId' ? t('defaultRoof') : undefined}
                  disabled={field.key === 'styleId' && !selectedBuildingType}
                  options={optionsFor(field)}
                />
              ) : (
                <Input.TextArea rows={field.key === 'topic' ? 1 : 4} maxLength={field.max} />
              )}
            </Form.Item>
          ))}
        </Form>
      </Drawer>
    </AdminPage>
  )
}
