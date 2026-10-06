import { z } from 'zod'

/** Resolved, localized validation messages injected into the schema. */
export interface ReviewSchemaMessages {
  ratingRequired: string
  commentMaxLength: string
}

export const REVIEW_COMMENT_MAX_LENGTH = 500

/**
 * Đánh giá nhà thầu sau khi lời mời hoàn tất.
 *
 * Chỉ hai trường: số sao bắt buộc, nhận xét tuỳ chọn. Bản mô tả không liệt kê
 * tiêu chí chấm điểm nào nên không tự bịa thêm — thẻ nhà thầu ở S12/S13/S18 chỉ
 * hiển thị MỘT con số đánh giá, vậy thu đúng một con số.
 */
export function createReviewSchema(m: ReviewSchemaMessages) {
  return z.object({
    rating: z.number().int().min(1, { message: m.ratingRequired }).max(5),
    comment: z.string().trim().max(REVIEW_COMMENT_MAX_LENGTH, { message: m.commentMaxLength })
  })
}

export type ReviewFormValues = z.infer<ReturnType<typeof createReviewSchema>>
