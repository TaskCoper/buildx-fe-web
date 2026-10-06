'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import type { AuthUser } from '@/shared/auth'
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
import { useUpdateProfile } from '../hooks/use-update-profile'
import { createProfileSchema, PROFILE_NAME_MAX_LENGTH, type ProfileFormValues } from '../schemas/profile.schema'

interface ProfileEditDialogProps {
  open: boolean
  onClose: () => void
  /** Hồ sơ đang đăng nhập — dùng để nạp giá trị ban đầu vào form. */
  user: AuthUser
}

/**
 * Hộp thoại sau nút "Chỉnh sửa" của thẻ hồ sơ (mục IX, Hình 17).
 *
 * Sửa họ tên và số điện thoại. Email hiện ở dạng CHỈ ĐỌC chứ không giấu đi:
 * khách cần thấy mình đang đăng nhập bằng hộp thư nào, nhưng đổi nó là đổi danh
 * tính đăng nhập nên phải qua luồng xác minh của backend.
 */
export function ProfileEditDialog({ open, onClose, user }: ProfileEditDialogProps) {
  const t = useTranslations('account.info')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()
  const tCommon = useTranslations('common')
  const updateProfile = useUpdateProfile()

  const schema = useMemo(
    () =>
      createProfileSchema({
        nameRequired: required('fullName'),
        nameMaxLength: tv('maxLength', { max: PROFILE_NAME_MAX_LENGTH }),
        phoneInvalid: tv('phone')
      }),
    [required, tv]
  )

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '' }
  })

  const { reset } = form
  // Nạp lại mỗi lần mở: khách bấm Hủy giữa chừng rồi mở lại phải thấy giá trị
  // đang lưu, không phải bản gõ dở lần trước.
  useEffect(() => {
    if (open) reset({ name: user.name, phone: user.phone ?? '' })
  }, [open, user.name, user.phone, reset])

  function onSubmit(values: ProfileFormValues) {
    updateProfile.mutate(values, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>{t('editDialog.description')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor='profile-name'>{t('name')}</Label>
                  <FormControl>
                    <Input id='profile-name' maxLength={PROFILE_NAME_MAX_LENGTH} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor='profile-phone'>{t('phone')}</Label>
                  <FormControl>
                    <Input
                      id='profile-phone'
                      type='tel'
                      inputMode='tel'
                      placeholder={t('editDialog.phonePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  {/* Nói trước số này dùng để làm gì — cùng câu với dòng mô tả
                      của thẻ hồ sơ, để khách hiểu vì sao nên điền. */}
                  <p className='text-muted-foreground text-xs text-pretty'>{t('description')}</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='space-y-2'>
              <Label htmlFor='profile-email'>{t('email')}</Label>
              {/* `readOnly` chứ KHÔNG `disabled`: ô này vẫn phải đọc được và
                  chọn-sao chép được, mà `disabled` thì trình duyệt tô mờ chữ
                  đến mức trông như ô còn trống chưa điền. */}
              <Input id='profile-email' value={user.email} readOnly className='bg-muted text-muted-foreground' />
              <p className='text-muted-foreground text-xs text-pretty'>{t('editDialog.emailLocked')}</p>
            </div>

            <DialogFooter className='gap-2 sm:gap-2'>
              <Button type='button' variant='ghost' onClick={onClose}>
                {tCommon('cancel')}
              </Button>
              <Button type='submit' disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
                {t('editDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
