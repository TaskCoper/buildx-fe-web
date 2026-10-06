'use client'

import { cva } from 'class-variance-authority'
import { Check, ImageOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Control } from 'react-hook-form'

import { Photo } from '@/shared/components/common'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Label,
  RadioGroup,
  RadioGroupItem
} from '@/shared/components/ui'
import type { SiteCatalog, SiteFormValues } from '../types/construction-site.types'

const styleCardVariants = cva(
  'relative flex h-full cursor-pointer flex-col gap-0 overflow-hidden rounded-xl border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
  {
    variants: {
      selected: {
        true: 'border-primary bg-accent text-primary-strong',
        false: 'border-border hover:border-primary/50'
      },
      invalid: { true: 'border-destructive', false: '' }
    }
  }
)

interface SiteStyleFieldProps {
  control: Control<SiteFormValues>
  name: 'architectureStyleId' | 'interiorStyleId'
  label: string
  options: SiteCatalog['styles']
  disabled: boolean
}

export function SiteStyleField({ control, name, label, options, disabled }: SiteStyleFieldProps) {
  const t = useTranslations('contractors.siteForm')

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem id={`site-field-${name}`}>
          <FormLabel>
            {label}
            <span className='text-destructive' aria-hidden>
              {' '}
              *
            </span>
          </FormLabel>
          <FormControl>
            <RadioGroup
              ref={field.ref}
              name={field.name}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              aria-label={label}
              className='grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3'
            >
              {options.map((style) => {
                const selected = field.value === style.id
                const id = `site-style-${name}-${style.id}`
                return (
                  <div key={style.id} className='relative min-w-0'>
                    <RadioGroupItem
                      id={id}
                      value={style.id}
                      aria-label={style.name}
                      className='peer sr-only size-px border-0 shadow-none'
                    />
                    <Label htmlFor={id} className={styleCardVariants({ selected, invalid: fieldState.invalid })}>
                      {style.imageUrl.trim() ? (
                        <Photo
                          src={style.imageUrl}
                          alt={style.name}
                          className='aspect-4/3 w-full'
                          sizes='(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px'
                        />
                      ) : (
                        <span className='bg-muted text-muted-foreground flex aspect-4/3 w-full flex-col items-center justify-center gap-2 px-2 text-center text-xs'>
                          <ImageOff className='size-6' aria-hidden />
                          {t('noStyleImage')}
                        </span>
                      )}
                      {selected ? (
                        <span className='bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full'>
                          <Check className='size-4' aria-hidden />
                        </span>
                      ) : null}
                      <span className='flex min-h-13 w-full items-center px-3 py-2 text-sm leading-snug font-medium'>
                        {style.name}
                      </span>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
