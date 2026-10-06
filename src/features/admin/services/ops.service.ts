import type { CmsContractorInvitation, CmsInvitationStatus, CmsSupervisionProject, CmsSurveyStatus } from '@/shared/cms'

/**
 * Logic thuần của các màn VẬN HÀNH — không React, không HTTP.
 *
 * Mỗi hàm trả về bản ghi MỚI để màn gọi lưu; không hàm nào tự ghi kho. Nhờ vậy
 * khi có backend, mỗi hàm chuyển thành một endpoint mà màn quản trị không phải
 * đổi logic hiển thị.
 *
 * Không có hàm nào cho thanh toán: trạng thái đơn do backend cập nhật qua webhook,
 * vận hành không xác nhận tiền bằng tay.
 */

/** Phút đã trôi qua kể từ một mốc ISO — cột "chờ bao lâu" của các hàng đợi. */
export function minutesSince(iso: string | undefined, now = Date.now()): number | null {
  if (!iso) return null
  const at = new Date(iso).getTime()
  return Number.isFinite(at) ? Math.max(0, Math.round((now - at) / 60_000)) : null
}

/** "5 phút trước" / "2 giờ trước" / "3 ngày trước" theo ngôn ngữ đang xem. */
export function relativeTime(iso: string | undefined, locale: string, now = Date.now()): string {
  const minutes = minutesSince(iso, now)
  if (minutes === null) return ''
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (minutes < 60) return format.format(-minutes, 'minute')
  if (minutes < 60 * 24) return format.format(-Math.round(minutes / 60), 'hour')
  return format.format(-Math.round(minutes / (60 * 24)), 'day')
}

/* ---------------------------------------------------------------------------
 * LỜI MỜI BÁO GIÁ (S18, R4).
 * ------------------------------------------------------------------------ */

/** Bốn nấc của thanh trạng thái ở S18, đúng thứ tự đi tới. */
export const INVITATION_STATUS_ORDER: readonly CmsInvitationStatus[] = ['sent', 'received', 'accepted', 'done']

/** Nấc kế tiếp, hoặc `null` khi lời mời đã ở nấc cuối / đã bị từ chối. */
export function nextInvitationStatus(status: CmsInvitationStatus): CmsInvitationStatus | null {
  if (status === 'rejected') return null
  return INVITATION_STATUS_ORDER[INVITATION_STATUS_ORDER.indexOf(status) + 1] ?? null
}

/** Lời mời đã kết thúc: Hoàn tất hoặc Đã từ chối. */
export function isInvitationClosed(invitation: CmsContractorInvitation): boolean {
  return invitation.status === 'done' || invitation.status === 'rejected'
}

/**
 * Từ chối lời mời (spec admin #14) — nhánh kết thúc, bắt buộc lý do, ghi mốc
 * vào `steps` để dòng thời gian có thời điểm từ chối. Lịch khảo sát đi kèm
 * không còn giữ khung giờ (`isActiveSurvey`).
 */
export function rejectInvitation(
  invitation: CmsContractorInvitation,
  reason: string,
  now = new Date()
): CmsContractorInvitation {
  const at = now.toISOString()
  return {
    ...invitation,
    status: 'rejected',
    rejectReason: reason.trim(),
    updatedAt: at,
    steps: [...invitation.steps, { status: 'rejected', at }]
  }
}

/** Nấc liền trước, hoặc `null` khi lời mời còn ở nấc đầu (nấc do khách tạo, không lùi được). */
export function previousInvitationStatus(status: CmsInvitationStatus): CmsInvitationStatus | null {
  const index = INVITATION_STATUS_ORDER.indexOf(status)
  return index > 0 ? (INVITATION_STATUS_ORDER[index - 1] ?? null) : null
}

/** Đi tới đúng một nấc và ghi mốc vào `steps` — dòng thời gian khách thấy ở S18. */
export function advanceInvitation(invitation: CmsContractorInvitation, now = new Date()): CmsContractorInvitation {
  const next = nextInvitationStatus(invitation.status)
  if (!next) return invitation
  const at = now.toISOString()
  return { ...invitation, status: next, updatedAt: at, steps: [...invitation.steps, { status: next, at }] }
}

/**
 * Hoàn tác nấc vừa chuyển nhầm: lùi một nấc và BỎ mốc đó khỏi `steps`.
 *
 * Bỏ hẳn chứ không ghi thêm một mốc "lùi": dòng thời gian của khách chỉ nên có
 * những việc đã thật sự xảy ra, một nấc bấm nhầm thì chưa từng xảy ra.
 */
export function revertInvitation(invitation: CmsContractorInvitation, now = new Date()): CmsContractorInvitation {
  const previous = previousInvitationStatus(invitation.status)
  if (!previous) return invitation
  const lastIndex = invitation.steps.map((step) => step.status).lastIndexOf(invitation.status)
  const steps = lastIndex >= 0 ? invitation.steps.filter((_, index) => index !== lastIndex) : invitation.steps
  return { ...invitation, status: previous, updatedAt: now.toISOString(), steps }
}

/* ---------------------------------------------------------------------------
 * LỊCH KHẢO SÁT (S16–S17, R3).
 * ------------------------------------------------------------------------ */

