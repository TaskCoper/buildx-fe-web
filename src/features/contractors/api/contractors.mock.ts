import type { ContractorSearchFilters } from '@/shared/contractors'
import {
  cmsDb,
  isActiveSurvey,
  isBriefSupported,
  isContractorEligible,
  isSurveySlotClosed,
  surveyBookableDays,
  surveyDateKey,
  surveySlotRange
} from '@/shared/cms'
import { useAuthStore } from '@/shared/auth'
import { mockDelay } from '@/shared/lib/mock'
import type { ApiProject } from './contractors.logic'
import { MAX_INVITATIONS } from '../constants/contractors.constants'
import { emptyBrief, fullAddress, isBlankBrief } from '../services/brief.service'
import { isLegacyConstructionScope } from '../services/construction-scope.service'
import type {
  Contractor,
  ContractorReview,
  Invitation,
  InvitationStatus,
  ProjectBrief,
  ProjectBriefSummary,
  SurveyBooking,
  SurveyRequest,
  SurveySlot
} from '../types/contractor.types'
import type { CreateBriefFromDesignPayload, SaveBriefPayload, SurveyRequestDetail } from './contractors.api'
import { BRIEFS_SEED } from './briefs.seed'

/**
 * Mock trong trình duyệt của luồng Tìm nhà thầu (S09–S18), bật bằng
 * `NEXT_PUBLIC_USE_MOCK_API=true`.
 *
 * Giống mock của luồng thiết kế, dữ liệu nằm ở `localStorage` chứ không phải bộ
 * nhớ tab: hồ sơ dự án là việc kéo dài nhiều phiên (lưu nháp rồi quay lại — S10),
 * còn lời mời thì phải sống đủ lâu để thấy ô đếm "Đã mời x/3" (R1) hoạt động.
 */
const STORE_KEY = 'savico.mock-contractors'

/**
 * LỜI MỜI KHÔNG nằm trong kho này mà ở bảng `contractorInvitations` của
 * `shared/cms`. R4 giao việc đẩy bốn nấc trạng thái cho đội vận hành, nên màn
 * quản trị phải ghi được đúng bản ghi mà trang khách đang đọc — hai kho riêng
 * thì admin bấm một nơi, khách xem một nẻo.
 */

interface MockStore {
  sequence: number
  invitationSequence: number
  requestSequence: number
  briefs: Record<string, ProjectBrief>
  requests: Record<string, SurveyRequest>
  /** Đánh giá nhà thầu, khoá theo mã lời mời — mỗi lời mời một lần. */
  reviews: Record<string, ContractorReview>
}

/**
 * Kho khởi tạo — nạp sẵn bốn hồ sơ mẫu (xem `briefs.seed`) để hộp thoại "Chọn
 * dự án" có đủ bốn trạng thái ngay lần mở đầu, không phải tự tạo tay từng cái.
 *
 * `sequence` nhảy qua số của các hồ sơ mẫu, nếu không thì dự án khách tạo tiếp
 * theo sẽ trùng mã với một hồ sơ mẫu và ghi đè lên nó.
 */
const emptyStore = (): MockStore => ({
  sequence: BRIEFS_SEED.length,
  invitationSequence: 141,
  requestSequence: 141,
  briefs: Object.fromEntries(BRIEFS_SEED.map((brief) => [brief.id, brief])),
  requests: {},
  reviews: {}
})

function loadStore(): MockStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    return raw ? { ...emptyStore(), ...(JSON.parse(raw) as MockStore) } : emptyStore()
  } catch {
    return emptyStore()
  }
}

