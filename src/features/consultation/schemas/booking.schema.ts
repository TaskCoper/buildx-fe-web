import { z } from 'zod'

import { isValidPhone } from '@/shared/utils'

/** Resolved, localized validation messages injected into the schema. */
export interface BookingSchemaMessages {
  phoneRequired: string
  phoneInvalid: string
  noteMaxLength: string
}

export const BOOKING_NOTE_MAX_LENGTH = 300

/**
 * Modal "Xác nhận đặt lịch tư vấn" (mục VIII.3, Hình 16).
 *
 * Chỉ hai trường: SĐT liên lạc (bắt buộc, validate như mục IV.3.d) và Ghi chú
 * (không bắt buộc). KTS / ngày / khung giờ đã chọn ở màn trước nên không nhập lại.
 */
export function createBookingSchema(m: BookingSchemaMessages) {
  return z.object({
    phone: z.string().trim().min(1, { message: m.phoneRequired }).refine(isValidPhone, { message: m.phoneInvalid }),
    note: z.string().trim().max(BOOKING_NOTE_MAX_LENGTH, { message: m.noteMaxLength })
  })
}

export type BookingFormValues = z.infer<ReturnType<typeof createBookingSchema>>
