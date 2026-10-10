'use client'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, Popconfirm, Space } from 'antd'
import { useTranslations } from 'next-intl'
import { readSupervisionItems, SUPERVISION_ITEM_FIELDS } from '@/shared/cms/supervision-content'
import type { HomeSectionDef } from '../../services/home-sections.service'
import { FieldItem } from './page-content-manager'
import { ValueIconPicker } from './value-icon-picker'

export function SupervisionItemsEditor({ section }: { section: HomeSectionDef }) {
  const t = useTranslations('admin.homeContent')
  const tt = useTranslations('admin.homeContent.plansTable')
  const key = section.key as 'addons' | 'scope' | 'journey'
  const columns = SUPERVISION_ITEM_FIELDS[key]
  const label = (field: string) => t(`sections.supervision_${key}.fields.${field}` as Parameters<typeof t>[0])
  return (
    <div className='min-w-0'>
      {section.fields.map((field) =>
        field.kind === 'icon' ? (
          <Form.Item key={field.name} name={[key, field.name]} label={label(field.name)}>
            <ValueIconPicker label={label(field.name)} />
          </Form.Item>
        ) : (
          <FieldItem key={field.name} field={field} name={[key, field.name]} sectionKey={section.textKey ?? key} />
        )
      )}
      <Form.List
        name={[key, 'items']}
        rules={[
          {
            validator: (_, value: unknown) =>
              readSupervisionItems(value, columns) !== undefined
                ? Promise.resolve()
                : Promise.reject(new Error(t('valueTable.invalidItems')))
          }
        ]}
      >
        {(rows, { add, remove, move }, { errors }) => (
          <>
            <div
              className='overflow-x-auto rounded-lg border'
              role='region'
              tabIndex={0}
              aria-label={t(`sections.supervision_${key}.title`)}
            >
              <table
                className='w-full min-w-[650px] table-fixed border-collapse'
                data-testid={`supervision-${key}-editor`}
              >
                <thead>
                  <tr className='bg-muted/50'>
                    {columns.map((field) => (
                      <th scope='col' className='border-r border-b p-3 text-left' key={field}>
                        {label(field)}
                      </th>
                    ))}
                    <th scope='col' className='w-32 border-b p-3'>
                      {t('supervisionActions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key} data-item-index={index}>
                      {columns.map((field) => (
                        <td key={field} className='border-r border-b p-3 align-top'>
                          <Form.Item name={[row.name, field]} className='!mb-0'>
                            {field === 'icon' ? (
                              <ValueIconPicker label={label(field)} />
                            ) : (
                              <Input.TextArea
                                aria-label={`${label(field)} ${index + 1}`}
                                maxLength={1000}
                                autoSize={{ minRows: 2, maxRows: 6 }}
                              />
                            )}
                          </Form.Item>
                        </td>
                      ))}
                      <td className='border-b p-3 align-top'>
                        <Space size={4} wrap>
                          <Button
                            size='small'
                            icon={<ArrowUpOutlined />}
                            aria-label={t('moveUp')}
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                          />
                          <Button
                            size='small'
                            icon={<ArrowDownOutlined />}
                            aria-label={t('moveDown')}
                            disabled={index === rows.length - 1}
                            onClick={() => move(index, index + 1)}
                          />
                          <Popconfirm
                            title={t('valueTable.deleteConfirm')}
                            okText={tt('deleteRow')}
                            cancelText={tt('cancel')}
                            onConfirm={() => remove(row.name)}
                          >
                            <Button size='small' danger icon={<DeleteOutlined />} aria-label={tt('deleteRow')} />
                          </Popconfirm>
                        </Space>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Form.ErrorList errors={errors} />
            <Button
              className='mt-3'
              icon={<PlusOutlined />}
              disabled={rows.length >= 100}
              onClick={() => add(Object.fromEntries(columns.map((field) => [field, ''])))}
            >
              {tt('addRow')}
            </Button>
          </>
        )}
      </Form.List>
    </div>
  )
}
