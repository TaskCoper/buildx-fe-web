/**
 * Public API of the `consultation` feature — Tư vấn 1:1 (mục VIII):
 * danh sách kiến trúc sư, hồ sơ KTS kèm khối chọn khung giờ, modal xác nhận đặt
 * lịch, và section KTS ghim ở trang chủ (mục III.2).
 */
export { ConsultantDirectory } from './components/consultant-directory'
export { ConsultantDetail } from './components/consultant-detail'
export { ConsultantCard } from './components/consultant-card'
export { ConsultantHighlights } from './components/consultant-highlights'
export { ConsultationHistory } from './components/consultation-history'
export { ConsultationAccountPanel } from './components/consultation-account-panel'
export { MyConsultationRequests } from './components/my-consultation-requests'
export { ConsultTransitionStateProvider } from './components/consult-transition-state'
export {
  useConsultants,
  useConsultantDirectory,
  useConsultantSpecialties,
  useConsultant,
  useAvailability,
  useBookConsultation,
  useMyConsultations,
  useMyConsultationRequests,
  useCancelConsultation
} from './hooks/use-consultation'
export {
  filterConsultants,
  findMatchRange,
  sortConsultants,
  specialtyOptions,
  sessionSlots,
  firstOpenDay,
  parseDateKey,
  slotEndTime,
  type ConsultantFilter
} from './services/consultation.service'
export { createBookingSchema, BOOKING_NOTE_MAX_LENGTH, type BookingFormValues } from './schemas/booking.schema'
export {
  AVAILABILITY_DAYS,
  SESSION_TIMES,
  SLOT_MINUTES,
  HOME_CONSULTANT_COUNT
} from './constants/consultation.constants'
export type {
  BookConsultationPayload,
  Consultant,
  ConsultantSpecialty,
  ConsultantWork,
  ConsultationBooking,
  ConsultationBookingStatus,
  ConsultationHistoryBooking,
  ConsultationHistoryStatus,
  ConsultationRequestItem,
  ConsultationRequestStatus,
  ConsultationDay,
  ConsultationSession,
  ConsultationSlot
} from './types/consultation.types'
