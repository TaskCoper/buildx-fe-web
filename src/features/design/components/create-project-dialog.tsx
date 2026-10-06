'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { useRequiredMessage } from '@/shared/hooks'
import { useCreateProject } from '../hooks/use-projects'
import {
  createProjectSchema,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  type CreateProjectFormValues
} from '../schemas/create-project.schema'
import { useDesignStore } from '../store/design.store'
import { FieldLabel } from '@/shared/components/common'
import { useRouter } from '@/i18n/navigation'
import { designInputRoute } from '@/shared/constants/routes'
import { clearProjectTemplateSeed, consumeProjectTemplateSeed } from '@/shared/lib'
import type { BuildingType, DesignInput, DesignStyle, FloorCount } from '../types/design.types'

const BUILDING_TYPES = ['townhouse', 'villa', 'roofed', 'garden', 'apartment'] as const
const FLOOR_COUNTS = ['ground', 'ground+1', 'ground+2', 'ground+3', 'ground+4'] as const
const DESIGN_STYLES = [
  'modern',
  'wabi-sabi',
  'neoclassical',
  'minimal',
  'indochine',
  'thai-roof',
  'japanese-roof',
  'garden-thai-roof',
  'garden-japanese-roof',
  'garden-villa',
  'level4-modern'
] as const

/** Ngón tay phải trượt xuống quá ngưỡng này (px) mới tính là kéo popup. */
const DRAG_START_THRESHOLD = 8

function isBuildingType(value: string | undefined): value is BuildingType {
  return Boolean(value && (BUILDING_TYPES as readonly string[]).includes(value))
}

function isFloorCount(value: string | undefined): value is FloorCount {
  return Boolean(value && (FLOOR_COUNTS as readonly string[]).includes(value))
}

function isDesignStyle(value: string | undefined): value is DesignStyle {
  return Boolean(value && (DESIGN_STYLES as readonly string[]).includes(value))
}

function normalizeTemplateStyle(
  buildingType: BuildingType | undefined,
  style: string | undefined
): DesignStyle | undefined {
  if (!style) return undefined
  if (buildingType === 'garden' && style === 'thai-roof') return 'garden-thai-roof'
  if (buildingType === 'garden' && style === 'japanese-roof') return 'garden-japanese-roof'
  return isDesignStyle(style) ? style : undefined
}

/**
 * Cửa sổ Tạo dự án (mục III.1) — hiện trước Bước 1.
 *
 * Mở từ nút "Tạo dự án mới" trên thanh công cụ / trang chủ, hoặc khi vào mục
 * Thiết kế & Dự toán mà chưa có dự án nào đang mở. Tạo xong → sinh Project ID
 * và mở ngay màn hình Bước 1.
 */
