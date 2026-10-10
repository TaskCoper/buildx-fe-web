import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/api'
import { indexHomeSections, type BmtPageSection } from '@/shared/cms/home-sections'
export const supervisionPageApi = {
  sections: async (locale: string) =>
    env.NEXT_PUBLIC_USE_MOCK_API
      ? {}
      : indexHomeSections(await http.get<BmtPageSection[]>('/pages/supervision/sections', { params: { locale } }))
}
