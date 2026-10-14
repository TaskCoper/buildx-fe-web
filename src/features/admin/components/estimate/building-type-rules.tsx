'use client'

import { useRef, useState } from 'react'
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
  Tag,
  Typography
} from 'antd'
import { useMessages, useTranslations } from 'next-intl'
import { isApiError } from '@/shared/lib/api'
import { aiRulesApi, baseTypesRow, roofRulesRow, type RuleCatalog, type RuleContent } from '../../api/bmt/ai-rules.api'
import { architectureOptions, ruleFields, type RuleField } from '../../services/ai-rule-fields'

type TypeOption = RuleCatalog['buildingTypes'][number]
type Editing = { type: TypeOption; version: number; content: RuleContent }
type Values = { baseType: RuleContent['baseTypes'][number]; roofRules: RuleContent['roofRules']; note: string }

function blank(fields: RuleField[]) {
  return Object.fromEntries(
    fields.map((field) => [field.key, field.optional ? null : field.kind === 'boolean' ? false : undefined])
  )
}

export function BuildingTypeRules({
  content,
  version,
  catalog,
  onSaved
}: {
  content: RuleContent
  version: number
  catalog: RuleCatalog
  onSaved: () => Promise<void>
}) {
  const t = useTranslations('admin.aiRules'),
    p = useTranslations('admin.priceRules')
  const labels = useMessages().admin.aiRules.fields as Record<string, string>
  const reasons = useMessages().admin.aiRules.missingReasons as Record<string, string>
  const values = useMessages().admin.aiRules.values as Record<string, string>
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<Values>()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<{ text: string; fields: string[]; conflict: boolean } | null>(null)
  const saving = useRef(false)
  const pending = useRef<{ hash: string; key: string } | null>(null)

  function open(type: TypeOption, data = content, currentVersion = version) {
    form.resetFields()
    const base = data.baseTypes.find((row) => row.buildingTypeId === type.id)
    const roofs = data.roofRules.filter((row) => row.buildingTypeId === type.id)
    form.setFieldsValue({
      baseType: { ...blank(ruleFields.baseTypes), ...base, buildingTypeId: type.id },
      roofRules: [
        {
          ...blank(ruleFields.roofRules),
          ...roofs.find((row) => !row.styleId),
          buildingTypeId: type.id,
          styleId: null
        },
        ...roofs.filter((row) => row.styleId)
      ] as Values['roofRules'],
      note: ''
    })
    setEditing({ type, version: currentVersion, content: data })
    setFailure(null)
    pending.current = null
  }
  function close() {
    if (busy) return
    if (form.isFieldsTouched()) modal.confirm({ title: t('discardTitle'), onOk: () => setEditing(null) })
    else setEditing(null)
  }
  function copyFrom(id: string) {
    if (!editing) return
    const apply = () => {
      const base = editing.content.baseTypes.find((row) => row.buildingTypeId === id)
      const roof = editing.content.roofRules.find((row) => row.buildingTypeId === id && !row.styleId)
      if (!base || !roof) return
      form.setFieldValue('baseType', { ...base, buildingTypeId: editing.type.id })
      form.setFieldValue(['roofRules', 0], { ...roof, buildingTypeId: editing.type.id, styleId: null })
    }
    modal.confirm({ title: t('copyConfirm'), onOk: apply })
  }
  async function save() {
    if (!editing || saving.current) return
    let data: Values
    try {
      data = await form.validateFields()
    } catch {
      return
    }
    saving.current = true
    setBusy(true)
    setFailure(null)
    try {
      const configuration = {
        baseType: baseTypesRow.parse({ ...data.baseType, buildingTypeId: editing.type.id }),
        roofRules: data.roofRules.map((row, index) =>
          roofRulesRow.parse({ ...row, buildingTypeId: editing.type.id, styleId: index === 0 ? null : row.styleId })
        )
      }
      const note = data.note.trim()
      const hash = JSON.stringify({ id: editing.type.id, version: editing.version, note, configuration })
      if (pending.current?.hash !== hash) pending.current = { hash, key: crypto.randomUUID() }
      const result = await aiRulesApi.saveBuildingType(
        editing.type.id,
        editing.version,
        note,
        configuration,
        pending.current.key
      )
      message.success(p('saved', { number: result.version }))
      setEditing(null)
      await onSaved()
    } catch (error) {
      setFailure({
        text: isApiError(error) ? error.message : p('loadError'),
        conflict: isApiError(error) && error.status === 409,
        fields: isApiError(error)
          ? Object.entries(error.errors ?? {}).flatMap(([field, errors]) => errors.map((text) => `${field}: ${text}`))
          : []
      })
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  function reload() {
    if (!editing) return
    modal.confirm({
      title: p('reload'),
      content: p('reloadConfirm'),
      onOk: async () => {
        try {
          const next = await aiRulesApi.current()
          open(editing.type, next.content, next.version)
          await onSaved()
        } catch (error) {
          setFailure({ text: isApiError(error) ? error.message : p('loadError'), conflict: true, fields: [] })
        }
      }
    })
  }
  function field(field: RuleField, name: (string | number)[]) {
    return (
      <Form.Item
        key={name.join('.')}
        name={name}
        label={labels[field.key] ?? field.key}
        valuePropName={field.kind === 'boolean' ? 'checked' : 'value'}
        rules={
          field.kind === 'boolean'
            ? []
            : [
                {
                  required: !field.optional,
                  type: field.kind === 'number' ? 'number' : 'string',
                  ...(field.kind === 'text' ? { whitespace: true } : {}),
                  message: t('required')
                },
                ...(field.max ? [{ max: field.max, message: t('max', { max: field.max }) }] : [])
              ]
        }
      >
        {field.kind === 'boolean' ? (
          <Switch />
        ) : field.kind === 'number' ? (
          <InputNumber style={{ width: '100%' }} precision={field.key === 'maxFloors' ? 0 : 2} />
        ) : field.kind === 'select' ? (
          <Select
            options={(field.options ? catalog[field.options] : []).map((value) => ({
              value,
              label: values[value] ?? value
            }))}
          />
        ) : (
          <Input.TextArea rows={3} maxLength={field.max} />
        )}
      </Form.Item>
    )
  }
  return (
    <>
      <Typography.Paragraph type='secondary'>{t('typeHelp')}</Typography.Paragraph>
      <Table<TypeOption>
        rowKey='id'
        dataSource={catalog.buildingTypes}
        scroll={{ x: 1100 }}
        size='small'
        columns={[
          { title: labels.buildingTypeId, dataIndex: 'name', width: 180, fixed: 'left' },
          {
            title: t('readiness'),
            width: 160,
            render: (_, row) => (
              <Tag color={row.missingConfiguration.length ? 'warning' : 'success'}>
                {row.missingConfiguration.length ? t('notReady') : t('ready')}
              </Tag>
            )
          },
          {
            title: t('missingConfiguration'),
            width: 280,
            render: (_, row) => row.missingConfiguration.map((code) => reasons[code] ?? code).join('; ') || '—'
          },
          ...ruleFields.baseTypes
            .filter((field) => field.key !== 'buildingTypeId')
            .map((field) => ({
              title: labels[field.key],
              width: 150,
              ellipsis: true,
              render: (_: unknown, row: TypeOption) => {
                const rule = content.baseTypes.find((item) => item.buildingTypeId === row.id)
                const value = rule?.[field.key as keyof typeof rule]
                return typeof value === 'boolean' ? (value ? t('yes') : t('no')) : String(value ?? '—')
              }
            })),
          {
            title: p('actions'),
            width: 120,
            fixed: 'right',
            render: (_, row) => <Button onClick={() => open(row)}>{t('configure')}</Button>
          }
        ]}
      />
      <Drawer
        open={editing !== null}
        onClose={close}
        title={t('configureType', { name: editing?.type.name ?? '' })}
        size='large'
        maskClosable={!busy}
        closable={!busy}
        extra={
          <Button type='primary' loading={busy} onClick={() => void save()}>
            {p('save')}
          </Button>
        }
      >
        {failure ? (
          <Alert
            type='error'
            showIcon
            title={failure.text}
            description={failure.fields.map((text, i) => (
              <div key={i}>{text}</div>
            ))}
            action={failure.conflict ? <Button onClick={reload}>{p('reload')}</Button> : undefined}
          />
        ) : null}
        {editing?.type.missingConfiguration.some((code) => !['baseRule', 'defaultRoof'].includes(code)) ? (
          <Alert
            className='mb-4'
            type='warning'
            showIcon
            title={t('catalogMappingHelp')}
            description={editing.type.missingConfiguration
              .filter((code) => !['baseRule', 'defaultRoof'].includes(code))
              .map((code) => reasons[code] ?? code)
              .join('; ')}
          />
        ) : null}
        <Form form={form} layout='vertical' disabled={busy}>
          <Form.Item label={t('copyType')}>
            <Select
              value={null}
              onChange={copyFrom}
              options={catalog.buildingTypes
                .filter(
                  (type) =>
                    type.id !== editing?.type.id &&
                    content.baseTypes.some((row) => row.buildingTypeId === type.id) &&
                    content.roofRules.some((row) => row.buildingTypeId === type.id && !row.styleId)
                )
                .map((type) => ({ value: type.id, label: type.name }))}
            />
          </Form.Item>
          <Typography.Title level={5}>{t('lotRules')}</Typography.Title>
          <div className='grid gap-x-4 sm:grid-cols-2'>
            {ruleFields.baseTypes.filter((f) => f.key !== 'buildingTypeId').map((f) => field(f, ['baseType', f.key]))}
          </div>
          <Typography.Title level={5}>{t('roofSettings')}</Typography.Title>
          <Form.List name='roofRules'>
            {(fields, { add, remove }) => (
              <Space orientation='vertical' style={{ width: '100%' }}>
                {fields.map(({ key, name }) => (
                  <Card
                    size='small'
                    key={key}
                    title={name === 0 ? t('defaultRoof') : labels.styleId}
                    extra={
                      name > 0 ? (
                        <Button danger disabled={busy} onClick={() => remove(name)}>
                          {t('remove')}
                        </Button>
                      ) : undefined
                    }
                  >
                    {name > 0 ? (
                      <Form.Item
                        name={[name, 'styleId']}
                        label={labels.styleId}
                        rules={[{ required: true, message: t('required') }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp='label'
                          options={architectureOptions(catalog, editing?.type.id)}
                        />
                      </Form.Item>
                    ) : null}
                    <div className='grid gap-x-4 sm:grid-cols-2'>
                      {ruleFields.roofRules
                        .filter((f) => !['buildingTypeId', 'styleId'].includes(f.key))
                        .map((f) => field(f, [name, f.key]))}
                    </div>
                  </Card>
                ))}
                <Button
                  disabled={busy}
                  onClick={() => add({ ...blank(ruleFields.roofRules), buildingTypeId: editing?.type.id })}
                >
                  {t('addStyleRoof')}
                </Button>
              </Space>
            )}
          </Form.List>
          <Form.Item
            name='note'
            label={p('note')}
            className='mt-4'
            rules={[{ required: true, whitespace: true, message: t('required') }, { max: 500 }]}
          >
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
