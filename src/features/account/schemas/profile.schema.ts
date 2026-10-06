import { z } from 'zod'

import { isValidPhone } from '@/shared/utils'

/** Resolved, localized validation messages injected into the schema. */
export interface ProfileSchemaMessages {
  nameRequired: string
  nameMaxLength: string
  phoneInvalid: string
}

export const PROFILE_NAME_MAX_LENGTH = 60

/**
 * Form "Chỉnh sửa" của thẻ hồ sơ trang Tài khoản (mục IX, Hình 17).
 *
 * Chỉ hai trường sửa được: họ tên và số điện thoại. Email là danh tính đăng
 * nhập — đổi được thì phải xác minh lại hộp thư, việc đó thuộc backend nên ô
 * email trong hộp thoại chỉ để đọc.
 *
 * Số điện thoại KHÔNG bắt buộc: tài khoản đăng ký bằng Google chưa có số nào,
 * và thẻ hồ sơ đã có sẵn trạng thái "Chưa cập nhật" cho trường hợp đó. Nhưng
 * đã điền thì phải đúng định dạng như mục IV.3.d.
 */
export function createProfileSchema(m: ProfileSchemaMessages) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: m.nameRequired })
      .max(PROFILE_NAME_MAX_LENGTH, { message: m.nameMaxLength }),
    phone: z
      .string()
      .trim()
      .refine((value) => value === '' || isValidPhone(value), { message: m.phoneInvalid })
  })
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>
