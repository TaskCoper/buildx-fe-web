import {
  Anchor,
  Blocks,
  BrickWall,
  Brush,
  ClipboardCheck,
  DoorOpen,
  Footprints,
  Grid2x2,
  Hammer,
  Home,
  Layers,
  Lightbulb,
  PencilRuler,
  PlugZap,
  ShowerHead,
  Sofa,
  Wallet,
  type LucideIcon
} from 'lucide-react'

/**
 * Bộ icon của Nhóm cẩm nang (epic HandbookStepManagement §4) — admin chọn một
 * khóa, trang Cẩm nang vẽ đúng icon đó. Dùng chung để hai phía không lệch nhau.
 */
export const HANDBOOK_TOPIC_ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  anchor: Anchor,
  blocks: Blocks,
  brick: BrickWall,
  home: Home,
  footprints: Footprints,
  plug: PlugZap,
  check: ClipboardCheck,
  grid: Grid2x2,
  brush: Brush,
  door: DoorOpen,
  shower: ShowerHead,
  light: Lightbulb,
  ruler: PencilRuler,
  hammer: Hammer,
  sofa: Sofa,
  wallet: Wallet
}

export const HANDBOOK_TOPIC_ICON_KEYS = Object.keys(HANDBOOK_TOPIC_ICONS)

/** Icon của một khóa; khóa lạ hoặc trống thì dùng `Layers`. */
export function handbookTopicIcon(key?: string): LucideIcon {
  return (key && HANDBOOK_TOPIC_ICONS[key]) || Layers
}