export function surveyStatusOf(invitation: CmsContractorInvitation): CmsSurveyStatus {
  return invitation.survey.status ?? 'requested'
}

/** Lịch khảo sát cần gọi xác nhận: khách mới chọn giờ, hoặc vừa đổi giờ mà chưa chốt lại. */
export function surveyNeedsAction(invitation: CmsContractorInvitation): boolean {
  const status = surveyStatusOf(invitation)
  return status === 'requested' || status === 'rescheduled'
}

/**
 * Lời mời đang chờ vận hành: lịch khảo sát chưa chốt, hoặc lời mời còn ở nấc
 * đầu "Đã gửi" — chưa ai gọi nhà thầu. Bộ lọc mặc định của "Lời mời & khảo sát"
 * và hàng đợi cùng tên ở trang Tổng quan đếm theo đúng hàm này.
 */
export function invitationNeedsAction(invitation: CmsContractorInvitation): boolean {
  if (invitation.status === 'rejected') return false
  return surveyNeedsAction(invitation) || invitation.status === 'sent'
}

export function updateSurvey(
  invitation: CmsContractorInvitation,
  patch: { status: CmsSurveyStatus; date?: string; slotId?: string; note: string },
  now = new Date()
): CmsContractorInvitation {
  const note = patch.note.trim()
  return {
    ...invitation,
    updatedAt: now.toISOString(),
    survey: {
      ...invitation.survey,
      status: patch.status,
      handledAt: now.toISOString(),
      ...(patch.date ? { date: patch.date } : {}),
      ...(patch.slotId ? { slotId: patch.slotId } : {}),
      ...(note ? { opsNote: note } : {})
    }
  }
}

/* ---------------------------------------------------------------------------
 * YÊU CẦU SỬA ĐỔI giám sát (R5).
 * ------------------------------------------------------------------------ */

/** Một CR đang chờ Giám sát duyệt — do KHÁCH đề xuất (S23). */
export interface PendingChangeRequest {
  projectId: string
  projectName: string
  engineer: string
  stageKey: CmsSupervisionProject['stages'][number]['key']
  stageIndex: number
  stageVersion: string
  changeRequestId: string
  proposedAt: string
  dueAt?: string
  reason: string
}

/**
 * CR chờ phía SAVICO duyệt. CR do Giám sát đề xuất (`by: 'GS'`) thì KHÁCH duyệt
 * trên bảng điều khiển (S22) — không thuộc hàng đợi này.
 */
export function pendingChangeRequests(projects: readonly CmsSupervisionProject[]): PendingChangeRequest[] {
  return projects.flatMap((project) =>
    project.stages.flatMap((stage) =>
      stage.changeRequests
        .filter((request) => request.status === 'pending' && request.by === 'KH')
        .map<PendingChangeRequest>((request) => ({
          projectId: project.id,
          projectName: project.projectName,
          engineer: project.engineer,
          stageKey: stage.key,
          stageIndex: stage.index,
          stageVersion: stage.version,
          changeRequestId: request.id,
          proposedAt: request.proposedAt,
          ...(request.dueAt ? { dueAt: request.dueAt } : {}),
          reason: request.reason
        }))
    )
  )
}

/** `v1` → `v2`. Phiên bản lạ thì thêm hậu tố thay vì đoán số. */
export function nextVersion(version: string): string {
  const match = /^v(\d+)$/.exec(version)
  return match ? `v${Number(match[1]) + 1}` : `${version}.1`
}

/**
 * Duyệt / từ chối một CR của khách. Duyệt thì hồ sơ giai đoạn lên phiên bản mới;
 * từ chối thì GIỮ NGUYÊN phiên bản đang khóa (R5). Cả hai đều ghi một mốc vào
 * "Lịch sử & phiên bản" — lịch sử không bao giờ bị xóa.
 */
export function decideChangeRequest(
  project: CmsSupervisionProject,
  target: { stageKey: string; changeRequestId: string },
  decision: { approve: boolean; response: string },
  now = new Date()
): CmsSupervisionProject {
  const at = now.toISOString()
  const response = decision.response.trim()

  return {
    ...project,
    stages: project.stages.map((stage) => {
      if (stage.key !== target.stageKey) return stage
      const version = decision.approve ? nextVersion(stage.version) : stage.version
      return {
        ...stage,
        version,
        changeRequests: stage.changeRequests.map((request) =>
          request.id === target.changeRequestId
            ? {
                ...request,
                status: decision.approve ? 'applied' : 'rejected',
                decidedAt: at,
                ...(response ? { response } : {}),
                ...(decision.approve ? { resultVersion: version } : {})
              }
            : request
        ),
        history: [
          ...stage.history,
          {
            id: `${Date.now()}-GS-${target.changeRequestId}`,
            at,
            actor: 'GS',
            text: decision.approve
              ? `Duyệt ${target.changeRequestId}: Đồng ý áp dụng – phiên bản ${version}`
              : `Từ chối ${target.changeRequestId} – giữ nguyên ${version}`,
            milestone: true
          }
        ]
      }
    })
  }
}
