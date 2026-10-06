import type {
  CmsActor,
  CmsChangeRequest,
  CmsChangeRequestStatus,
  CmsStageComment,
  CmsStageEvent,
  CmsStageFile,
  CmsStageInspection,
  CmsStageKey,
  CmsStageStatus,
  CmsStageVersion,
  CmsSupervisionProject,
  CmsSupervisionStage
} from '@/shared/cms'

/**
 * Kiểu dữ liệu của GÓI GIÁM SÁT THI CÔNG (S19–S24).
 *
 * R5 là xương sống: 6 giai đoạn CỐ ĐỊNH; Giám sát xác nhận thì hồ sơ khóa; sau
 * khi khóa chỉ đổi qua Yêu cầu sửa đổi được bên kia duyệt; nhà thầu chỉ xem.
 * R9: hoàn thành giai đoạn = khách tải ảnh/tài liệu kèm tên — KHÔNG có checklist
 * bắt buộc, nên không type nào ở đây có `checklist`.
 *
 * Bản thân cây dữ liệu sống ở `shared/cms`, không ở feature này: R5 giao việc
 * XÁC NHẬN GIAI ĐOẠN cho kỹ sư Giám sát, tức khu quản trị phải ghi được đúng
 * bản ghi mà bảng điều khiển của khách đang đọc — mà `features/admin` thì không
 * được import `features/supervision`. Dưới đây chỉ là tên gọi trong feature.
 */

/** 6 giai đoạn cố định (R5). Thứ tự mảng cũng là thứ tự thi công. */
export type StageKey = CmsStageKey

/** Trạng thái một giai đoạn — quyết định luôn màn S20 / S21 / S22 / S23. */
export type StageStatus = CmsStageStatus

/** Vai trò trong lịch sử và trên nhãn tệp. */
export type Actor = CmsActor

/** Phiên bản hồ sơ giai đoạn. Khóa ở v1, duyệt sửa đổi thì lên v2, v3... */
export type StageVersion = CmsStageVersion

/** Một tệp trong khối "Ảnh & tài liệu" của giai đoạn. */
export type StageFile = CmsStageFile

/** Một nhận xét trong khối "Nhận xét & trao đổi". */
export type StageComment = CmsStageComment

/** Kết quả kiểm tra thực tế của Giám sát — có thì giai đoạn mới khóa được. */
export type StageInspection = CmsStageInspection

/** Trạng thái một yêu cầu sửa đổi (CR). */
export type ChangeRequestStatus = CmsChangeRequestStatus

/** Yêu cầu sửa đổi hồ sơ đã khóa. */
export type ChangeRequest = CmsChangeRequest

/** Một sự kiện trong "Lịch sử & phiên bản" — không bao giờ bị xóa (R5). */
export type StageEvent = CmsStageEvent

/** Một giai đoạn trong bảng điều khiển. */
export type SupervisionStage = CmsSupervisionStage

/** Toàn bộ dữ liệu một dự án đang được giám sát. */
export type SupervisionProject = CmsSupervisionProject

/** Dữ liệu tải hồ sơ hoàn thành một giai đoạn (S20). */
export interface StageUploadPayload {
  stageKey: StageKey
  kind: 'photo' | 'document'
  name: string
  files: { name: string; sizeBytes: number }[]
}
