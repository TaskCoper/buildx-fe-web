import { mockDelay } from '@/shared/lib/mock'
import type { ApiError } from '@/shared/types'
import { DESIGN_INPUT_CONFIG_ERROR } from '../constants/design.constants'
import { designInputConfigErrors, emptyDesignInput } from '../services/design-input.service'
import { grandTotal, rollUpSections, subItemAmount, type DraftSection } from '../services/estimate.service'
import { projectStatus } from '../services/project-list.service'
import type {
  DesignInput,
  DesignQuota,
  Dossier,
  EstimateResult,
  EstimateSection,
  Project,
  SharedDossier
} from '../types/design.types'
import type { CreateProjectPayload } from './design.api'

/**
 * In-browser mock of the design-flow API, enabled by
 * `NEXT_PUBLIC_USE_MOCK_API=true`. Numbers are illustrative placeholders — the
 * real hạng mục and đơn giá come from Phụ lục 02.
 */

/**
 * Màn hình chờ là một phần của trải nghiệm, không phải thời gian chết: người
 * dùng đọc cẩm nang cá nhân hóa trong lúc AI chạy (mục III.3a). Mock phải đủ
 * lâu để nhìn thấy vòng tiến độ đi qua cả 4 giai đoạn và panel dùng được.
 */
const ESTIMATE_DELAY_MS = 9_000
const RENDER_DELAY_MS = 11_000

/**
 * Dung lượng ước tính của bộ hồ sơ PDF, chỉ để nút "Tải hồ sơ PDF ~{cỡ}" có số
 * mà hiển thị khi chưa dựng file (mục IV.8). Backend thật thay bằng cỡ thật.
 */
const ESTIMATED_PDF_BYTES = 18_000_000

/**
 * Dữ liệu mock nằm ở localStorage chứ không phải bộ nhớ tab: luồng 3 bước kéo
 * dài qua nhiều lần tải trang (thoát ra vào lại vẫn còn nháp — mục III.2), nên
 * Map thuần sẽ làm mất dự án ngay khi F5. Backend thật thay hẳn chỗ này.
 */
const STORE_KEY = 'savico.mock-design'

interface MockStore {
  sequence: number
  projects: Record<string, Project>
  inputs: Record<string, DesignInput>
  dossiers: Record<string, Dossier>
  /** Lúc dự toán của từng dự án dựng xong (ISO). */
  estimatedAt?: Record<string, string>
  /** Số lượt thiết kế miễn phí đã dùng — phục vụ hạn mức ở mục IV.3.c. */
  designsUsed: number
}

/**
 * Lượt thiết kế miễn phí của khách chưa mua gói. Con số thật do admin cấu hình
 * (mục X, #7); đây chỉ là seed cho bản mock.
 */
const FREE_DESIGN_LIMIT = 3

/**
 * Tổng diện tích sàn AI "ước tính" của bản mock — một con số duy nhất cho mọi
 * dự án. Backend thật tính từ dữ liệu Bước 1; ở đây ba chỗ phải dùng CHUNG một
 * hằng (bảng dự toán, hồ sơ chia sẻ, dòng meta trên thẻ dự án) vì ba chỗ đó
 * cùng in một con số ra màn hình.
 */
const ESTIMATED_FLOOR_AREA = 240

const emptyStore = (): MockStore => ({ sequence: 0, projects: {}, inputs: {}, dossiers: {}, designsUsed: 0 })

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
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // hết quota — phiên hiện tại vẫn chạy, chỉ không sống qua lần tải sau
  }
}

/** Đọc–sửa–ghi trong một nhịp để hai lời gọi song song không đè lên nhau. */
function updateStore<T>(mutate: (store: MockStore) => T): T {
  const store = loadStore()
  const result = mutate(store)
  saveStore(store)
  return result
}

