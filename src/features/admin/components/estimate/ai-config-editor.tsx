'use client'

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Typography
} from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import { estimatePipelineAdminApi, type ConfigRevisionRow } from '../../api/bmt/estimate-pipeline.api'
import {
  configFieldPath,
  parseParameters,
  PIPELINE_STAGES,
  providerModelOptions,
  type AiProvider,
  type PipelineConfig,
  type PipelineConfigView
} from '../../api/bmt/estimate-pipeline.logic'
import { AdminPage } from '../common/admin-page'

const { Text } = Typography
const CONFIG_KEY = ['admin', 'estimate-pipeline', 'config'] as const
const REVISIONS_KEY = ['admin', 'estimate-pipeline', 'config-revisions'] as const
const NOTE_MAX = 500
const PROVIDERS: AiProvider[] = ['OpenAI', 'Anthropic']

/** Giá trị trong form: như `PipelineConfig`, riêng tham số model sửa dạng chuỗi JSON. */
type FormValues = Omit<PipelineConfig, 'tasks'> & {
  tasks: (Omit<PipelineConfig['tasks'][number], 'parameters'> & { parametersText: string })[]
  note: string
}

function toFormValues(view: PipelineConfigView): FormValues {
  return {
    ...view.config,
    tasks: view.config.tasks.map(({ parameters, ...task }) => ({
      ...task,
      parametersText: JSON.stringify(parameters, null, 2)
    })),
    note: ''
  }
}

/**
 * CẤU HÌNH AI của luồng tạo dự toán (STORY-PROJ-012, TDD-PROJ-008 mục E). Mỗi lần lưu tạo một phiên bản mới; lần chạy
 * đã tiếp nhận vẫn dùng phiên bản đã chốt lúc tiếp nhận. Khóa API của OpenAI/Anthropic không nằm ở đây (biến môi
 * trường của máy chủ). Cần quyền `estimate.pipeline.config.manage`.
 */
