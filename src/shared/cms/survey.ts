import { cmsDb } from './cms.db'
import type { CmsContractorInvitation, CmsSurveySchedule } from './cms.types'

/**
 * Lịch khảo sát (S16, spec admin #13) — dùng chung giữa màn chọn giờ của khách
 * và màn lịch khảo sát của vận hành. Cấu hình nằm ở tài liệu `surveySchedule`;
 * mã khung giờ `slot-<n>` cố định vì lịch đã đặt trỏ tới nó.
 */

/** `YYYY-MM-DD` theo giờ máy — cùng quy ước với ô chọn ngày của khách. */
export function surveyDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function surveySlotRange(slot: { start: string; end: string }): string {
  return `${slot.start} – ${slot.end}`
}

/** `slot-2` → `10:00 – 11:00` theo cấu hình hiện hành. Mã lạ thì trả nguyên mã. */
export function surveySlotLabel(
  slotId: string,
  schedule: CmsSurveySchedule = cmsDb.getDocument('surveySchedule')
): string {
  const slot = schedule.slots.find((item) => item.id === slotId)
  return slot ? surveySlotRange(slot) : slotId
}

/** Mã mới cho khung giờ thêm sau — không tái dùng mã cũ để lịch đã đặt không trỏ nhầm. */
export function nextSurveySlotId(schedule: CmsSurveySchedule): string {
  const max = schedule.slots.reduce((top, slot) => Math.max(top, Number(slot.id.replace('slot-', '')) || 0), -1)
  return `slot-${max + 1}`
}

export function isSurveyDayClosed(schedule: CmsSurveySchedule, date: string): boolean {
  return schedule.closures.some((closure) => closure.date === date && closure.slotId === null)
}

export function isSurveySlotClosed(schedule: CmsSurveySchedule, date: string, slotId: string): boolean {
  return schedule.closures.some(
    (closure) => closure.date === date && (closure.slotId === null || closure.slotId === slotId)
  )
}

/**
 * Các ngày khách được chọn: `windowDays` ngày làm việc kế tiếp tính từ ngày mai,
 * bỏ ngày nghỉ trong tuần và ngày bị khóa cả ngày.
 */
export function surveyBookableDays(schedule: CmsSurveySchedule, from: Date = new Date()): Date[] {
  const result: Date[] = []
  if (!schedule.workingDays.length || schedule.windowDays < 1) return result
  // Chặn vòng lặp vô hạn khi mọi ngày làm việc đều bị khóa.
  for (let offset = 1; result.length < schedule.windowDays && offset <= 366; offset += 1) {
    const date = new Date(from)
    date.setDate(from.getDate() + offset)
    if (!schedule.workingDays.includes(date.getDay())) continue
    if (isSurveyDayClosed(schedule, surveyDateKey(date))) continue
    result.push(date)
  }
  return result
}

/** Lịch khảo sát còn hiệu lực (chưa hủy, lời mời chưa bị từ chối) đang giữ một khung giờ. */
export function isActiveSurvey(invitation: CmsContractorInvitation): boolean {
  return invitation.survey.status !== 'cancelled' && invitation.status !== 'rejected'
}
