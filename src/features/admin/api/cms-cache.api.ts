import type { CmsCacheTarget } from '@/shared/cms/cms-cache'
import { http } from '@/shared/lib/api'

export const cmsCacheApi = {
  revalidate: (target: CmsCacheTarget) =>
    http.post<{ revalidated: true }>('/api/cms/revalidate', target, { baseURL: '' })
}
