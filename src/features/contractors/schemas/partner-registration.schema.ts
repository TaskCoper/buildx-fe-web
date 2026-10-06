import { z } from 'zod'

import type { RequiredMessage } from '@/shared/hooks'

import { isValidPhone } from '@/shared/utils'

export interface PartnerRegistrationSchemaMessages {
  required: RequiredMessage
  email: string
  phone: string
}

export function createPartnerRegistrationSchema(m: PartnerRegistrationSchemaMessages) {
  return z.object({
    contractorName: z
      .string()
      .trim()
      .min(1, { message: m.required('contractorName') }),
    phone: z
      .string()
      .trim()
      .min(1, { message: m.required('phone') })
      .refine(isValidPhone, { message: m.phone }),
    email: z
      .string()
      .trim()
      .min(1, { message: m.required('email') })
      .email({ message: m.email })
  })
}

export type PartnerRegistrationFormValues = z.infer<ReturnType<typeof createPartnerRegistrationSchema>>
