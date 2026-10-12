'use client'

import { DownOutlined, TableOutlined } from '@ant-design/icons'
import { useEditorState, type Editor } from '@tiptap/react'
import { Button, Checkbox, Dropdown, InputNumber, Popover, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

const TABLE_ACTIONS = [
  'addRowBefore',
  'addRowAfter',
  'deleteRow',
  'addColumnBefore',
  'addColumnAfter',
  'deleteColumn',
  'toggleHeaderRow',
  'mergeCells',
  'splitCell',
  'deleteTable'
] as const

// Giới hạn kích thước chèn một lần để không dựng bảng quá lớn khi nhập nhầm.
// Người soạn vẫn có thể thêm dòng/cột vào bảng sau đó.
const MAX_INITIAL_SIZE = 20

export function TableToolbar({ editor }: { editor: Editor }) {
  const t = useTranslations('admin.newsArticles.editor.table')
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<number | null>(3)
  const [columns, setColumns] = useState<number | null>(3)
  const [withHeaderRow, setWithHeaderRow] = useState(true)
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      inTable: current.isActive('table'),
      enabled: TABLE_ACTIONS.map((action) => current.can()[action]())
    })
  })
  const validSize = (value: number | null): value is number =>
    value !== null && Number.isInteger(value) && value >= 1 && value <= MAX_INITIAL_SIZE

  function insert() {
    if (!validSize(rows) || !validSize(columns) || state.inTable) return
    editor.chain().focus().insertTable({ rows, cols: columns, withHeaderRow }).run()
    setOpen(false)
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        destroyOnHidden
        trigger='click'
        title={t('insert')}
        content={
          <div className='flex w-60 flex-col gap-3'>
            <div className='grid grid-cols-2 gap-3'>
              <label className='flex flex-col gap-1'>
                <span>{t('rows')}</span>
                <InputNumber
                  autoFocus
                  aria-label={t('rows')}
                  value={rows}
                  onChange={setRows}
                  min={1}
                  max={MAX_INITIAL_SIZE}
                  precision={0}
                  style={{ width: '100%' }}
                  onPressEnter={insert}
                />
              </label>
              <label className='flex flex-col gap-1'>
                <span>{t('columns')}</span>
                <InputNumber
                  aria-label={t('columns')}
                  value={columns}
                  onChange={setColumns}
                  min={1}
                  max={MAX_INITIAL_SIZE}
                  precision={0}
                  style={{ width: '100%' }}
                  onPressEnter={insert}
                />
              </label>
            </div>
            <Checkbox checked={withHeaderRow} onChange={(event) => setWithHeaderRow(event.target.checked)}>
              {t('withHeaderRow')}
            </Checkbox>
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              {t('sizeHint', { max: MAX_INITIAL_SIZE })}
            </Typography.Text>
            <Button type='primary' disabled={!validSize(rows) || !validSize(columns)} onClick={insert}>
              {t('insert')}
            </Button>
          </div>
        }
      >
        <Button size='small' type='text' icon={<TableOutlined />} disabled={state.inTable} aria-expanded={open}>
          {t('insert')}
        </Button>
      </Popover>
      <Dropdown
        trigger={['click']}
        disabled={!state.inTable}
        menu={{
          items: TABLE_ACTIONS.map((key, index) => ({
            key,
            label: t(key),
            disabled: !state.enabled[index],
            danger: key.startsWith('delete')
          })),
          onClick: ({ key }) => {
            const action = TABLE_ACTIONS.find((candidate) => candidate === key)
            if (action) editor.chain().focus()[action]().run()
          }
        }}
      >
        <Button size='small' type='text' disabled={!state.inTable}>
          {t('actions')} <DownOutlined />
        </Button>
      </Dropdown>
    </>
  )
}
