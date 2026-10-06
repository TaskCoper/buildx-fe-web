'use client'

import { FileUp, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/shared/auth'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { cn } from '@/shared/lib/utils'
import { useStageLabel } from '../hooks/use-stage-label'
import { STAGE_DOCUMENT_ACCEPT, STAGE_FILE_MAX_BYTES, STAGE_PHOTO_ACCEPT } from '../constants/supervision.constants'
import { useStageActions } from '../hooks/use-supervision'
import type { SupervisionStage } from '../types/supervision.types'

interface StageUploadDialogProps {
  projectId: string
  /** Giai đoạn đang tải hồ sơ; `null` là đóng. */
  stage: SupervisionStage | null
  onClose: () => void
}

interface PickedFile {
  name: string
  sizeBytes: number
}

/**
 * Modal "Tải hồ sơ" của một giai đoạn (S20).
 *
 * Bản mô tả chỉ có MỘT ô chọn tệp rồi bấm "Tải lên & hoàn thành giai đoạn". Thực
 * tế một giai đoạn thi công có nhiều ảnh hiện trường, nên ở đây chọn được NHIỀU
 * TỆP và danh sách hiện ra để bỏ bớt trước khi chốt — nút hoàn thành vẫn là một
 * hành động dứt khoát, chỉ là không còn bắt tải từng ảnh một lần một.
 */
export function StageUploadDialog({ projectId, stage, onClose }: StageUploadDialogProps) {
  const t = useTranslations('supervision.dashboard.upload')
  const tStages = useStageLabel()
  const { user } = useAuth()
  const { upload } = useStageActions(projectId)

  const [kind, setKind] = useState<'photo' | 'document'>('photo')
  const [name, setName] = useState('')
  const [files, setFiles] = useState<PickedFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setKind('photo')
    setName('')
    setFiles([])
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const next: PickedFile[] = []
    for (const file of Array.from(list)) {
      if (file.size > STAGE_FILE_MAX_BYTES) continue
      next.push({ name: file.name, sizeBytes: file.size })
    }
    setFiles((current) => [...current, ...next.filter((file) => !current.some((item) => item.name === file.name))])
  }

  const submit = () => {
    if (!stage) return
    if (files.length === 0) {
      toast.error(t('needFile'))
      return
    }
    if (!name.trim()) {
      toast.error(t('needName'))
      return
    }

    upload.mutate(
      { stageKey: stage.key, kind, name: name.trim(), files },
      {
        onSuccess: () => {
          toast.success(t('done', { index: stage.index }))
          reset()
          onClose()
        }
      }
    )
  }

  return (
    <Dialog
      open={Boolean(stage)}
      onOpenChange={(open) => {
        if (open) return
        reset()
        onClose()
      }}
    >
      <DialogContent className='max-w-lg'>
        {stage ? (
          <>
            <DialogHeader>
              <DialogTitle className='text-pretty'>
                {t('title', { index: stage.index, stage: tStages(stage.key) })}
              </DialogTitle>
              <DialogDescription className='text-pretty'>{t('lead', { user: user?.name ?? '' })}</DialogDescription>
            </DialogHeader>

            <div className='space-y-2'>
              <Label htmlFor='upload-kind'>{t('kind')}</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as 'photo' | 'document')}>
                <SelectTrigger id='upload-kind' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='photo'>{t('kindPhoto')}</SelectItem>
                  <SelectItem value='document'>{t('kindDocument')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>{t('files')}</Label>
              <div className='flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4'>
                <span className='bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
                  <FileUp className='size-5' />
                </span>
                <p className='text-muted-foreground min-w-0 flex-1 text-sm text-pretty'>{t('dropzone')}</p>
                <input
                  ref={inputRef}
                  type='file'
                  multiple
                  accept={kind === 'photo' ? STAGE_PHOTO_ACCEPT : STAGE_DOCUMENT_ACCEPT}
                  className='hidden'
                  onChange={(event) => {
                    addFiles(event.target.files)
                    event.target.value = ''
                  }}
                />
                <Button type='button' variant='outline' size='sm' onClick={() => inputRef.current?.click()}>
                  {t('choose')}
                </Button>
              </div>

              {files.length > 0 ? (
                <ul className='space-y-1.5'>
                  {files.map((file) => (
                    <li key={file.name} className='flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm'>
                      <span className='min-w-0 flex-1 truncate'>{file.name}</span>
                      <button
                        type='button'
                        aria-label={t('remove')}
                        onClick={() => setFiles((current) => current.filter((item) => item.name !== file.name))}
                        className='text-muted-foreground hover:text-destructive transition-colors'
                      >
                        <Trash2 className='size-4' />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='upload-name'>{t('name')}</Label>
              <Input
                id='upload-name'
                value={name}
                placeholder={t('namePlaceholder')}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => {
                  reset()
                  onClose()
                }}
              >
                {t('cancel')}
              </Button>
              <Button className={cn('flex-1')} onClick={submit} disabled={upload.isPending}>
                {files.length > 1 ? t('submitCount', { count: files.length }) : t('submit')}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
