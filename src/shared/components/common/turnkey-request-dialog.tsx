'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useAuthStore } from '@/shared/auth'
import { ComboboxField, FieldLabel } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { useGetProvinces, useRequiredMessage } from '@/shared/hooks'
import {
  TURNKEY_NOTE_MAX_LENGTH,
  createTurnkeyRequestSchema,
  type TurnkeyRequestFormValues
} from '@/shared/schemas/turnkey-request.schema'

interface TurnkeyRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Form "Đăng ký triển khai" — hành vi của lựa chọn 2 ở popup chọn hướng (S08:
 * "Đăng ký triển khai → form đăng ký, Ops liên hệ").
 *
 * Trước đây nút này chỉ bắn một toast, tức bản mô tả có nói tới form mà app
 * chưa dựng. Ba trường liên hệ tự điền theo tài khoản nhưng vẫn sửa được —
 * khách có thể muốn Ops gọi vào số khác, giống {@link BookingDialog} ở S16.
 *
 * Nằm ở `shared/` cùng chỗ với {@link StartOptions} vì cả `checkout` (S08) và
 * `contractors` (S11) đều mở nó, mà hai feature thì không import lẫn nhau.
 *
 * CHƯA NỐI BACKEND: gửi xong chỉ báo đã ghi nhận, đúng như mọi luồng mock khác
 * của bản này (`NEXT_PUBLIC_USE_MOCK_API`). Khi API .NET có endpoint đăng ký
 * triển khai thì thay phần thân `onSubmit`, chữ ký component giữ nguyên.
 */
export function TurnkeyRequestDialog({ open, onOpenChange }: TurnkeyRequestDialogProps) {
  const t = useTranslations('contractors.start')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()

  const user = useAuthStore((s) => s.user)
  const { provinces, isLoadingProvinces } = useGetProvinces()

  const schema = useMemo(
    () =>
      createTurnkeyRequestSchema({
        nameRequired: required('fullName'),
        phoneRequired: required('phone'),
        phoneInvalid: tv('phone'),
        emailInvalid: tv('email'),
        provinceRequired: required('province'),
        noteMaxLength: tv('maxLength', { max: TURNKEY_NOTE_MAX_LENGTH })
      }),
    [required, tv]
  )

  const form = useForm<TurnkeyRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', province: '', note: '' }
  })

  // Hồ sơ tài khoản về sau lần render đầu (store hydrate từ localStorage), và
  // mỗi lần mở lại phải sạch ghi chú của lần trước.
  const { reset } = form
  useEffect(() => {
    if (open)
      reset({ name: user?.name ?? '', phone: user?.phone ?? '', email: user?.email ?? '', province: '', note: '' })
  }, [open, user, reset])

  function onSubmit() {
    onOpenChange(false)
    toast.success(t('turnkeyRegistered'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{t('turnkeyForm.title')}</DialogTitle>
          <DialogDescription>{t('turnkeyForm.subtitle')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FieldLabel htmlFor='turnkey-name' hint={t('turnkeyForm.nameHint')} required>
                    {t('turnkeyForm.name')}
                  </FieldLabel>
                  <FormControl>
                    <Input id='turnkey-name' autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor='turnkey-phone' hint={t('turnkeyForm.phoneHint')} required>
                      {t('turnkeyForm.phone')}
                    </FieldLabel>
                    <FormControl>
                      <Input id='turnkey-phone' type='tel' inputMode='tel' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor='turnkey-email' hint={t('turnkeyForm.emailHint')}>
                      {t('turnkeyForm.email')}
                    </FieldLabel>
                    <FormControl>
                      <Input id='turnkey-email' type='email' inputMode='email' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <ComboboxField<TurnkeyRequestFormValues>
              control={form.control}
              name='province'
              label={t('turnkeyForm.province')}
              placeholder={t('turnkeyForm.provincePlaceholder')}
              options={provinces.map((province) => ({ value: province.name, label: province.name }))}
              disabled={isLoadingProvinces}
              modal
              isRequired
              displayError
            />

            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FieldLabel htmlFor='turnkey-note' hint={t('turnkeyForm.noteHint')}>
                    {t('turnkeyForm.note')}
                  </FieldLabel>
                  <FormControl>
                    <Textarea
                      id='turnkey-note'
                      rows={3}
                      placeholder={t('turnkeyForm.notePlaceholder')}
                      maxLength={TURNKEY_NOTE_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className='text-muted-foreground text-xs text-pretty'>{t('turnkeyForm.contactNote')}</p>

            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                {t('turnkeyForm.cancel')}
              </Button>
              <Button type='submit'>{t('turnkeyForm.submit')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
