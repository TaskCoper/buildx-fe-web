'use client'

import { useQuery } from '@tanstack/react-query'
import { Select } from 'antd'
import { Circle, Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { fetchIconNames, fetchIconNode } from '@/shared/cms/icon-node.client'
import { lucideIconKey } from '@/shared/cms/home-sections'

export function ValueIconPicker({
  id,
  value = '',
  onChange,
  label
}: {
  id?: string
  value?: string
  onChange?: (value: string) => void
  label: string
}) {
  const t = useTranslations('admin.homeContent.valueTable')
  const names = useQuery({ queryKey: ['cms', 'icon-catalog'], queryFn: fetchIconNames, staleTime: Infinity })
  const key = lucideIconKey(value)
  const preview = useQuery({
    queryKey: ['cms', 'icon', key],
    queryFn: () => fetchIconNode(value),
    enabled: Boolean(key),
    staleTime: Infinity
  })
  return (
    <div>
      <div className='flex items-center gap-2'>
        <span
          className='text-primary flex size-8 shrink-0 items-center justify-center'
          data-testid='value-icon-preview'
        >
          {preview.data ? <Icon iconNode={preview.data} size={20} /> : <Circle size={20} />}
        </span>
        <Select
          id={id}
          aria-label={label}
          value={value || undefined}
          onChange={(name?: string) => onChange?.(name ?? '')}
          options={(names.data ?? []).map((name) => ({ value: name, label: name }))}
          showSearch
          allowClear
          optionFilterProp='label'
          loading={names.isPending}
          placeholder={t('chooseIcon')}
          style={{ width: '100%', minWidth: 0 }}
        />
      </div>
      {names.isError ? (
        <p role='status' className='text-muted-foreground mt-1 text-xs'>
          {t('iconUnavailable')}
        </p>
      ) : null}
    </div>
  )
}
