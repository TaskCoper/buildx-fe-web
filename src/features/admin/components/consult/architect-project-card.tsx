'use client'

import { Card, Image } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { BmtArchitectDesignProject } from '../../api/bmt/consult.api'

export function ArchitectProjectCard({ project }: { project: BmtArchitectDesignProject }) {
  const ta = useTranslations('admin.architects')
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(0)
  const cover = project.imageUrls[0]
  if (!cover) return null

  return (
    <Card
      className='group/project'
      style={{ height: '100%', overflow: 'hidden', borderRadius: 12 }}
      styles={{ body: { padding: 0 } }}
    >
      <figure>
        <Image.PreviewGroup
          items={project.imageUrls}
          preview={{ open, current, onOpenChange: setOpen, onChange: setCurrent }}
        >
          <button
            type='button'
            aria-label={ta('viewProjectImages', { name: project.name })}
            onClick={() => {
              setCurrent(0)
              setOpen(true)
            }}
            className='architect-image-preview relative block aspect-4/3 w-full cursor-zoom-in overflow-hidden bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
          >
            <Image
              src={cover}
              alt={`${project.name} · ${ta('designImageIndex', { index: 1 })}`}
              width='100%'
              height='100%'
              preview={false}
              style={{ objectFit: 'cover' }}
            />
            {project.imageUrls.length > 1 && (
              <span
                aria-hidden
                className='pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/70 text-3xl font-semibold text-foreground opacity-0 transition-opacity duration-200 group-hover/project:opacity-100 group-focus-within/project:opacity-100 group-active/project:opacity-100 motion-reduce:transition-none'
              >
                {project.imageUrls.length - 1}+
              </span>
            )}
          </button>
        </Image.PreviewGroup>
        <figcaption className='border-t border-border px-4 py-3'>
          <h3 className='text-sm font-medium break-words'>{project.name}</h3>
        </figcaption>
      </figure>
    </Card>
  )
}
