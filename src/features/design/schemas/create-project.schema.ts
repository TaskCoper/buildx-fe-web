import { z } from 'zod'

import type { RequiredMessage } from '@/shared/hooks'

/** Resolved, localized validation messages injected into the schema. */
export interface CreateProjectSchemaMessages {
  required: RequiredMessage
  maxLength: string
  descriptionMaxLength: string
}

export const PROJECT_NAME_MAX_LENGTH = 200
export const PROJECT_DESCRIPTION_MAX_LENGTH = 500

/**
 * Modal Tạo dự án (mục III.1): Tên dự án bắt buộc, Mô tả tùy chọn.
 * Messages are resolved at the call site so no UI copy is hardcoded here.
 */
export function createProjectSchema(m: CreateProjectSchemaMessages) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: m.required('projectName') })
      .refine((value) => [...value].length <= PROJECT_NAME_MAX_LENGTH, { message: m.maxLength }),
    description: z
      .string()
      .refine((value) => [...value].length <= PROJECT_DESCRIPTION_MAX_LENGTH, { message: m.descriptionMaxLength })
  })
}

export type CreateProjectFormValues = z.infer<ReturnType<typeof createProjectSchema>>
