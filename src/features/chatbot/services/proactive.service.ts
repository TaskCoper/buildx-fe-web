import type { ChatFlow, ProjectChatContext } from '@/shared/chat-context'

/**
 * Kịch bản chatbox AI tự trò chuyện trong lúc chờ (mục III.3a).
 *
 * Pure: chỉ chọn câu nào nói và nói lúc nào; nội dung câu nằm ở
 * `messages/*.json` (`chatbot.proactive.*`) nên vẫn qua i18n.
 */

/** Các câu có thể nói — union literal để `t()` vẫn được kiểm tra kiểu. */
export type ProactiveKey =
  | 'estimate.opening'
  | 'estimate.openingWithArea'
  | 'estimate.photo'
  | 'estimate.noPhoto'
  | 'estimate.scale'
  | 'estimate.package'
  | 'estimate.style'
  | 'estimate.handbook'
  | 'dossier.opening'
  | 'dossier.interior'
  | 'dossier.contents'
  | 'dossier.share'

export interface ProactiveLine {
  /** Khóa con dưới `chatbot.proactive`. */
  key: ProactiveKey
  /** Biến điền vào câu — đều là nhãn đã bản địa hóa. */
  values?: Record<string, string>
  /** Mốc thời gian nói, tính từ lúc bắt đầu chờ. */
  delayMs: number
}

/** Câu đầu tiên nói sớm để người dùng thấy AI "bắt chuyện" ngay. */
const FIRST_DELAY_MS = 1_200
/** Khoảng cách giữa hai câu — đủ để đọc xong câu trước. */
const GAP_MS = 2_800

type Candidate = Omit<ProactiveLine, 'delayMs'>

/**
 * Dựng kịch bản theo dữ liệu thật của dự án. Câu nào thiếu biến thì bỏ hẳn,
 * các câu còn lại tự dồn lên nên nhịp nói không bị hụt.
 */
export function proactiveScript(context: ProjectChatContext, flow: ChatFlow): ProactiveLine[] {
  const candidates: (Candidate | null)[] =
    flow === 'estimate'
      ? [
          context.area
            ? { key: 'estimate.openingWithArea', values: { building: context.buildingLabel, area: context.area } }
            : { key: 'estimate.opening', values: { building: context.buildingLabel } },
          context.hasLandPhoto ? { key: 'estimate.photo' } : { key: 'estimate.noPhoto' },
          context.scaleLabel ? { key: 'estimate.scale', values: { scale: context.scaleLabel } } : null,
          { key: 'estimate.package', values: { package: context.packageLabel } },
          context.interiorStyleLabel
            ? { key: 'estimate.style', values: { style: context.interiorStyleLabel } }
            : { key: 'estimate.handbook' }
        ]
      : [
          { key: 'dossier.opening', values: { building: context.buildingLabel } },
          context.interiorStyleLabel
            ? { key: 'dossier.interior', values: { style: context.interiorStyleLabel } }
            : null,
          { key: 'dossier.contents' },
          { key: 'dossier.share' }
        ]

  return candidates
    .filter((candidate) => candidate !== null)
    .map((candidate, index) => ({ ...candidate, delayMs: FIRST_DELAY_MS + index * GAP_MS }))
}

/** Khóa nhận diện một lượt chờ, để cùng một kịch bản không phát hai lần. */
export function scriptKey(context: ProjectChatContext, flow: ChatFlow): string {
  return `${flow}:${context.projectName}:${context.area}`
}
