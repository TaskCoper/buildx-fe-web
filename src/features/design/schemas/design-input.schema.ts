import { z } from 'zod'

import type { RequiredMessage } from '@/shared/hooks'

import { WISHES_MAX_LENGTH } from '../constants/design.constants'

/** Resolved, localized validation messages injected into the schema. */
export interface DesignInputSchemaMessages {
  required: RequiredMessage
  maxLength: string
}

/**
 * Bước 1 — Nhập liệu (mục III.2).
 *
 * Không có trường kích thước lô đất: hình dạng và tỷ lệ do AI nhận diện từ ảnh.
 * Các trường chỉ áp dụng cho Nhà ở / Nhà phố được kiểm tra có điều kiện ở
 * `superRefine`, khớp với điều kiện kích hoạt nút ở mục VI.
 */
export function createDesignInputSchema(m: DesignInputSchemaMessages) {
  return z
    .object({
      landPhotoUrl: z.string().min(1, { message: m.required('landPhoto') }),
      address: z
        .string()
        .trim()
        .min(1, { message: m.required('address') }),
      buildingType: z.enum(['house', 'townhouse', 'apartment']),
      floorCount: z.enum(['ground', 'ground+1', 'ground+2', 'ground+3', 'ground+4']).nullable(),
      hasAttic: z.boolean().nullable(),
      packageTier: z.enum(['basic', 'standard', 'vip']),
      architectureStyle: z.enum(['roofed', 'modern-townhouse', 'neoclassical']).nullable(),
      interiorStyle: z.string().min(1, { message: m.required('interiorStyle') }),
      wishes: z.string().max(WISHES_MAX_LENGTH, { message: m.maxLength })
    })
    .superRefine((values, ctx) => {
      // Căn hộ: hệ thống khóa các trường này ngay trên giao diện, không báo lỗi.
      if (values.buildingType === 'apartment') return

      const conditional = ['floorCount', 'hasAttic', 'architectureStyle'] as const
      for (const field of conditional) {
        if (values[field] === null) {
          ctx.addIssue({ code: 'custom', path: [field], message: m.required(field) })
        }
      }
    })
}

export type DesignInputFormValues = z.infer<ReturnType<typeof createDesignInputSchema>>
