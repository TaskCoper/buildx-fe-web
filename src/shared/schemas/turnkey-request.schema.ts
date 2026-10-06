import { z } from 'zod'

import { isValidPhone } from '@/shared/utils'

/** Resolved, localized validation messages injected into the schema. */
export interface TurnkeyRequestSchemaMessages {
  nameRequired: string
  phoneRequired: string
  phoneInvalid: string
  emailInvalid: string
  provinceRequired: string
  noteMaxLength: string
}

export const TURNKEY_NOTE_MAX_LENGTH = 500

/**
 * Form "Đăng ký triển khai" — lựa chọn 2 của popup chọn hướng (S08).
 *
 * Bản mô tả chỉ viết một dòng "Đăng ký triển khai → form đăng ký, Ops liên hệ",
 * không liệt kê trường nào. Bộ trường ở đây lấy đúng thứ Ops cần để gọi lại,
 * theo tiền lệ của hai màn đã có: S16 thu "Thông tin liên hệ nhận xác nhận
 * (SĐT, email)" và S17 ghi đội hỗ trợ sẽ gọi để "làm rõ nhu cầu".
 */
export function createTurnkeyRequestSchema(m: TurnkeyRequestSchemaMessages) {
  return z.object({
    name: z.string().trim().min(1, { message: m.nameRequired }),
    phone: z.string().trim().min(1, { message: m.phoneRequired }).refine(isValidPhone, { message: m.phoneInvalid }),
    // Góp ý BuildX: email không bắt buộc; thêm khu vực (tỉnh / thành) để Ops chia người gọi.
    email: z.union([z.literal(''), z.email({ message: m.emailInvalid })]),
    province: z.string().trim().min(1, { message: m.provinceRequired }),
    note: z.string().trim().max(TURNKEY_NOTE_MAX_LENGTH, { message: m.noteMaxLength })
  })
}

export type TurnkeyRequestFormValues = z.infer<ReturnType<typeof createTurnkeyRequestSchema>>
