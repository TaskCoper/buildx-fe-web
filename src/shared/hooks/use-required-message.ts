import { useCallback } from 'react'
import { useTranslations } from 'next-intl'

/** Keys of `validation.fields` — the label named in a "… là bắt buộc" message. */
export type RequiredField =
  | 'fullName'
  | 'projectName'
  | 'contractorName'
  | 'email'
  | 'phone'
  | 'password'
  | 'currentPassword'
  | 'newPassword'
  | 'confirmPassword'
  | 'verifyCode'
  | 'address'
  | 'street'
  | 'province'
  | 'ward'
  | 'buildingType'
  | 'scale'
  | 'floorCount'
  | 'hasAttic'
  | 'architectureStyle'
  | 'interiorStyle'
  | 'landPhoto'
  | 'date'
  | 'timeSlot'
  | 'note'

/** Schema-facing signature: resolves "<field> is required" for a given field. */
export type RequiredMessage = (field: RequiredField) => string

/**
 * Builds the "required" message that names the field ("Email là bắt buộc",
 * "Địa chỉ là bắt buộc") instead of a generic "Trường này là bắt buộc".
 */
export function useRequiredMessage(): RequiredMessage {
  const t = useTranslations('validation')
  return useCallback(
    (field) => {
      // Guard: an unknown / non-string key must never surface as
      // "validation.fields.[object Object]" — fall back to the generic message.
      const key = typeof field === 'string' ? (`fields.${field}` as `fields.${RequiredField}`) : null
      return key && t.has(key) ? t('requiredField', { field: t(key) }) : t('required')
    },
    [t]
  )
}