/** Mã dự án theo quy ước xuyên suốt (mục I): `SVC-YYYY-NNNN`. */
const nextId = (store: MockStore) => `SVC-${new Date().getFullYear()}-${String(++store.sequence).padStart(4, '0')}`

/**
 * Dự án lưu bằng phiên bản mock cũ thiếu `updatedAt` / `status`. Bù lại lúc đọc
 * để phần còn lại của feature luôn nhận đủ kiểu `Project` (backend thật trả
 * sẵn hai trường này).
 */
function normalizeProject(project: Project): Project {
  return {
    ...project,
    updatedAt: project.updatedAt ?? project.createdAt,
    status: project.status ?? projectStatus(project.currentStep)
  }
}

/** Mọi thao tác chạm vào dự án đều đẩy `updatedAt` — thẻ hiện "Cập nhật {ngày}". */
function touchProject(store: MockStore, projectId: string, patch: Partial<Project> = {}): void {
  const project = store.projects[projectId]
  if (!project) return
  store.projects[projectId] = normalizeProject({ ...project, ...patch, updatedAt: new Date().toISOString() })
}

/** Rút gọn khai báo hạng mục con: `[id, nhãn, đơn vị, khối lượng, đơn giá]`. */
type SubItemSeed = readonly [string, string, string, number, number]

function sub(...seeds: SubItemSeed[]) {
  return seeds.map(([id, label, unit, quantity, unitPrice]) => ({
    id,
    label,
    unit,
    quantity,
    unitPrice,
    amount: subItemAmount({ id, label, unit, quantity, unitPrice })
  }))
}

/**
 * Hạng mục lớn + hạng mục con của một căn nhà phố mẫu. Thành tiền hạng mục lớn
 * và tổng từng phần được cộng dồn từ đây, nên bảng trên màn hình luôn khớp file
 * Excel. Danh mục và đơn giá thật lấy theo Phụ lục 02.
 */
