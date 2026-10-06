import { useAuthStore } from '@/shared/auth'
import { cmsDb } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import type {
  ChangeRequest,
  StageEvent,
  StageKey,
  StageUploadPayload,
  SupervisionProject,
  SupervisionStage
} from '../types/supervision.types'

/**
 * Mock trong trình duyệt của bảng điều khiển giám sát (S20–S23), bật bằng
 * `NEXT_PUBLIC_USE_MOCK_API=true`.
 *
 * Dự án mẫu được dựng NEO THEO NGÀY HÔM NAY chứ không phải ngày cố định: bản mô
 * tả có bốn trạng thái giai đoạn khác nhau (đã xác nhận, đang thực hiện, sắp
 * tới, có yêu cầu sửa đổi chờ duyệt) và chúng chỉ cùng tồn tại khi lịch chạy
 * quanh hiện tại. Ngày cứng thì vài tuần nữa mở lên chỉ còn "quá hạn tất cả".
 */
/**
 * Dự án giám sát nằm ở bảng `supervisionProjects` của `shared/cms`, không ở một
 * kho riêng của feature: R5 giao việc XÁC NHẬN GIAI ĐOẠN cho kỹ sư Giám sát,
 * nên khu quản trị phải ghi được đúng bản ghi mà màn này đang đọc.
 */

