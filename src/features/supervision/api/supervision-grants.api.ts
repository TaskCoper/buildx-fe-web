import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { SupervisionGrantItem } from '../services/supervision-grant.logic'

/** Gói giám sát của tôi (`GET /me/supervision-grants`) — gồm cả gói chưa gán, quá hạn gán, đã hoàn thành và bị huỷ. */
export const supervisionGrantsApi = {
  list: async (): Promise<SupervisionGrantItem[]> => {
    const page = await http.get<PagedResult<SupervisionGrantItem>>('/me/supervision-grants', {
      params: { pageIndex: 1, pageSize: 50 }
    })
    return page.items ?? []
  }
}