const SECTION_SEEDS: DraftSection[] = [
  {
    section: 'structure',
    items: [
      {
        id: 'foundation',
        label: 'Móng, cọc',
        children: sub(
          ['pile', 'Ép cọc bê tông ly tâm D300', 'm', 240, 550_000],
          ['excavation', 'Đào đất hố móng, phá đầu cọc', 'm³', 60, 350_000],
          ['footing', 'Bê tông, cốt thép đài và giằng móng', 'm³', 42, 2_800_000],
          ['formwork', 'Cốp pha, nhân công phần móng', 'm²', 130, 380_000]
        )
      },
      {
        id: 'frame',
        label: 'Khung, sàn, mái',
        children: sub(
          ['column', 'Cột, dầm bê tông cốt thép', 'm³', 78, 3_200_000],
          ['slab', 'Sàn bê tông cốt thép', 'm²', 240, 1_150_000],
          ['stair', 'Cầu thang, mái bê tông', 'm²', 46, 1_400_000],
          ['scaffold', 'Giàn giáo, cốp pha phần thân', 'm²', 250, 200_000]
        )
      },
      {
        id: 'masonry',
        label: 'Xây tô, chống thấm',
        children: sub(
          ['wall', 'Xây tường gạch ống', 'm²', 420, 285_000],
          ['plaster', 'Tô trát tường trong và ngoài', 'm²', 840, 105_000],
          ['waterproof', 'Chống thấm vệ sinh, ban công, mái', 'm²', 96, 220_000],
          ['screed', 'Cán nền, tạo dốc', 'm²', 216, 50_000]
        )
      }
    ]
  },
  {
    section: 'finishing',
    items: [
      {
        id: 'floor',
        label: 'Lát nền, ốp tường, sơn nước',
        children: sub(
          ['tile-floor', 'Gạch lát nền 800×800', 'm²', 240, 620_000],
          ['tile-wall', 'Ốp tường khu vệ sinh và bếp', 'm²', 86, 540_000],
          ['stone', 'Đá granite bậc tam cấp, cầu thang', 'm', 38, 1_250_000],
          ['paint', 'Sơn nước trong và ngoài nhà', 'm²', 840, 95_000]
        )
      },
      {
        id: 'door-window',
        label: 'Cửa, lan can, trần',
        children: sub(
          ['main-door', 'Cửa chính gỗ tự nhiên', 'bộ', 1, 28_000_000],
          ['room-door', 'Cửa phòng, cửa vệ sinh', 'bộ', 8, 6_500_000],
          ['glass', 'Cửa nhôm kính, vách kính', 'm²', 46, 3_200_000],
          ['railing', 'Lan can, tay vịn cầu thang', 'm', 24, 2_400_000],
          ['ceiling', 'Trần thạch cao khung chìm', 'm²', 210, 320_000]
        )
      },
      {
        id: 'mep',
        label: 'Điện, nước, thiết bị vệ sinh',
        children: sub(
          ['electric', 'Hệ thống điện và chiếu sáng', 'hệ', 1, 96_000_000],
          ['plumbing', 'Hệ thống cấp thoát nước', 'hệ', 1, 62_000_000],
          ['sanitary', 'Thiết bị vệ sinh', 'bộ', 4, 18_500_000],
          ['hvac', 'Máy lạnh, quạt thông gió', 'bộ', 5, 14_000_000]
        )
      }
    ]
  },
  {
    section: 'interior',
    items: [
      {
        id: 'built-in',
        label: 'Nội thất gỗ cố định',
        children: sub(
          ['kitchen', 'Tủ bếp trên và dưới', 'm', 6, 9_500_000],
          ['wardrobe', 'Tủ quần áo âm tường', 'm²', 24, 4_200_000],
          ['tv-wall', 'Kệ tivi, tủ trang trí phòng khách', 'bộ', 1, 42_000_000],
          ['shoe', 'Tủ giày, vách trang trí sảnh', 'bộ', 1, 26_000_000]
        )
      },
      {
        id: 'loose',
        label: 'Nội thất rời',
        children: sub(
          ['sofa', 'Sofa, bàn trà phòng khách', 'bộ', 1, 38_000_000],
          ['dining', 'Bàn ăn 6 ghế', 'bộ', 1, 24_000_000],
          ['bed', 'Giường, nệm, tab đầu giường', 'bộ', 3, 22_000_000],
          ['desk', 'Bàn làm việc, ghế', 'bộ', 2, 9_500_000]
        )
      },
      {
        id: 'lighting',
        label: 'Chiếu sáng, rèm, trang trí',
        children: sub(
          ['lamp', 'Đèn trang trí, đèn hắt', 'bộ', 1, 46_000_000],
          ['curtain', 'Rèm cửa', 'm²', 62, 850_000],
          ['decor', 'Tranh, cây xanh, phụ kiện trang trí', 'bộ', 1, 18_000_000]
        )
      }
    ]
  }
]

const SAMPLE_SECTIONS: EstimateSection[] = rollUpSections(SECTION_SEEDS)

/**
 * Hồ sơ đã chia sẻ, lưu ở localStorage thay vì bộ nhớ tab: link chia sẻ phải mở
 * được ở tab / cửa sổ khác thì mới thử được luồng "gửi cho người khác xem"
 * (mục III.4c). Backend thật sẽ thay hẳn chỗ này.
 */
const SHARE_STORAGE_KEY = 'savico.mock-shared-dossiers'

function readShared(): Record<string, SharedDossier> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(SHARE_STORAGE_KEY) ?? '{}') as Record<string, SharedDossier>
  } catch {
    return {}
  }
}

function persistShared(store: MockStore, projectId: string): void {
  if (typeof window === 'undefined') return
  const project = store.projects[projectId]
  if (!project) return

  const entry: SharedDossier = {
    projectName: project.name,
    address: store.inputs[projectId]?.address ?? '',
    createdAt: project.createdAt,
    sections: SAMPLE_SECTIONS,
    grandTotal: grandTotal(SAMPLE_SECTIONS),
    estimatedFloorArea: ESTIMATED_FLOOR_AREA
  }
  try {
    const all = { ...readShared(), [`share-${projectId.toLowerCase()}`]: entry }
    window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // hết quota / chặn storage — link chia sẻ chỉ mở được trong tab hiện tại
  }
}

