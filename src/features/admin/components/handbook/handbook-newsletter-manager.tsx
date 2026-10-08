'use client'

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Empty, Select, Skeleton, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useDebouncedValue } from '@/shared/hooks'
import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import { handbookAdminApi, type BmtSpotlightItem } from '../../api/bmt/handbook.api'
import { newsAdminApi, type NewsArticleState } from '../../api/bmt/news.api'
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard'
import {
  NEWSLETTER_DISPLAY_COUNT,
  displayNumbers,
  hasDisplayedArticle,
  moveItem,
  sameOrder
} from '../../services/handbook-newsletter.service'
import { AdminPage } from '../common/admin-page'
import { StatusTag, type StatusTone } from '../common/status-tag'

const { Text } = Typography

const KEY = adminKeys.bmt('handbook-newsletter')

const STATE_TONE: Record<NewsArticleState, StatusTone> = {
  Draft: 'warning',
  Published: 'success',
  Hidden: 'off'
}

/**
 * KHỐI BẢN TIN (STORY-HB-003, BR-HB-002) — chọn và sắp xếp bài nổi bật của trang Cẩm nang.
 *
 * Người quản lý quyết định thứ tự, không theo ngày công bố. Xếp dư vài bài để dự phòng: bài nào đang ẩn hoặc nháp
 * thì bị bỏ qua khi hiển thị và các bài sau dồn lên, nhưng vẫn giữ chỗ nên công bố lại là về đúng vị trí cũ. Bài liên
 * quan bên cạnh khối do hệ thống suy ra từ danh mục của bài đứng đầu, không chọn tay ở đây.
 */
