import { z } from 'zod'

import { isValidPhone } from '@/shared/utils'

/** Resolved, localized validation messages injected into the schema. */
export interface SurveySchemaMessages {
  dateRequired: string
  slotRequired: string
  phoneRequired: string
  phoneInvalid: string
  emailInvalid: string
  noteMaxLength: string
}

export const SURVEY_NOTE_MAX_LENGTH = 300

/**
 * Chọn thời gian khảo sát (S16).
 *
 * Ngày + khung giờ là bắt buộc; SĐT và email nhận xác nhận lấy sẵn từ hồ sơ
 * người dùng nhưng vẫn sửa được, nên vẫn validate ở đây.
 */
export function createSurveySchema(m: SurveySchemaMessages) {
  return z.object({
    date: z.string().min(1, { message: m.dateRequired }),
    slotId: z.string().min(1, { message: m.slotRequired }),
    phone: z.string().trim().min(1, { message: m.phoneRequired }).refine(isValidPhone, { message: m.phoneInvalid }),
    email: z.email({ message: m.emailInvalid }),
    note: z.string().trim().max(SURVEY_NOTE_MAX_LENGTH, { message: m.noteMaxLength })
  })
}

/** RFQ uses the contact syntax of CONSULT, without requiring an editable email. */
export function createQuotationSurveySchema(m: SurveySchemaMessages) {
  return z.object({
    date: z.string().min(1, m.dateRequired),
    slotId: z.string().min(1, m.slotRequired),
    phone: z
      .string()
      .trim()
      .min(1, m.phoneRequired)
      .max(20, m.phoneInvalid)
      .refine((value) => /^\+?[0-9 .\-()]+$/.test(value) && /[0-9]/.test(value), m.phoneInvalid),
    email: z.string(),
    note: z.string().trim().max(5000, m.noteMaxLength)
  })
}

export type SurveyFormValues = z.infer<ReturnType<typeof createSurveySchema>>
