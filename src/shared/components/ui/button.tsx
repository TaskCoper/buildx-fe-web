import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { primaryButtonEffectClasses, secondaryControlEffectClasses } from '@/shared/lib/effects'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: primaryButtonEffectClasses,
        destructive:
          'group relative isolate overflow-hidden bg-destructive text-destructive-foreground ring-1 ring-destructive shadow-[0_1px_--theme(--color-white/0.07)_inset,0_1px_3px_--theme(--color-gray-900/0.2)] transition duration-300 ease-[cubic-bezier(0.4,0.36,0,1)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-linear-to-b before:from-white/20 before:opacity-50 before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.4,0.36,0,1)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:bg-linear-to-b after:from-white/15 after:from-44% after:via-transparent after:via-50% after:to-black/12 after:to-56% after:mix-blend-overlay hover:before:opacity-100 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'group relative isolate overflow-hidden bg-linear-to-b from-background to-muted text-foreground ring-1 ring-border shadow-[0_1px_--theme(--color-white/0.6)_inset,0_1px_3px_--theme(--color-gray-900/0.06)] transition duration-300 ease-[cubic-bezier(0.4,0.36,0,1)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-linear-to-b before:from-background before:to-muted-foreground before:opacity-0 before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.4,0.36,0,1)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:bg-linear-to-b after:from-white/25 after:from-44% after:via-transparent after:via-50% after:to-black/8 after:to-56% after:mix-blend-overlay hover:before:opacity-5 dark:bg-input/30 dark:ring-input',
        secondary: secondaryControlEffectClasses,
        ghost:
          'group relative isolate overflow-hidden text-foreground transition duration-300 ease-[cubic-bezier(0.4,0.36,0,1)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-accent before:opacity-0 before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.4,0.36,0,1)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:bg-linear-to-b after:from-white/20 after:from-44% after:via-transparent after:via-50% after:to-black/8 after:to-56% after:mix-blend-overlay after:opacity-0 after:transition-opacity after:duration-300 after:ease-[cubic-bezier(0.4,0.36,0,1)] hover:before:opacity-100 hover:after:opacity-100 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-8.5 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-7.5 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-9.5 px-6 has-[>svg]:px-4',
        icon: 'size-8.5',
        'icon-sm': 'size-7.5',
        'icon-lg': 'size-9.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot='button'
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
