'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/shared/components/ui/button'
import { useRequiredMessage } from '@/shared/hooks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useDeleteProject, useRenameProject } from '../hooks/use-projects'
import {
  createProjectSchema,
  PROJECT_NAME_MAX_LENGTH,
  type CreateProjectFormValues
} from '../schemas/create-project.schema'
import type { Project } from '../types/design.types'

interface RenameProjectDialogProps {
  /** Dự án đang đổi tên; `null` là đóng hộp thoại. */
  project: Project | null
  onClose: () => void
}

/** Menu ⋮ → Đổi tên (mục IV.1). Dùng lại luật hợp lệ của ô Tên dự án. */
export function RenameProjectDialog({ project, onClose }: RenameProjectDialogProps) {
  const t = useTranslations('design.projects.rename')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()
  const tCommon = useTranslations('common')
  const rename = useRenameProject()

  const schema = useMemo(
    () =>
      createProjectSchema({
        required,
        maxLength: tv('maxLength', { max: PROJECT_NAME_MAX_LENGTH }),
        descriptionMaxLength: tv('maxLength', { max: 500 })
      }),
    [required, tv]
  )

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' }
  })

  const { reset } = form
  // Hộp thoại dùng chung cho mọi thẻ, nên phải nạp lại tên mỗi lần mở dự án khác.
  useEffect(() => {
    if (project) reset({ name: project.name, description: '' })
  }, [project, reset])

  function onSubmit(values: CreateProjectFormValues) {
    if (!project) return
    rename.mutate({ projectId: project.id, name: values.name }, { onSuccess: onClose })
  }

  return (
    <Dialog open={Boolean(project)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{project?.id}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor='rename-project-name'>{t('label')}</Label>
                  <FormControl>
                    <Input id='rename-project-name' maxLength={PROJECT_NAME_MAX_LENGTH} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='gap-2 sm:gap-2'>
              <Button type='button' variant='ghost' onClick={onClose}>
                {tCommon('cancel')}
              </Button>
              <Button type='submit' disabled={rename.isPending}>
                {rename.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
                {t('submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteProjectDialogProps {
  project: Project | null
  onClose: () => void
}

/**
 * Menu ⋮ → Xóa (mục IV.1) — luôn hỏi lại trước khi xóa vì thao tác này kéo theo
 * cả bản nháp, dự toán và hồ sơ của dự án.
 */
export function DeleteProjectDialog({ project, onClose }: DeleteProjectDialogProps) {
  const t = useTranslations('design.projects.delete')
  const tCommon = useTranslations('common')
  const remove = useDeleteProject()

  return (
    <Dialog open={Boolean(project)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description', { name: project?.name ?? '' })}</DialogDescription>
        </DialogHeader>

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button type='button' variant='ghost' onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={remove.isPending}
            onClick={() => project && remove.mutate(project.id, { onSuccess: onClose })}
          >
            {remove.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