function saveStore(store: MockStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

/** Mã dự án `SVC-YYYY-NNNN` — cùng quy ước với luồng thiết kế. */
function nextProjectId(store: MockStore): string {
  store.sequence += 1
  return `SVC-${new Date().getFullYear()}-${String(store.sequence).padStart(4, '0')}`
}

/** Mã lời mời `INV-YYYY-NNNN` hiện trên mỗi thẻ ở S18. */
function nextInvitationId(store: MockStore): string {
  store.invitationSequence += 1
  return `INV-${new Date().getFullYear()}-${String(store.invitationSequence).padStart(4, '0')}`
}

/** Mã yêu cầu khảo sát `KS-YYYY-NNNN` hiện ở S17. */
function nextRequestId(store: MockStore): string {
  store.requestSequence += 1
  return `KS-${new Date().getFullYear()}-${String(store.requestSequence).padStart(4, '0')}`
}

function notFound(what: string): never {
  throw new Error(`Mock: không tìm thấy ${what}`)
}

/**
 * Lời mời vừa gửi luôn ở nấc đầu tiên. Ba nấc sau do đội hỗ trợ SAVICO cập nhật
 * trong khu quản trị (R4) nên mock KHÔNG tự đẩy trạng thái theo thời gian — làm
 * vậy sẽ dựng ra một luồng tự động không tồn tại trong sản phẩm thật.
 */
function initialSteps(sentAt: string): Invitation['steps'] {
  return [{ status: 'sent' as InvitationStatus, at: sentAt }]
}

/**
 * Lời mời của một dự án, cũ trước mới sau.
 *
 * `cmsDb.upsert` đẩy bản ghi mới lên ĐẦU bảng để bảng quản trị thấy việc mới
 * nhất trước; thẻ ở S18 thì phải giữ đúng thứ tự khách đã gửi.
 */
function invitationsOf(projectId: string): Invitation[] {
  return (
    cmsDb
      .list('contractorInvitations')
      .filter((invitation) => invitation.projectId === projectId)
      // Cả một lượt gửi dùng CHUNG một `sentAt`, nên so mỗi mốc thời gian là hòa —
      // và thứ tự còn lại là thứ tự đảo của bảng. Mã lời mời tăng dần theo lượt
      // gửi nên nó mới là thứ phá hòa đúng: ABC → An Gia → Hưng Phát.
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id))
  )
}

/**
 * Gắn trạng thái `contracted` cho hồ sơ đã chốt được nhà thầu.
 *
 * Backend thật sẽ tự giữ cờ này, nhưng ở bản mock thì SUY RA từ lời mời: khảo
 * sát · báo giá · thương thảo · hợp đồng đều làm ngoài web (R3) nên thứ duy
 * nhất trên web đánh dấu "xong" là đội vận hành đẩy một lời mời của dự án lên
 * nấc cuối (R4). Suy ra thay vì thêm một cờ phải tự đặt bằng tay, nhờ vậy màn
 * quản trị sẵn có đã đủ để chạy tới trạng thái này.
 */
function withDerivedStatus(brief: ProjectBrief): ProjectBrief {
  const settled = cmsDb
    .list('contractorInvitations')
    .some((invitation) => invitation.projectId === brief.id && invitation.status === 'done')
  return settled ? { ...brief, status: 'contracted' } : brief
}

/**
 * Bản công khai của một nhà thầu (epic ContractorManagement §4, §8, §10, §12).
 * Đầu mối liên hệ, ghi chú nội bộ, lịch sử quản trị, mã số pháp lý đầy đủ và
 * bằng chứng xác minh dự án là dữ liệu của vận hành — backend thật không trả
 * chúng ra trang công khai, mock cũng vậy. Dự án Ẩn không lên hồ sơ; bản scan
 * hợp tác chỉ hiện khi được phép công khai; giấy phép quá hạn không còn là Đã
 * xác minh.
 */
function publicProfile({
  contact: _contact,
  history: _history,
  unverifyReason: _unverifyReason,
  ...contractor
}: Contractor): Contractor {
  const today = new Date().toISOString().slice(0, 10)
  const legal = contractor.legalProfile
  const { internalNote: _internalNote, ...partnership } = contractor.partnership
  return {
    ...contractor,
    featuredProjects: contractor.featuredProjects
      .filter((project) => !project.hidden)
      .map(
        ({ evidence: _evidence, verifiedBy: _verifiedBy, unverifications: _unverifications, ...project }) => project
      ),
    partnership: partnership.scanPublic === false ? { ...partnership, scanUrl: undefined } : partnership,
    legalProfile: legal
      ? {
          ...legal,
          taxCode: undefined,
          registrationNumber: undefined,
          licenseScanUrl: undefined,
          licenseHistory: undefined,
          licenseRejectReason: undefined,
          licenseReviewedBy: undefined,
          registrationStatus:
            legal.licenseValidUntil && legal.licenseValidUntil < today ? 'pending' : legal.registrationStatus
        }
      : legal
  }
}