/** `now + days` ở dạng ISO. Số âm là lùi về quá khứ. */
function shift(days: number): string {
  const date = new Date()
  date.setHours(9, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function event(offsetDays: number, actor: StageEvent['actor'], text: string, milestone = false): StageEvent {
  return { id: `${offsetDays}-${text}`, at: shift(offsetDays), actor, text, milestone }
}

/**
 * Dự án mẫu: 3 giai đoạn đã xác nhận, 1 đang thực hiện, 2 sắp tới — cùng một
 * yêu cầu sửa đổi đang chờ khách duyệt ở giai đoạn 3 (S22) và một yêu cầu đã
 * được duyệt ở giai đoạn 2 (S23).
 */
function seedProject(projectId: string, projectName: string): SupervisionProject {
  const legal: SupervisionStage = {
    key: 'legal',
    index: 1,
    plannedStart: shift(-62),
    plannedEnd: shift(-48),
    actualStart: shift(-62),
    actualEnd: shift(-60),
    status: 'confirmed',
    version: 'v1',
    files: [
      { id: 'f1', name: 'Giấy phép xây dựng', kind: 'document', by: 'KH', uploadedAt: shift(-60) },
      { id: 'f2', name: 'Hồ sơ thiết kế kiến trúc', kind: 'document', by: 'KH', uploadedAt: shift(-60) },
      { id: 'f3', name: 'Hợp đồng thi công', kind: 'document', by: 'KH', uploadedAt: shift(-60) },
      { id: 'f4', name: 'Biên bản bàn giao mặt bằng', kind: 'document', by: 'KH', uploadedAt: shift(-59) }
    ],
    comments: [],
    inspection: {
      confirmedAt: shift(-58),
      engineer: 'KS. Trần Minh Hùng',
      onSite: false,
      note: 'Hồ sơ pháp lý đầy đủ, khớp với thiết kế đã duyệt.'
    },
    changeRequests: [],
    history: [
      event(-62, 'SYS', 'Lập lịch giai đoạn 1 theo mẫu 6 giai đoạn'),
      event(-60, 'KH', 'Tải lên: Giấy phép xây dựng và hồ sơ thiết kế'),
      event(-60, 'SYS', 'Giai đoạn 1 hoàn thành', true),
      event(-58, 'GS', 'Xác nhận giai đoạn 1 – hồ sơ khóa v1', true)
    ]
  }

  const foundation: SupervisionStage = {
    key: 'foundation',
    index: 2,
    plannedStart: shift(-48),
    plannedEnd: shift(-34),
    actualStart: shift(-47),
    actualEnd: shift(-37),
    status: 'confirmed',
    version: 'v2',
    files: [
      {
        id: 'f5',
        name: 'Định vị tim trục và hố móng M1–M4',
        kind: 'photo',
        by: 'KH',
        capturedAt: shift(-45),
        uploadedAt: shift(-45)
      },
      {
        id: 'f6',
        name: 'Cốt thép móng băng trục B',
        kind: 'photo',
        by: 'KH',
        capturedAt: shift(-42),
        uploadedAt: shift(-42)
      },
      { id: 'f7', name: 'Đổ bê tông móng', kind: 'photo', by: 'KH', capturedAt: shift(-39), uploadedAt: shift(-39) },
      {
        id: 'f8',
        name: 'Kiểm tra cốt thép và kích thước hố móng tại hiện trường',
        kind: 'photo',
        by: 'GS',
        capturedAt: shift(-40),
        uploadedAt: shift(-40),
        fromInspection: true
      },
      {
        id: 'f9',
        name: 'Cột chờ C3 sau khi tháo cốp pha',
        kind: 'photo',
        by: 'KH',
        capturedAt: shift(-33),
        uploadedAt: shift(-32),
        addedInVersion: 'v2'
      }
    ],
    comments: [
      {
        id: 'c1',
        author: 'KS. Trần Minh Hùng',
        role: 'GS',
        at: shift(-40),
        text: 'Kích thước hố móng và cốt thép đúng bản vẽ KC-01. Chân cột chờ C3 rỗ nhẹ, xử lý bề mặt trước khi lên cột.'
      },
      {
        id: 'c2',
        author: 'Chủ nhà',
        role: 'KH',
        at: shift(-32),
        text: 'Đã nhắc nhà thầu xử lý, xin bổ sung ảnh sau khi tháo cốp pha.',
        changeRequestId: 'CR-01'
      }
    ],
    inspection: {
      confirmedAt: shift(-37),
      engineer: 'KS. Trần Minh Hùng',
      onSite: true,
      note: 'Móng đạt yêu cầu theo bản vẽ; theo dõi xử lý bề mặt cột chờ C3 ở giai đoạn phần thô.'
    },
    changeRequests: [
      {
        id: 'CR-01',
        by: 'KH',
        proposedAt: shift(-33),
        decidedAt: shift(-32),
        status: 'applied',
        reason: 'Bổ sung ảnh cột chờ C3 sau khi tháo cốp pha để hồ sơ giai đoạn đầy đủ hơn.',
        response: 'Ảnh đúng vị trí, đồng ý bổ sung.',
        resultVersion: 'v2'
      }
    ],
    history: [
      event(-48, 'SYS', 'Lập lịch giai đoạn 2 theo mẫu 6 giai đoạn'),
      event(-47, 'SYS', 'Giai đoạn 2 bắt đầu'),
      event(-45, 'KH', 'Tải lên: Định vị tim trục và hố móng M1–M4'),
      event(-39, 'SYS', 'Giai đoạn 2 hoàn thành', true),
      event(-40, 'GS', 'Kiểm tra thực tế tại công trình (lượt 1)'),
      event(-37, 'GS', 'Xác nhận giai đoạn 2 – hồ sơ khóa v1', true),
      event(-33, 'KH', 'Gửi yêu cầu sửa đổi CR-01 (ảnh, nhận xét)'),
      event(-32, 'GS', 'Duyệt CR-01: Đồng ý áp dụng – phiên bản v2', true)
    ]
  }

  const structure: SupervisionStage = {
    key: 'structure',
    index: 3,
    plannedStart: shift(-34),
    plannedEnd: shift(-4),
    actualStart: shift(-34),
    actualEnd: shift(-12),
    status: 'confirmed',
    version: 'v1',
    files: [
      {
        id: 'f10',
        name: 'Cốt thép dầm sàn tầng 1 trục 1–4',
        kind: 'photo',
        by: 'KH',
        capturedAt: shift(-26),
        uploadedAt: shift(-26)
      },
      {
        id: 'f11',
        name: 'Đổ bê tông sàn tầng 1, bảo dưỡng ngày 3',
        kind: 'photo',
        by: 'KH',
        capturedAt: shift(-22),
        uploadedAt: shift(-22)
      },
      {
        id: 'f12',
        name: 'Xây tường tầng 1, lanh tô cửa sổ',
        kind: 'photo',
        by: 'KH',
        capturedAt: shift(-14),
        uploadedAt: shift(-14)
      },
      {
        id: 'f13',
        name: 'Kiểm tra cốt thép dầm sàn trước khi đổ bê tông',
        kind: 'photo',
        by: 'GS',
        capturedAt: shift(-24),
        uploadedAt: shift(-24),
        fromInspection: true
      }
    ],
    comments: [
      {
        id: 'c3',
        author: 'KS. Trần Minh Hùng',
        role: 'GS',
        at: shift(-15),
        text: 'Chiều dày sàn 12 cm đo tại 3 điểm, cốt thép đủ số thanh. Mạch vữa tường đều.'
      },
      {
        id: 'c4',
        author: 'Chủ nhà',
        role: 'KH',
        at: shift(-15),
        text: 'Nhà thầu báo xong tường tầng 2 trong tuần này.'
      }
    ],
    inspection: {
      confirmedAt: shift(-12),
      engineer: 'KS. Trần Minh Hùng',
      onSite: true,
      note: 'Kết cấu phần thô đạt; cột chờ C3 đã xử lý bề mặt. Được chuyển sang hệ thống kỹ thuật.'
    },
    changeRequests: [
      {
        id: 'CR-02',
        by: 'GS',
        proposedAt: shift(-2),
        status: 'pending',
        dueAt: shift(5),
        reason:
          'Bổ sung ảnh mạch ngừng bê tông tại trục C và ghi chú kết quả đo độ sụt — hồ sơ giai đoạn thiếu hai mục này khi đối chiếu biên bản nghiệm thu.'
      }
    ],
    history: [
      event(-34, 'SYS', 'Lập lịch giai đoạn 3 theo mẫu 6 giai đoạn'),
      event(-34, 'SYS', 'Giai đoạn 3 bắt đầu'),
      event(-26, 'KH', 'Tải lên: Cốt thép dầm sàn tầng 1 trục 1–4'),
      event(-14, 'SYS', 'Giai đoạn 3 hoàn thành', true),
      event(-24, 'GS', 'Kiểm tra thực tế tại công trình (lượt 2)'),
      event(-12, 'GS', 'Xác nhận giai đoạn 3 – hồ sơ khóa v1', true),
      event(-2, 'GS', 'Gửi yêu cầu sửa đổi CR-02 (ảnh) – chờ Khách hàng duyệt')
    ]
  }

  const mep: SupervisionStage = {
    key: 'mep',
    index: 4,
    plannedStart: shift(-4),
    plannedEnd: shift(16),
    actualStart: shift(-4),
    status: 'inProgress',
    version: 'v1',
    files: [
      {
        id: 'f14',
        name: 'Đi ống điện âm tường tầng 1',
        kind: 'photo',
        by: 'KH',
        capturedAt: shift(-2),
        uploadedAt: shift(-2)
      }
    ],
    comments: [
      {
        id: 'c5',
        author: 'KS. Trần Minh Hùng',
        role: 'GS',
        at: shift(-1),
        text: 'Đã kiểm tra thử áp đạt. Anh/chị tải ảnh ống điện, đồng hồ thử áp và chống thấm (kèm tên) để hoàn thành giai đoạn trước hạn.'
      }
    ],
    changeRequests: [],
    history: [
      event(-20, 'SYS', 'Lập lịch giai đoạn 4 theo mẫu 6 giai đoạn'),
      event(-4, 'SYS', 'Giai đoạn 4 bắt đầu'),
      event(-1, 'GS', 'Kiểm tra thực tế tại công trình (lượt 3)')
    ]
  }

  const finishing: SupervisionStage = {
    key: 'finishing',
    index: 5,
    plannedStart: shift(16),
    plannedEnd: shift(61),
    status: 'upcoming',
    version: 'v1',
    files: [],
    comments: [],
    changeRequests: [],
    history: [event(-20, 'SYS', 'Lập lịch giai đoạn 5 theo mẫu 6 giai đoạn')],
    prepHint: 'Trát, ốp lát, trần thạch cao, sơn nước, cửa, thiết bị vệ sinh.'
  }

  const handover: SupervisionStage = {
    key: 'handover',
    index: 6,
    plannedStart: shift(61),
    plannedEnd: shift(75),
    status: 'upcoming',
    version: 'v1',
    files: [],
    comments: [],
    changeRequests: [],
    history: [event(-20, 'SYS', 'Lập lịch giai đoạn 6 theo mẫu 6 giai đoạn')],
    prepHint: 'Danh sách hạng mục cần khắc phục, hồ sơ hoàn công, biên bản bàn giao.'
  }

  return {
    id: projectId,
    projectName,
    packageTier: 'check',
    packageCode: `SVC-${new Date().getFullYear()}-0001-AT`,
    engineer: 'KS. Trần Minh Hùng',
    activatedAt: shift(-62),
    expiresAt: shift(118),
    handoverDate: shift(75),
    plannedHandoverDate: shift(88),
    inspectionsUsed: 3,
    inspectionsTotal: 6,
    stages: [legal, foundation, structure, mep, finishing, handover]
  }
}

/**
 * Chủ dự án của bản mock = tài khoản đang mở bảng điều khiển. Backend thật trả
 * sẵn chủ dự án; ở đây phải lấy từ phiên đăng nhập để màn quản trị biết dự án
 * giám sát này là của ai.
 */
function currentOwner(): SupervisionProject['customer'] {
  const user = useAuthStore.getState().user
  return user ? { name: user.name, phone: user.phone ?? '', email: user.email } : undefined
}

/** Lấy dự án trong kho, dựng dữ liệu mẫu ở lần mở đầu tiên. */
function ensureProject(projectId: string): SupervisionProject {
  const owner = currentOwner()
  const existing = cmsDb.find('supervisionProjects', projectId)
  if (existing) {
    // Bản ghi dựng trước khi có trường chủ dự án — bổ sung ở lần mở kế tiếp.
    return existing.customer || !owner
      ? existing
      : cmsDb.upsert('supervisionProjects', { ...existing, customer: owner })
  }
  const project = seedProject(projectId, 'Nhà phố Tân Lợi 2 tầng')
  return cmsDb.upsert('supervisionProjects', owner ? { ...project, customer: owner } : project)
}

function replaceStage(
  project: SupervisionProject,
  stageKey: StageKey,
  update: (stage: SupervisionStage) => SupervisionStage
): SupervisionProject {
  return {
    ...project,
    stages: project.stages.map((stage) => (stage.key === stageKey ? update(stage) : stage))
  }
}

/** `v1` → `v2`. */
function nextVersion(version: string): string {
  return `v${Number(version.replace('v', '')) + 1}`
}

export const mockSupervisionApi = {
  getProject: async (projectId: string): Promise<SupervisionProject> => {
    await mockDelay(300)
    return ensureProject(projectId)
  },

  uploadStage: async (projectId: string, payload: StageUploadPayload): Promise<SupervisionProject> => {
    await mockDelay(500)
    const project = ensureProject(projectId)
    const now = new Date().toISOString()

    const updated = replaceStage(project, payload.stageKey, (stage) => ({
      ...stage,
      // Tải lên là giai đoạn hoàn thành phần khách (R9); Giám sát xác nhận sau,
      // nên giai đoạn CHƯA khóa và vẫn ở trạng thái đang thực hiện.
      actualEnd: now,
      files: [
        ...stage.files,
        ...payload.files.map((_file, index) => ({
          id: `${Date.now()}-${index}`,
          name: payload.files.length > 1 ? `${payload.name} (${index + 1})` : payload.name,
          kind: payload.kind,
          by: 'KH' as const,
          capturedAt: now,
          uploadedAt: now
        }))
      ],
      history: [
        ...stage.history,
        { id: `${Date.now()}`, at: now, actor: 'KH' as const, text: `Tải lên: ${payload.name}` },
        {
          id: `${Date.now()}-done`,
          at: now,
          actor: 'SYS' as const,
          text: `Giai đoạn ${stage.index} hoàn thành`,
          milestone: true
        }
      ]
    }))

    return cmsDb.upsert('supervisionProjects', updated)
  },

  addComment: async (projectId: string, stageKey: StageKey, text: string): Promise<SupervisionProject> => {
    await mockDelay(250)
    const project = ensureProject(projectId)
    const now = new Date().toISOString()

    const updated = replaceStage(project, stageKey, (stage) => ({
      ...stage,
      comments: [...stage.comments, { id: `${Date.now()}`, author: 'Chủ nhà', role: 'KH', at: now, text }]
    }))

    return cmsDb.upsert('supervisionProjects', updated)
  },

  decideChangeRequest: async (
    projectId: string,
    stageKey: StageKey,
    changeRequestId: string,
    approve: boolean
  ): Promise<SupervisionProject> => {
    await mockDelay(400)
    const project = ensureProject(projectId)
    const now = new Date().toISOString()

    const updated = replaceStage(project, stageKey, (stage) => {
      const version = approve ? nextVersion(stage.version) : stage.version
      const changeRequests = stage.changeRequests.map<ChangeRequest>((request) =>
        request.id === changeRequestId
          ? {
              ...request,
              status: approve ? 'applied' : 'rejected',
              decidedAt: now,
              ...(approve ? { resultVersion: version } : {})
            }
          : request
      )

      return {
        ...stage,
        version,
        changeRequests,
        history: [
          ...stage.history,
          {
            id: `${Date.now()}`,
            at: now,
            actor: 'KH',
            text: approve
              ? `Duyệt ${changeRequestId}: Đồng ý áp dụng – phiên bản ${version}`
              : `Từ chối ${changeRequestId} – giữ nguyên ${version}`,
            milestone: true
          }
        ]
      }
    })

    return cmsDb.upsert('supervisionProjects', updated)
  },

  createChangeRequest: async (projectId: string, stageKey: StageKey, reason: string): Promise<SupervisionProject> => {
    await mockDelay(400)
    const project = ensureProject(projectId)
    const now = new Date().toISOString()

    const updated = replaceStage(project, stageKey, (stage) => {
      const id = `CR-${String(stage.changeRequests.length + 1).padStart(2, '0')}`
      return {
        ...stage,
        changeRequests: [...stage.changeRequests, { id, by: 'KH', proposedAt: now, status: 'pending', reason }],
        history: [
          ...stage.history,
          { id: `${Date.now()}`, at: now, actor: 'KH', text: `Gửi yêu cầu sửa đổi ${id} – chờ Giám sát duyệt` }
        ]
      }
    })

    return cmsDb.upsert('supervisionProjects', updated)
  }
}
