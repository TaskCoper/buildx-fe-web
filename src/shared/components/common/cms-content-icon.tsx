'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Circle,
  Clock,
  HardHat,
  Icon,
  MousePointerClick,
  Wallet,
  ShieldCheck,
  Construction,
  FileText,
  ClipboardCheck,
  House,
  QrCode,
  Ruler,
  MapPin,
  type LucideIcon
} from 'lucide-react'
import { useHomeIconNodes } from '@/shared/cms/home-content'
import { lucideIconKey } from '@/shared/cms/home-sections'
import { fetchIconNode } from '@/shared/cms/icon-node.client'

const legacyIcons: Record<string, LucideIcon> = {
  mousepointerclick: MousePointerClick,
  clock: Clock,
  wallet: Wallet,
  hardhat: HardHat,
  shieldcheck: ShieldCheck,
  construction: Construction,
  filetext: FileText,
  clipboardcheck: ClipboardCheck,
  house: House,
  qrcode: QrCode,
  ruler: Ruler,
  mappin: MapPin
}

export function CmsContentIcon({
  name,
  className = 'plan-value-icon text-primary size-4.5 shrink-0'
}: {
  name: string
  className?: string
}) {
  const key = lucideIconKey(name)
  const serverNode = useHomeIconNodes()[key ?? '']
  const Legacy = legacyIcons[key?.replaceAll('-', '') ?? '']
  const query = useQuery({
    queryKey: ['cms', 'icon', key],
    queryFn: () => fetchIconNode(name),
    enabled: Boolean(key && !serverNode && !Legacy),
    staleTime: Infinity
  })
  const node = serverNode ?? query.data
  if (node) return <Icon iconNode={node} className={className} />
  const Fallback = Legacy ?? Circle
  return <Fallback className={className} />
}