/** Nhà thầu đã có lịch khảo sát còn hiệu lực đúng ngày + khung giờ này. */
function isSlotTaken(contractorId: string, date: string, slotId: string): boolean {
  return cmsDb
    .list('contractorInvitations')
    .some(
      (invitation) =>
        invitation.contractorId === contractorId &&
        invitation.survey.date === date &&
        invitation.survey.slotId === slotId &&
        isActiveSurvey(invitation)
    )
}

function contractorName(contractorId: string): string {
  return cmsDb.find('contractors', contractorId)?.name ?? contractorId
}

export const mockContractorsApi = {
  /** Dự án mock đã có đủ dữ liệu trên thẻ trong danh sách — không có chi tiết riêng để bổ sung. */
  getContractorProject: async (_contractorId: string, _projectId: string): Promise<ApiProject | null> => null,

  /**
   * Danh sách đề xuất theo Quy tắc đề xuất nhà thầu do admin cấu hình (spec
   * admin #12, BR-075): nhà thầu Ẩn không bao giờ vào; khu vực, tiêu chí đủ điều
   * kiện và năng lực khớp hồ sơ đang chọn. Hồ sơ thuộc loại công trình không
   * được hỗ trợ thì không có đề xuất. Bán kính và tab vùng lọc tiếp ở giao diện.
   */
  listContractors: async (
    projectId: string,
    filters: ContractorSearchFilters = {},
    _signal?: AbortSignal
  ): Promise<Contractor[]> => {
    await mockDelay(250)
    const rules = cmsDb.getDocument('contractorMatching')
    const brief = loadStore().briefs[projectId]
    // Hồ sơ lưu nhãn loại công trình — quy về mã trong danh mục dùng chung để so năng lực.
    const buildingType = brief
      ? cmsDb.list('buildingTypes').find((type) => type.label === brief.buildingType)
      : undefined
    // Chỉ Loại công trình đang Hoạt động mới dùng để đề xuất nhà thầu (ContractorManagement §12).
    if (buildingType && buildingType.status !== 'active') return []
    const buildingTypeId = buildingType?.id ?? null
    const context = brief && isLegacyConstructionScope(brief.scope) ? { buildingTypeId, scope: brief.scope } : undefined
    if (!isBriefSupported(rules, context)) return []
    const today = new Date().toISOString().slice(0, 10)
    return cmsDb
      .list('contractors')
      .filter((contractor) => isContractorEligible(contractor, rules, today, context))
      .filter((contractor) => !filters.region || contractor.region === filters.region)
      .map(publicProfile)
  },

  /** Vẫn mở được hồ sơ nhà thầu đã ẩn — lời mời cũ của khách trỏ tới đây. */
  getContractor: async (contractorId: string): Promise<Contractor> => {
    await mockDelay(200)
    const contractor = cmsDb.find('contractors', contractorId)
    return contractor ? publicProfile(contractor) : notFound(`nhà thầu ${contractorId}`)
  },

  createBrief: async (): Promise<ProjectBrief> => {
    await mockDelay(200)
    const store = loadStore()
    // Hồ sơ mở form rồi thoát, chưa điền gì, thì bỏ đi — không để lại "Hồ sơ chưa đặt tên" (NT30).
    for (const [id, brief] of Object.entries(store.briefs)) if (isBlankBrief(brief)) delete store.briefs[id]
    const now = new Date().toISOString()
    const brief: ProjectBrief = {
      ...emptyBrief(),
      id: nextProjectId(store),
      status: 'ready',
      createdAt: now,
      updatedAt: now
    }
    store.briefs[brief.id] = brief
    saveStore(store)
    return brief
  },

  createBriefFromDesign: async (payload: CreateBriefFromDesignPayload): Promise<ProjectBrief> => {
    await mockDelay(250)
    const store = loadStore()
    const now = new Date().toISOString()
    const brief: ProjectBrief = {
      ...emptyBrief(),
      name: payload.name,
      buildingType: payload.buildingType,
      landArea: payload.landArea,
      selfCreated: false,
      id: nextProjectId(store),
      status: 'ready',
      createdAt: now,
      updatedAt: now
    }
    store.briefs[brief.id] = brief
    saveStore(store)
    return brief
  },

  listBriefs: async (): Promise<ProjectBrief[]> => {
    await mockDelay(150)
    return Object.values(loadStore().briefs)
      .filter((brief) => !isBlankBrief(brief))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  listBriefSummaries: async (): Promise<ProjectBriefSummary[]> => {
    await mockDelay(200)
    // Đếm lời mời MỘT lần cho cả bảng thay vì lọc lại theo từng dự án: hộp thoại
    // liệt kê mọi hồ sơ nên cách kia là n lần quét cùng một mảng.
    const counts = new Map<string, number>()
    for (const invitation of cmsDb.list('contractorInvitations')) {
      counts.set(invitation.projectId, (counts.get(invitation.projectId) ?? 0) + 1)
    }
    return Object.values(loadStore().briefs)
      .filter((brief) => !isBlankBrief(brief))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((brief) => ({ brief: withDerivedStatus(brief), invitedCount: counts.get(brief.id) ?? 0 }))
  },

  getBrief: async (projectId: string): Promise<ProjectBrief> => {
    await mockDelay(150)
    const brief = loadStore().briefs[projectId] ?? notFound(`hồ sơ dự án ${projectId}`)
    return withDerivedStatus(brief)
  },

  saveBrief: async (projectId: string, payload: SaveBriefPayload): Promise<ProjectBrief> => {
    await mockDelay(250)
    const store = loadStore()
    const current = store.briefs[projectId] ?? notFound(`hồ sơ dự án ${projectId}`)
    // Phiên bản hiện tại đã nằm trong một lời mời → lần sửa này mở phiên bản mới;
    // lời mời cũ giữ nguyên bản chụp của bản cũ. Sửa tiếp khi chưa gửi thì vẫn ở bản mới đó.
    const version = current.version ?? 1
    const sentVersion = invitationsOf(projectId).some((invitation) => invitation.dossierVersion === `v${version}`)
    const updated: ProjectBrief = {
      ...current,
      ...payload,
      version: sentVersion ? version + 1 : version,
      updatedAt: new Date().toISOString()
    }
    store.briefs[projectId] = updated
    saveStore(store)
    return updated
  },

  completeBrief: async (projectId: string): Promise<ProjectBrief> => {
    await mockDelay(250)
    const store = loadStore()
    const current = store.briefs[projectId] ?? notFound(`hồ sơ dự án ${projectId}`)
    const updated: ProjectBrief = { ...current, status: 'ready', updatedAt: new Date().toISOString() }
    store.briefs[projectId] = updated
    saveStore(store)
    return updated
  },

  /**
   * Khung giờ của một ngày theo Lịch khảo sát do admin cấu hình (spec admin
   * #13): chỉ khung đang bật; khung bị khóa hoặc nhà thầu đã có lịch khảo sát
   * còn hiệu lực đúng khung đó thì không chọn được.
   */
  listSlots: async (contractorId: string, date: string): Promise<SurveySlot[]> => {
    await mockDelay(150)
    const schedule = cmsDb.getDocument('surveySchedule')
    return schedule.slots
      .filter((slot) => slot.active)
      .map((slot) => ({
        id: slot.id,
        label: surveySlotRange(slot),
        available: !isSurveySlotClosed(schedule, date, slot.id) && !isSlotTaken(contractorId, date, slot.id)
      }))
  },

  listInvitations: async (projectId: string): Promise<Invitation[]> => {
    await mockDelay(200)
    return invitationsOf(projectId)
  },

  createInvitations: async (projectId: string, bookings: SurveyBooking[]): Promise<SurveyRequestDetail> => {
    await mockDelay(400)
    const store = loadStore()
    const existing = invitationsOf(projectId)

    // R1 — chặn ở lớp dữ liệu chứ không chỉ ở nút bấm: mở hai tab rồi mời song
    // song vẫn không vượt được 3 lời mời.
    const room = MAX_INVITATIONS - existing.length
    if (room <= 0) throw new Error('Mock: dự án đã đủ 3 lời mời')

    // STORY-029 — kiểm tra lại ngày / khung giờ với dữ liệu mới nhất lúc gửi.
    const schedule = cmsDb.getDocument('surveySchedule')
    const bookable = new Set(surveyBookableDays(schedule).map(surveyDateKey))
    const stale = bookings.find(
      (booking) =>
        !bookable.has(booking.date) ||
        !schedule.slots.some((slot) => slot.id === booking.slotId && slot.active) ||
        isSurveySlotClosed(schedule, booking.date, booking.slotId) ||
        isSlotTaken(booking.contractorId, booking.date, booking.slotId)
    )
    if (stale) throw new Error('Mock: khung giờ khảo sát vừa chọn không còn trống')

    const sentAt = new Date().toISOString()
    const brief = store.briefs[projectId]
    const created = bookings.slice(0, room).map<Invitation>((booking) => ({
      id: nextInvitationId(store),
      projectId,
      // Tên lặp lại trong bản ghi là có chủ đích — bảng quản trị cần tên để hiện
      // và tìm kiếm, mà danh bạ nhà thầu thì nằm trong feature này.
      projectName: brief?.name ?? projectId,
      contractorId: booking.contractorId,
      contractorName: contractorName(booking.contractorId),
      sentAt,
      status: 'sent',
      updatedAt: sentAt,
      steps: initialSteps(sentAt),
      dossierVersion: `v${brief?.version ?? 1}`,
      fileCount: brief?.documents.length ?? 0,
      survey: booking,
      customerName: useAuthStore.getState().user?.name,
      // Bản chụp hồ sơ lúc gửi — không kèm ngân sách (S18).
      dossier: brief
        ? {
            buildingType: brief.buildingType,
            landArea: brief.landArea,
            scale: brief.scale,
            hasAttic: brief.hasAttic,
            address: fullAddress(brief),
            scope: brief.scope,
            scopeNote: brief.scopeNote,
            startWindow: brief.startWindow,
            documents: brief.documents.map(({ name, sizeBytes }) => ({ name, sizeBytes }))
          }
        : undefined
    }))

    const request: SurveyRequest = {
      id: nextRequestId(store),
      projectId,
      createdAt: sentAt,
      invitationIds: created.map((invitation) => invitation.id)
    }

    created.forEach((invitation) => cmsDb.upsert('contractorInvitations', invitation))
    store.requests[request.id] = request
    if (brief) store.briefs[projectId] = { ...brief, status: 'inviting' }
    saveStore(store)

    return { request, invitations: created }
  },

  getSurveyRequest: async (requestId: string): Promise<SurveyRequestDetail> => {
    await mockDelay(200)
    const store = loadStore()
    const request = store.requests[requestId] ?? notFound(`yêu cầu khảo sát ${requestId}`)
    const all = invitationsOf(request.projectId)
    return { request, invitations: all.filter((invitation) => request.invitationIds.includes(invitation.id)) }
  },

  listReviews: async (projectId: string): Promise<ContractorReview[]> => {
    await mockDelay(150)
    const store = loadStore()
    return Object.values(store.reviews).filter((review) => review.projectId === projectId)
  },

  submitReview: async (invitationId: string, rating: number, comment: string): Promise<ContractorReview> => {
    await mockDelay(250)
    const store = loadStore()

    // Chỉ lời mời đã ở nấc cuối mới đánh giá được — đúng câu S09 quảng cáo
    // "chỉ khách đã làm việc qua SAVICO mới được đánh giá". Chặn ở mock để khi
    // nối API thật, backend chỉ cần lặp lại đúng luật này.
    const invitation = cmsDb.find('contractorInvitations', invitationId) ?? notFound(`lời mời ${invitationId}`)
    const projectId = invitation.projectId
    if (invitation.status !== 'done') throw new Error(`Lời mời ${invitationId} chưa hoàn tất nên chưa đánh giá được.`)
    if (store.reviews[invitationId]) throw new Error(`Lời mời ${invitationId} đã được đánh giá.`)

    const review: ContractorReview = {
      invitationId,
      contractorId: invitation.contractorId,
      projectId,
      rating,
      comment,
      createdAt: new Date().toISOString()
    }
    store.reviews[invitationId] = review
    saveStore(store)
    return review
  }
}