export function CreateProjectDialog() {
  const t = useTranslations('design.createProject')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()
  const tCommon = useTranslations('common')

  const open = useDesignStore((s) => s.isCreateDialogOpen)
  const origin = useDesignStore((s) => s.createDialogOrigin)
  const close = useDesignStore((s) => s.closeCreateDialog)
  const patchDraft = useDesignStore((s) => s.patchDraft)
  const setBuildingType = useDesignStore((s) => s.setBuildingType)
  const router = useRouter()
  const [exiting, setExiting] = useState(false)
  const [invalidPulse, setInvalidPulse] = useState(false)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const dragStartRef = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const schema = useMemo(
    () =>
      createProjectSchema({
        required,
        maxLength: tv('maxLength', { max: PROJECT_NAME_MAX_LENGTH }),
        descriptionMaxLength: tv('maxLength', { max: PROJECT_DESCRIPTION_MAX_LENGTH })
      }),
    [required, tv]
  )

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' }
  })

  const resetForm = form.reset

  const createProject = useCreateProject((projectId) => {
    const sourceTemplate = consumeProjectTemplateSeed()
    if (sourceTemplate) {
      const buildingType = isBuildingType(sourceTemplate.buildingType) ? sourceTemplate.buildingType : undefined
      if (buildingType) {
        setBuildingType(projectId, buildingType)
      }

      const patch: Partial<DesignInput> = {
        wishes: `Mẫu tham khảo: ${sourceTemplate.templateName}`
      }
      if (isFloorCount(sourceTemplate.floorCount)) patch.floorCount = sourceTemplate.floorCount
      if (typeof sourceTemplate.hasAttic === 'boolean') patch.hasAttic = sourceTemplate.hasAttic
      const style = normalizeTemplateStyle(buildingType, sourceTemplate.style)
      if (style) patch.style = style
      patchDraft(projectId, patch)
    }

    setExiting(true)
    window.setTimeout(() => {
      close()
      form.reset()
      setExiting(false)
      router.push(designInputRoute(projectId))
    }, 360)
  })

  function onSubmit(values: CreateProjectFormValues) {
    createProject.mutate({
      name: values.name,
      description: values.description || undefined
    })
  }

  function onInvalid() {
    setInvalidPulse(false)
    window.requestAnimationFrame(() => setInvalidPulse(true))
    window.setTimeout(() => setInvalidPulse(false), 380)
    window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-create-project-name]')?.focus(), 180)
  }

  useEffect(() => {
    if (!open) return
    resetForm()
    const timer = window.setTimeout(() => nameRef.current?.focus(), 280)
    return () => window.clearTimeout(timer)
  }, [open, resetForm])

  function resizeDescription() {
    const textarea = descriptionRef.current
    if (!textarea) return
    const currentHeight = textarea.offsetHeight
    textarea.style.height = 'auto'
    const targetHeight = textarea.scrollHeight
    textarea.style.height = `${currentHeight}px`
    window.requestAnimationFrame(() => {
      textarea.style.height = `${targetHeight}px`
    })
  }

  function cancel() {
    clearProjectTemplateSeed()
    close()
    // Không `form.reset()` ở đây: xóa chữ + render lại cả form giữa lúc popup đang
    // chạy animation đóng làm nó khựng/giật (rõ nhất trên mobile). Form được reset
    // lúc mở lại (effect bên dưới).
    setDragY(0)
    setDragging(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (createProject.isPending || exiting) return
          cancel()
        }
      }}
    >
      <DialogContent
        data-create-dialog-content
        data-submitting={createProject.isPending ? 'pending' : exiting ? 'complete' : 'idle'}
        data-invalid-pulse={invalidPulse}
        onOpenAutoFocus={(event) => event.preventDefault()}
        data-dragging={dragging}
        style={
          {
            '--dialog-origin-x': `${origin.x}px`,
            '--dialog-origin-y': `${origin.y}px`,
            '--dialog-drag-y': `${dragY}px`
          } as CSSProperties
        }
        // Animation mở chạy xong thì đánh dấu `data-settled` (CSS tắt hẳn animation từ đó):
        // nếu không, mỗi lần `data-dragging` bật/tắt, animation trượt-lên lại chạy từ đầu
        // và popup "nhảy lên rồi hiện lại". Gắn thẳng vào DOM nên không tốn render.
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.currentTarget.dataset.state === 'open') {
            event.currentTarget.dataset.settled = 'true'
          }
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch') return
          if ((event.target as HTMLElement).closest('input, textarea, button, a')) return
          // Chỉ ghi nhận điểm bắt đầu: chạm đơn thuần (tap) KHÔNG được coi là kéo.
          dragStartRef.current = event.clientY
        }}
        onPointerMove={(event) => {
          if (dragStartRef.current === null) return
          const delta = event.clientY - dragStartRef.current
          if (!dragging) {
            if (delta < DRAG_START_THRESHOLD) return
            setDragging(true)
            event.currentTarget.setPointerCapture(event.pointerId)
          }
          setDragY(Math.max(0, delta))
        }}
        onPointerUp={(event) => {
          if (dragStartRef.current === null) return
          dragStartRef.current = null
          if (!dragging) return
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          setDragging(false)
          if (dragY > 120) {
            cancel()
          }
          setDragY(0)
        }}
        onPointerCancel={() => {
          dragStartRef.current = null
          if (!dragging) return
          setDragging(false)
          setDragY(0)
        }}
        className='sm:max-h-[92vh] sm:max-w-lg sm:overflow-y-auto'
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className='space-y-4'
            aria-busy={createProject.isPending || exiting}
          >
            {/* `space-y-4` đặt Ở ĐÂY: fieldset là `contents` nên `space-y-4` của <form> chỉ tác động lên
            chính fieldset, các ô bên trong không được cách nhau. */}
            <fieldset disabled={createProject.isPending || exiting} className='contents space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor='project-name' hint={t('nameHint')} required>
                      {t('nameLabel')}
                    </FieldLabel>
                    <FormControl>
                      <Input
                        id='project-name'
                        data-create-project-name
                        placeholder={t('namePlaceholder')}
                        // Nếu không chỉ định, Radix focus phần tử focusable đầu
                        // tiên là nút (i) và tooltip bật sẵn đè lên tiêu đề.
                        {...field}
                        ref={(node) => {
                          field.ref(node)
                          nameRef.current = node
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor='project-description' hint={t('descriptionHint')}>
                      {t('descriptionLabel')}
                    </FieldLabel>
                    <FormControl>
                      <Textarea
                        id='project-description'
                        data-create-project-description
                        rows={3}
                        placeholder={t('descriptionPlaceholder')}
                        {...field}
                        ref={(node) => {
                          field.ref(node)
                          descriptionRef.current = node
                        }}
                        onChange={(event) => {
                          field.onChange(event)
                          resizeDescription()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hình 03: hai nút bằng nhau, chia đôi bề ngang — "Tạo dự án" là
                nút chính bên trái, "Hủy" viền nhạt bên phải. */}
              <div className='grid grid-cols-2 gap-3 pt-1'>
                <Button data-create-submit type='submit' size='lg' disabled={createProject.isPending || exiting}>
                  {createProject.isPending ? (
                    <span data-submit-dots className='flex items-center gap-1' aria-hidden>
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className='bg-current size-1 rounded-full'
                          style={{ '--dot-delay': `${index * 120}ms` } as CSSProperties}
                        />
                      ))}
                    </span>
                  ) : null}
                  {t('submit')}
                </Button>
                <Button type='button' size='lg' variant='outline' onClick={cancel}>
                  {tCommon('cancel')}
                </Button>
              </div>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
