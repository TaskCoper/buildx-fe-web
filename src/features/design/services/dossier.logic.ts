import type { EstimateStageResult } from '../schemas/pipeline-api.schema'
import type { EstimateResult } from '../types/design.types'
import { estimateTabs } from './estimate-stage.logic'

/** Giữ số tiền nguồn, chuyển nhóm/dòng sang mô hình hiển thị Hồ sơ hiện có. */
export function dossierEstimate(projectId: string, source: EstimateStageResult): EstimateResult {
  if (source.totals?.grandTotal == null || source.convertedFloorAreaM2 == null) throw new Error('InvalidEstimateResult')
  return {
    projectId,
    grandTotal: source.totals.grandTotal,
    estimatedFloorArea: source.convertedFloorAreaM2,
    advisory: source.advice ?? '',
    xlsxUrl: '',
    sections: estimateTabs(source).map((part) => ({
      section: part.part,
      total: part.total,
      items: part.groups.map((group, groupIndex) => ({
        id: `${part.part}-${groupIndex}`,
        label: group.name,
        amount: group.items.reduce((sum, item) => sum + (item.amount ?? 0), 0),
        children: group.items.map((item, index) => ({
          id: `${part.part}-${groupIndex}-${index}`,
          label: item.name,
          unit: item.unit ?? '',
          quantity: item.quantity ?? 0,
          unitPrice: item.unitPrice ?? 0,
          amount: item.amount ?? 0
        }))
      }))
    }))
  }
}