export function AiConfigEditor() {
  const t = useTranslations('admin.estimateAiConfig')
  const tAdmin = useTranslations('admin')
  const locale = useLocale() as Locale
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const watchedTasks = Form.useWatch('tasks', form)

  const config = useQuery({ queryKey: CONFIG_KEY, queryFn: () => estimatePipelineAdminApi.getConfig() })
  const revisions = useQuery({ queryKey: REVISIONS_KEY, queryFn: () => estimatePipelineAdminApi.listConfigRevisions() })
  const modelQueries = useQueries({
    queries: PROVIDERS.map((provider) => ({
      queryKey: ['admin', 'estimate-pipeline', 'models', provider],
      queryFn: ({ signal }: { signal: AbortSignal }) => estimatePipelineAdminApi.getProviderModels(provider, signal),
      enabled: !!config.data,
      staleTime: 5 * 60 * 1000,
      retry: false
    }))
  })

  useEffect(() => {
    if (config.data) form.setFieldsValue(toFormValues(config.data))
  }, [config.data, form])

  const providerQuery = (provider?: string) => modelQueries[PROVIDERS.findIndex((item) => item === provider)]
  const modelOptions = (provider?: string, retained: (string | null | undefined)[] = []) =>
    providerModelOptions(
      provider ? (providerQuery(provider)?.data ?? []) : modelQueries.flatMap((query) => query.data ?? []),
      retained
    )

  async function save(values: FormValues) {
    if (!config.data) return
    const tasks: PipelineConfig['tasks'] = []
    for (const [index, task] of values.tasks.entries()) {
      const parameters = parseParameters(task.parametersText)
      if (!parameters) {
        form.setFields([{ name: ['tasks', index, 'parametersText'], errors: [t('parametersInvalid')] }])
        return
      }
      const { parametersText: _ignored, ...rest } = task
      tasks.push({ ...rest, fallbackModel: rest.fallbackModel || null, parameters })
    }
    const { note, ...edited } = values
    setSaving(true)
    try {
      await estimatePipelineAdminApi.saveConfig(config.data, { ...edited, tasks }, note ?? '')
      message.success(t('saved'))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONFIG_KEY }),
        queryClient.invalidateQueries({ queryKey: REVISIONS_KEY })
      ])
    } catch (error) {
      const code = isApiError(error) ? (error.messageCode ?? error.code) : undefined
      if (code === 'VersionConflict') {
        modal.confirm({
          title: t('conflictTitle'),
          content: t('conflictBody'),
          okText: t('reload'),
          onOk: () => queryClient.invalidateQueries({ queryKey: CONFIG_KEY })
        })
        return
      }
      if (isApiError(error) && error.errors) {
        form.setFields(
          Object.entries(error.errors).map(([key, errors]) => ({
            // Đường dẫn do BE trả (`tasks[0].model`), không kiểm được kiểu lúc biên dịch.
            name: configFieldPath(key) as Parameters<typeof form.setFields>[0][number]['name'],
            errors
          }))
        )
      }
      message.error(isApiError(error) ? error.message : tAdmin('feedback.apiError'))
    } finally {
      setSaving(false)
    }
  }

  const number = (name: (string | number)[], label: string, min: number, max?: number, step?: number) => (
    <Form.Item name={name} label={label} rules={[{ required: true, message: tAdmin('fields.requiredMessage') }]}>
      <InputNumber min={min} max={max} step={step} style={{ width: '100%' }} />
    </Form.Item>
  )

  return (
    <AdminPage
      title={tAdmin('nav.estimateAiConfig')}
      description={t('description')}
      sticky
      actions={
        <Button type='primary' loading={saving} disabled={!config.data} onClick={() => form.submit()}>
          {t('save')}
        </Button>
      }
    >
      {config.isError ? (
        <Alert
          type='error'
          showIcon
          title={isApiError(config.error) ? config.error.message : tAdmin('feedback.apiError')}
          action={<Button onClick={() => void config.refetch()}>{t('reload')}</Button>}
        />
      ) : null}
      {config.data ? <Text type='secondary'>{t('currentVersion', { version: config.data.version })}</Text> : null}
      <Form<FormValues> form={form} layout='vertical' onFinish={(values) => void save(values)} disabled={!config.data}>
        <Card title={t('stages.title')} size='small' style={{ marginBottom: 16 }}>
          <Text type='secondary'>{t('stages.hint')}</Text>
          <Table
            size='small'
            pagination={false}
            rowKey='stage'
            style={{ marginTop: 12 }}
            dataSource={PIPELINE_STAGES.map((stage, index) => ({ stage, index }))}
            columns={[
              {
                title: t('stages.stage'),
                dataIndex: 'stage',
                render: (stage: string) => t(`stage.${stage as 'Plan2d'}`)
              },
              {
                title: t('stages.timeoutMinutes'),
                key: 'timeout',
                render: (_, row) => (
                  <Form.Item name={['stages', row.index, 'timeoutMinutes']} noStyle rules={[{ required: true }]}>
                    <InputNumber min={1} max={240} addonAfter={t('minutes')} />
                  </Form.Item>
                )
              },
              {
                title: t('stages.retryLimit'),
                key: 'retry',
                render: (_, row) => (
                  <>
                    <Form.Item name={['stages', row.index, 'stage']} hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name={['stages', row.index, 'retryLimit']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={1} max={20} />
                    </Form.Item>
                  </>
                )
              }
            ]}
          />
        </Card>

        <Card title={t('verify.title')} size='small' style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              {number(['lotVerifyDailyLimit'], t('verify.dailyLimit'), 1, 1000)}
            </Col>
            <Col xs={24} md={8}>
              {number(['lotVerifySystemDailyLimit'], t('verify.systemDailyLimit'), 1, 1_000_000)}
            </Col>
            <Col xs={24} md={8}>
              {number(['lotVerifyTimeoutSeconds'], t('verify.timeoutSeconds'), 10, 300)}
            </Col>
          </Row>
        </Card>

        <Card title={t('load.title')} size='small' style={{ marginBottom: 16 }}>
          <Text type='secondary'>{t('load.hint')}</Text>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col xs={24} md={6}>
              {number(['maxQueuedRuns'], t('load.maxQueuedRuns'), 1, 10_000)}
            </Col>
            <Col xs={24} md={6}>
              {number(['breaker', 'failureThreshold'], t('load.failureThreshold'), 1, 100)}
            </Col>
            <Col xs={24} md={6}>
              {number(['breaker', 'openMinutes'], t('load.openMinutes'), 1, 60)}
            </Col>
            <Col xs={24} md={6}>
              {number(['runCostAlertUsd'], t('load.runCostAlertUsd'), 0.01, undefined, 0.5)}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              {number(['limits', 'imagesPerMinute'], t('limits.imagesPerMinute'), 1, 10_000)}
            </Col>
            <Col xs={24} md={8}>
              {number(['limits', 'imageConcurrency'], t('limits.imageConcurrency'), 1, 1000)}
            </Col>
            <Col xs={24} md={8}>
              {number(['limits', 'textConcurrency'], t('limits.textConcurrency'), 1, 1000)}
            </Col>
            <Col xs={24} md={8}>
              {number(['limits', 'anthropicConcurrency'], t('limits.anthropicConcurrency'), 1, 1000)}
            </Col>
            <Col xs={24} md={8}>
              {number(['limits', 'lotVerifyConcurrency'], t('limits.lotVerifyConcurrency'), 1, 1000)}
            </Col>
          </Row>
        </Card>

        <Card title={t('outline.title')} size='small' style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name={['planOutline', 'redraw']} valuePropName='checked' label={t('outline.redraw')}>
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              {number(['planOutline', 'tolerance'], t('outline.tolerance'), 0.01, 0.5, 0.01)}
            </Col>
            <Col xs={24} md={8}>
              {number(['planOutline', 'minOverlap'], t('outline.minOverlap'), 0.5, 1, 0.01)}
            </Col>
          </Row>
        </Card>

        <Card title={t('tasks.title')} size='small' style={{ marginBottom: 16 }}>
          <Space orientation='vertical' style={{ width: '100%', marginBottom: 16 }}>
            <Text type='secondary'>{t('tasks.modelsHint')}</Text>
            {PROVIDERS.map((provider, index) => {
              const query = modelQueries[index]
              return (
                <div key={provider}>
                  <Button loading={query?.isFetching} onClick={() => void query?.refetch()}>
                    {t('tasks.reloadModels', { provider })}
                  </Button>
                  {query?.isError ? (
                    <Alert
                      style={{ marginTop: 8 }}
                      type='error'
                      showIcon
                      title={isApiError(query.error) ? query.error.message : t('tasks.modelsError', { provider })}
                    />
                  ) : query?.isSuccess && query.data.length === 0 ? (
                    <Alert style={{ marginTop: 8 }} type='info' showIcon title={t('tasks.modelsEmpty', { provider })} />
                  ) : null}
                </div>
              )
            })}
          </Space>
          <Form.List name='tasks'>
            {(fields) =>
              fields.map((field) => {
                const task = watchedTasks?.[field.name]?.task ?? ''
                const provider = watchedTasks?.[field.name]?.provider
                return (
                  <Row key={field.key} gutter={12} align='top'>
                    <Col xs={24} md={4}>
                      <Form.Item label={t('tasks.task')}>
                        <Text strong>{t(`task.${task as 'lotVerify'}`)}</Text>
                      </Form.Item>
                      <Form.Item name={[field.name, 'task']} hidden>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                      <Form.Item name={[field.name, 'provider']} label={t('tasks.provider')}>
                        <Select
                          options={['OpenAI', 'Anthropic'].map((value) => ({ value, label: value }))}
                          onChange={() => {
                            form.setFieldValue(['tasks', field.name, 'model'], undefined)
                            form.setFieldValue(['tasks', field.name, 'fallbackModel'], null)
                          }}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={5}>
                      <Form.Item
                        name={[field.name, 'model']}
                        label={t('tasks.model')}
                        rules={[{ required: true, message: tAdmin('fields.requiredMessage') }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp='label'
                          loading={providerQuery(provider)?.isFetching}
                          options={modelOptions(provider, [watchedTasks?.[field.name]?.model])}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={5}>
                      <Form.Item name={[field.name, 'fallbackModel']} label={t('tasks.fallbackModel')}>
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp='label'
                          loading={providerQuery(provider)?.isFetching}
                          options={modelOptions(provider, [watchedTasks?.[field.name]?.fallbackModel])}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item
                        name={[field.name, 'parametersText']}
                        label={t('tasks.parameters')}
                        extra={
                          watchedTasks?.[field.name]?.task === 'render3dImage'
                            ? t('tasks.render3dParameters')
                            : undefined
                        }
                      >
                        <Input.TextArea rows={2} style={{ fontFamily: 'monospace' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                )
              })
            }
          </Form.List>
        </Card>

        <Card title={t('prices.title')} size='small' style={{ marginBottom: 16 }}>
          <Text type='secondary'>{t('prices.hint')}</Text>
          <Form.List name='prices'>
            {(fields, { add, remove }) => (
              <Space orientation='vertical' style={{ width: '100%', marginTop: 12 }}>
                {fields.map((field) => (
                  <Row key={field.key} gutter={12} align='top'>
                    <Col xs={24} md={6}>
                      <Form.Item
                        name={[field.name, 'model']}
                        label={t('prices.model')}
                        rules={[{ required: true, message: tAdmin('fields.requiredMessage') }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp='label'
                          options={modelOptions(
                            undefined,
                            config.data?.config.prices.map((price) => price.model)
                          )}
                        />
                      </Form.Item>
                    </Col>
                    {(['inputPerMTok', 'cachedInputPerMTok', 'outputPerMTok', 'cacheWritePerMTok'] as const).map(
                      (key) => (
                        <Col key={key} xs={12} md={4}>
                          <Form.Item
                            name={[field.name, key]}
                            label={t(`prices.${key}`)}
                            rules={key === 'cacheWritePerMTok' ? [] : [{ required: true }]}
                          >
                            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      )
                    )}
                    <Col xs={24} md={2}>
                      <Form.Item label=' '>
                        <Button danger onClick={() => remove(field.name)}>
                          {t('prices.remove')}
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
                <Button onClick={() => add({ cacheWritePerMTok: null })}>{t('prices.add')}</Button>
              </Space>
            )}
          </Form.List>
        </Card>

        <Card size='small' style={{ marginBottom: 16 }}>
          <Form.Item
            name='note'
            label={t('note')}
            extra={t('noteHint')}
            rules={[{ max: NOTE_MAX, message: tAdmin('fields.maxLength', { max: NOTE_MAX }) }]}
          >
            <Input.TextArea rows={2} maxLength={NOTE_MAX} showCount />
          </Form.Item>
          <Alert type='info' showIcon title={t('appliesToNewRuns')} />
        </Card>
      </Form>

      <Card title={t('revisions.title')} size='small'>
        <Table<ConfigRevisionRow>
          size='small'
          rowKey={(row) => String(row.number)}
          loading={revisions.isPending}
          dataSource={revisions.data ?? []}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: t('revisions.number'), dataIndex: 'number', width: 100 },
            {
              title: t('revisions.createdAt'),
              dataIndex: 'createdAtUtc',
              render: (value: string | null) => (value ? formatDisplayDate(value, locale, { time: true }) : '—')
            },
            { title: t('revisions.createdBy'), dataIndex: 'createdBy', render: (value: string | null) => value ?? '—' },
            { title: t('revisions.note'), dataIndex: 'note', render: (value: string | null) => value ?? '—' }
          ]}
        />
      </Card>
    </AdminPage>
  )
}