export function HandbookNewsletterManager() {
  const t = useTranslations('admin')
  const tn = useTranslations('admin.handbookNewsletter')
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const { data, isPending, error } = useQuery({ queryKey: KEY, queryFn: handbookAdminApi.getSpotlight, staleTime: 0 })
  // `null` là chưa sửa gì: màn hiện đúng bản đã lưu và không giữ bản sao cũ khi dữ liệu tải lại.
  const [draft, setDraft] = useState<BmtSpotlightItem[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [term, setTerm] = useState('')
  const debouncedTerm = useDebouncedValue(term.trim(), 300)

  const items = draft ?? data ?? []
  const dirty = draft !== null && !sameOrder(draft, data ?? [])
  useUnsavedGuard(dirty)

  const numbers = displayNumbers(items)
  const displayed = hasDisplayedArticle(items)

  const search = useQuery({
    queryKey: adminKeys.bmt('handbook-newsletter-search', debouncedTerm),
    queryFn: () => newsAdminApi.listArticles({ pageIndex: 1, pageSize: 20, keyword: debouncedTerm || undefined }),
    staleTime: 30_000
  })

  const stateLabel = (state: NewsArticleState) => tn(`states.${state}`)

  const taken = new Set(items.map((item) => item.articleId))
  const options = (search.data?.items ?? [])
    .filter((article) => !taken.has(article.id))
    .map((article) => ({
      value: article.id,
      label: (
        <Space size={8}>
          <span>{article.title || tn('untitled')}</span>
          <StatusTag tone={STATE_TONE[article.state]}>{stateLabel(article.state)}</StatusTag>
        </Space>
      ),
      article
    }))

  const update = (next: BmtSpotlightItem[]) => setDraft(next)

  const add = (articleId: string) => {
    const found = search.data?.items.find((article) => article.id === articleId)
    if (!found) return
    update([
      ...items,
      {
        articleId: found.id,
        position: items.length + 1,
        state: found.state,
        title: found.title,
        slug: found.slug
      }
    ])
    setTerm('')
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await handbookAdminApi.saveSpotlight(items.map((item) => item.articleId))
      queryClient.setQueryData(KEY, saved)
      setDraft(null)
      message.success(t('feedback.saved'))
    } catch (err) {
      // Giữ nguyên bản đang sửa để người quản lý không mất công xếp; lỗi thường là một bài đã bị xóa ở nơi khác.
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setSaving(false)
    }
  }

  const reload = async () => {
    setDraft(null)
    await queryClient.invalidateQueries({ queryKey: KEY })
  }

  if (isPending) return <Skeleton active />
  if (error && !data) {
    return <Alert type='error' showIcon title={isApiError(error) ? error.message : t('feedback.apiError')} />
  }

  return (
    <AdminPage
      title={t('nav.handbookNewsletter')}
      description={tn('description')}
      actions={
        <Space>
          <Button onClick={reload} disabled={!dirty || saving}>
            {tn('discard')}
          </Button>
          <Button type='primary' onClick={save} loading={saving} disabled={!dirty}>
            {t('actions.save')}
          </Button>
        </Space>
      }
    >
      {/* BR-HB-002 khoản 10: khối không hiển thị được thì màn quản trị phải báo cho người quản lý. */}
      {!displayed ? (
        <Alert type='warning' showIcon title={items.length ? tn('notShownAllHidden') : tn('notShownEmpty')} />
      ) : null}

      <Card
        title={tn('listTitle', { count: NEWSLETTER_DISPLAY_COUNT })}
        extra={
          <Select
            showSearch={{ filterOption: false, onSearch: setTerm }}
            value={null}
            placeholder={tn('addPlaceholder')}
            style={{ width: 360, maxWidth: '100%' }}
            loading={search.isFetching}
            options={options}
            onSelect={(value) => add(String(value))}
            notFoundContent={search.isFetching ? <Skeleton.Input active size='small' /> : tn('noResult')}
          />
        }
      >
        <Table<BmtSpotlightItem>
          rowKey='articleId'
          pagination={false}
          dataSource={items}
          locale={{ emptyText: <Empty description={tn('empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          columns={[
            {
              title: tn('position'),
              key: 'position',
              width: 70,
              render: (_, __, index) => <Text type='secondary'>{index + 1}</Text>
            },
            {
              title: tn('article'),
              key: 'article',
              render: (_, record) => (
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: 'block' }}>
                    {record.title || <Text type='secondary'>{tn('untitled')}</Text>}
                  </Text>
                  {record.slug ? (
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      /{record.slug}
                    </Text>
                  ) : null}
                </div>
              )
            },
            {
              title: tn('state'),
              dataIndex: 'state',
              width: 130,
              render: (state: NewsArticleState) => <StatusTag tone={STATE_TONE[state]}>{stateLabel(state)}</StatusTag>
            },
            {
              title: tn('display'),
              key: 'display',
              width: 200,
              render: (_, record, index) => {
                const number = numbers[index]
                if (number !== null && number !== undefined) {
                  return <Tag color='green'>{tn('shownAs', { number: String(number).padStart(2, '0') })}</Tag>
                }
                return record.state === 'Published' ? (
                  <Tag>{tn('reserve')}</Tag>
                ) : (
                  <Tooltip title={tn('hiddenHint')}>
                    <Tag color='default'>{tn('notShown')}</Tag>
                  </Tooltip>
                )
              }
            },
            {
              title: t('table.actions'),
              key: 'actions',
              width: 140,
              render: (_, record, index) => (
                <Space size={0}>
                  <Button
                    type='text'
                    icon={<ArrowUpOutlined />}
                    aria-label={tn('moveUp')}
                    disabled={index === 0}
                    onClick={() => update(moveItem(items, index, -1))}
                  />
                  <Button
                    type='text'
                    icon={<ArrowDownOutlined />}
                    aria-label={tn('moveDown')}
                    disabled={index === items.length - 1}
                    onClick={() => update(moveItem(items, index, 1))}
                  />
                  <Button
                    type='text'
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={tn('remove')}
                    onClick={() => update(items.filter((item) => item.articleId !== record.articleId))}
                  />
                </Space>
              )
            }
          ]}
        />
      </Card>
    </AdminPage>
  )
}
