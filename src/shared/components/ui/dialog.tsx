'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import * as React from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'

let activeDialogOverlayCount = 0

function syncDialogPresenceAttribute() {
  if (typeof document === 'undefined') return

  if (activeDialogOverlayCount > 0) {
    document.documentElement.setAttribute('data-dialog-overlay-open', 'true')
  } else {
    document.documentElement.removeAttribute('data-dialog-overlay-open')
  }
}

type DialogPosition =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center-left'
  | 'center-right'

const positionClasses: Record<DialogPosition, string> = {
  center: 'top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]',
  'top-left': 'top-6 left-6 translate-x-0 translate-y-0 origin-top-left',
  'top-center': 'top-6 left-[50%] translate-x-[-50%] translate-y-0 origin-top',
  'top-right': 'top-6 right-6 translate-x-0 translate-y-0 origin-top-right',
  'bottom-left': 'bottom-4 left-4 translate-x-0 translate-y-0 origin-bottom-left',
  'bottom-center': 'bottom-4 left-[50%] translate-x-[-50%] translate-y-0 origin-bottom',
  'bottom-right': 'bottom-4 right-4 translate-x-0 translate-y-0 origin-bottom-right',
  'center-left': 'top-[50%] left-4 translate-x-0 translate-y-[-50%] origin-left',
  'center-right': 'top-[50%] right-4 translate-x-0 translate-y-[-50%] origin-right'
}

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot='dialog' {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot='dialog-close' {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  React.useLayoutEffect(() => {
    activeDialogOverlayCount += 1
    syncDialogPresenceAttribute()

    return () => {
      activeDialogOverlayCount = Math.max(0, activeDialogOverlayCount - 1)
      syncDialogPresenceAttribute()
    }
  }, [])

  return (
    <DialogPrimitive.Overlay
      data-slot='dialog-overlay'
      className={cn(
        // `backdrop-blur` — mục IV.2: modal làm mờ nền phía sau.
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/45 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  position = 'center',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  position?: DialogPosition
}) {
  return (
    <DialogPortal data-slot='dialog-portal'>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot='dialog-content'
        className={cn(
          'fixed z-50 grid w-full max-w-[calc(100vw-2rem)] gap-4 rounded-2xl bg-background p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_0_4px_rgba(0,0,0,0.45)] duration-200 sm:max-w-lg',
          'max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          positionClasses[position],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot='dialog-close'
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <CloseLabel />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-header'
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}

/** Nhãn đọc màn hình của nút đóng — theo ngôn ngữ trang (trước đây cứng chữ "Close"). */
function CloseLabel() {
  const t = useTranslations('common')
  return <span className='sr-only'>{t('close')}</span>
}