export const mockDesignApi = {
  getQuota: async (): Promise<DesignQuota> => {
    await mockDelay(120)
    const used = loadStore().designsUsed
    // Mock luôn là khách chưa mua gói → `planName: null`, `total: null`.
    return { planName: null, remaining: Math.max(0, FREE_DESIGN_LIMIT - used), total: null }
  },

  listProjects: async (): Promise<Project[]> => {
    await mockDelay(200)
    const store = loadStore()
    // Ảnh bìa lấy từ ảnh lô đất của Bước 1 — backend thật sẽ trả ảnh render.
    return Object.values(store.projects).map((project) => {
      const normalized = normalizeProject(project)
      return {
        ...normalized,
        coverUrl: store.inputs[project.id]?.landPhotoUrl ?? null,
        buildingType: store.inputs[project.id]?.buildingType ?? null,
        // Diện tích sàn là kết quả của Bước 2, nên dự án còn đứng ở Bước 1 thì
        // chưa có — dòng meta trên thẻ tự bớt vế "… m²" thay vì in số 0.
        floorArea: normalized.currentStep >= 2 ? ESTIMATED_FLOOR_AREA : null
      }
    })
  },

  createProject: async (payload: CreateProjectPayload, _key?: string): Promise<Project> => {
    await mockDelay()
    return updateStore((store) => {
      const now = new Date().toISOString()
      const project: Project = {
        id: nextId(store),
        name: payload.name,
        description: payload.description,
        createdAt: now,
        updatedAt: now,
        currentStep: 1,
        status: 'input'
      }
      store.projects[project.id] = project
      store.inputs[project.id] = emptyDesignInput()
      return project
    })
  },

  getProject: async (projectId: string): Promise<Project> => {
    await mockDelay(150)
    const project = loadStore().projects[projectId]
    if (!project) throw new Error(`Unknown project: ${projectId}`)
    return normalizeProject(project)
  },

  renameProject: async (projectId: string, name: string): Promise<Project> => {
    await mockDelay()
    return updateStore((store) => {
      if (!store.projects[projectId]) throw new Error(`Unknown project: ${projectId}`)
      touchProject(store, projectId, { name })
      return store.projects[projectId]!
    })
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await mockDelay()
    updateStore((store) => {
      delete store.projects[projectId]
      delete store.inputs[projectId]
      delete store.dossiers[projectId]
    })
  },

  getInput: async (projectId: string): Promise<DesignInput> => {
    await mockDelay(150)
    return loadStore().inputs[projectId] ?? emptyDesignInput()
  },

  saveInput: async (projectId: string, input: DesignInput): Promise<DesignInput> => {
    await mockDelay(200)
    // Kiểm tra lại cấu hình loại công trình tại thời điểm lưu — không tin vào việc
    // form đã ẩn / hiện trường (epic ConstructionTypeManagement §7, §8).
    const invalid = designInputConfigErrors(input, loadStore().inputs[projectId])
    if (invalid.length > 0) {
      const error: ApiError = {
        status: 422,
        code: DESIGN_INPUT_CONFIG_ERROR,
        message: 'Building type configuration changed.',
        errors: Object.fromEntries(invalid.map((field) => [field, ['invalid']]))
      }
      throw error
    }
    return updateStore((store) => {
      // Chỉ trừ lượt ở lần chốt nhập liệu đầu tiên của dự án — sửa lại bản nháp
      // rồi gửi lại không được tính thành lượt mới.
      if (!store.inputs[projectId]?.buildingType) store.designsUsed += 1
      store.inputs[projectId] = input
      return input
    })
  },

  generateEstimate: async (projectId: string, _signal?: AbortSignal): Promise<EstimateResult> => {
    await mockDelay(ESTIMATE_DELAY_MS)
    const completedAt = updateStore((store) => {
      // Dự toán đã dựng xong → dự án chuyển sang "Chờ duyệt" (Hình 02), khách
      // xem rồi mới bấm sang Bước 3.
      touchProject(store, projectId, { currentStep: 2, status: 'review' })
      store.estimatedAt = { ...store.estimatedAt, [projectId]: new Date().toISOString() }
      return store.estimatedAt[projectId]
    })
    return {
      projectId,
      sections: SAMPLE_SECTIONS,
      grandTotal: grandTotal(SAMPLE_SECTIONS),
      advisory: '',
      estimatedFloorArea: ESTIMATED_FLOOR_AREA,
      xlsxUrl: '#',
      completedAt
    }
  },

  getEstimate: async (projectId: string, _signal?: AbortSignal): Promise<EstimateResult> => {
    await mockDelay(150)
    const store = loadStore()
    // Dự án dựng từ trước khi có mốc này: lấy lần cập nhật gần nhất làm ngày hoàn thành.
    const completedAt = store.estimatedAt?.[projectId] ?? store.projects[projectId]?.updatedAt
    return {
      projectId,
      sections: SAMPLE_SECTIONS,
      grandTotal: grandTotal(SAMPLE_SECTIONS),
      advisory: '',
      estimatedFloorArea: ESTIMATED_FLOOR_AREA,
      xlsxUrl: '#',
      ...(completedAt ? { completedAt } : {})
    }
  },

  renderDossier: async (projectId: string): Promise<Dossier> => {
    await mockDelay(RENDER_DELAY_MS)
    return updateStore((store) => {
      touchProject(store, projectId, { currentStep: 3, status: 'completed' })

      const dossier: Dossier = {
        projectId,
        status: 'ready',
        pdfUrl: '#',
        // Dung lượng ƯỚC TÍNH — nút hiển thị kèm dấu "~" đúng như mục IV.8.
        // Backend thật trả cỡ file thật; ở chế độ mock, cỡ thật chỉ biết sau khi
        // hồ sơ được dựng trong trình duyệt và sẽ thay số này (xem
        // `use-download-dossier`).
        pdfSize: ESTIMATED_PDF_BYTES,
        shareToken: `share-${projectId.toLowerCase()}`
      }
      store.dossiers[projectId] = dossier
      persistShared(store, projectId)
      return dossier
    })
  },

  getDossier: async (projectId: string): Promise<Dossier> => {
    await mockDelay(150)
    return (
      loadStore().dossiers[projectId] ?? { projectId, status: 'idle', pdfUrl: null, pdfSize: null, shareToken: null }
    )
  },

  /** Mock không có ngày hết hạn và không thu hồi được (link tạo sẵn). */
  revokeShareLink: async (_projectId: string, _shareId: string): Promise<void> => {},

  createShareLink: async (
    projectId: string,
    _expiryDate?: string
  ): Promise<{ token: string; url?: string; expiryDate?: string | null; applied?: boolean }> => {
    await mockDelay(300)
    updateStore((store) => persistShared(store, projectId))
    return { token: `share-${projectId.toLowerCase()}` }
  },

  sendDossierEmail: async (_projectId: string, _email: string): Promise<'accepted' | 'unknown' | void> => {
    await mockDelay(400)
  },

  /** Mock không có link chia sẻ kiểu BE (`/estimates/shared/{shareId}#token=…`). */
  getSharedEstimate: async (_shareId: string, _token: string): Promise<SharedDossier | null> => null,

  /** Xem hồ sơ qua link chia sẻ (mục III.4c) — đọc từ localStorage. */
  getSharedDossier: async (token: string): Promise<SharedDossier | null> => {
    await mockDelay(400)
    return readShared()[token] ?? null
  }
}
