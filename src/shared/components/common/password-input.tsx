'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'

/**
 * Password field with a show/hide toggle. Extends the `Input` primitive rather
 * than replacing it; forwards all input props (the `type` is managed here).
 */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const t = useTranslations('common')
  const [visible, setVisible] = React.useState(false)

  return (
    <div className='relative'>
      <Input type={visible ? 'text' : 'password'} className={cn('pr-9', className)} {...props} />
      <button
        type='button'
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        className='text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3 transition-colors'
      >
        {visible ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </button>
    </div>
  )
}

export { PasswordInput }
