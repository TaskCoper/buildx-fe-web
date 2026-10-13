'use client'
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { revisionDiff } from '../../services/revision-diff'
export function RevisionTextDiff({ before, after }: { before: string; after: string }) {
  const t = useTranslations('admin.priceRules')
  const lines = useMemo(() => revisionDiff(before, after), [before, after])
  return (
    <div
      role='region'
      aria-label={t('comparison')}
      className='max-h-[480px] overflow-auto rounded border p-3 font-mono text-xs'
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className={`whitespace-pre-wrap break-words ${line.kind === 'added' ? 'bg-green-50 text-green-900' : line.kind === 'removed' ? 'bg-red-50 text-red-900' : ''}`}
        >
          <span aria-label={t(line.kind)}>{line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '− ' : '  '}</span>
          {line.text || ' '}
        </div>
      ))}
    </div>
  )
}
