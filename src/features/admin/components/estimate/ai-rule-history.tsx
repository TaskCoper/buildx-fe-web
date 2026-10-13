'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, InputNumber, Space, Table } from 'antd'
import { useTranslations } from 'next-intl'
import { aiRulesApi, type RuleRevision } from '../../api/bmt/ai-rules.api'
import { ruleComparison } from '../../services/ai-rule-fields'
import { RevisionTextDiff } from './revision-text-diff'
export const AI_RULES_KEY = ['admin', 'ai-rules'] as const
export function AiRuleHistory({
  onRestore,
  busy,
  promptCode
}: {
  onRestore: (number: number) => void
  busy: boolean
  promptCode?: string
}) {
  const t = useTranslations('admin.priceRules'),
    [page, setPage] = useState(1),
    [left, setLeft] = useState<number | null>(null),
    [right, setRight] = useState<number | null>(null)
  const history = useQuery({ queryKey: [...AI_RULES_KEY, 'history', page], queryFn: () => aiRulesApi.revisions(page) })
  const before = useQuery({
    queryKey: [...AI_RULES_KEY, 'revision', left],
    queryFn: () => aiRulesApi.revision(left!),
    enabled: left !== null
  })
  const after = useQuery({
    queryKey: [...AI_RULES_KEY, 'revision', right],
    queryFn: () => aiRulesApi.revision(right!),
    enabled: right !== null
  })
  return (
    <Card title={t('history')}>
      {history.isError || before.isError || after.isError ? (
        <Alert
          type='error'
          title={t('loadError')}
          action={
            <Button
              onClick={() => {
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
      <Table<RuleRevision>
        rowKey='revisionId'
        loading={history.isPending}
        dataSource={history.data?.items}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: 10,
          total: history.data?.totalCount,
          showSizeChanger: false,
          onChange: setPage
        }}
        columns={[
          { title: t('number'), dataIndex: 'number' },
          { title: t('date'), dataIndex: 'createdAtUtc', render: (value: string) => new Date(value).toLocaleString() },
          { title: t('author'), dataIndex: 'createdBy', render: (v: string | null) => v ?? t('seed') },
          { title: t('note'), dataIndex: 'note' },
          { title: t('content'), dataIndex: 'changeScope' },
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
                <Button size='small' disabled={busy} onClick={() => onRestore(row.number)}>
                  {t('restore')}
                </Button>
              </Space>
            )
          }
        ]}
      />
      <Space wrap>
        <label>
          {t('before')} <InputNumber min={1} precision={0} value={left} onChange={setLeft} />
        </label>
        <label>
          {t('after')} <InputNumber min={1} precision={0} value={right} onChange={setRight} />
        </label>
      </Space>
      {before.data && after.data && !before.isError && !after.isError ? (
        <RevisionTextDiff
          before={ruleComparison(before.data.content, promptCode)}
          after={ruleComparison(after.data.content, promptCode)}
        />
      ) : null}
    </Card>
  )
}
