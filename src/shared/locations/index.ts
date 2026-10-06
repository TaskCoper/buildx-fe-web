import { z } from 'zod'
import { http } from '@/shared/lib/api'

const entry = z.object({ code: z.string(), name: z.string() })
const provinces = z.object({ datasetVersion: z.string(), provinces: z.array(entry) })
const wards = z.object({ datasetVersion: z.string(), provinceCode: z.string(), wards: z.array(entry) })
const suggestions = z.array(z.object({ refId: z.string(), name: z.string(), address: z.string(), display: z.string() }))
const coordinates = z.object({
  refId: z.string(),
  display: z.string(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
})
export const locationApi = {
  provinces: async (signal?: AbortSignal) =>
    provinces.parse(await http.get('/estimate-locations/provinces', { signal })),
  wards: async (provinceCode: string, datasetVersion: string, signal?: AbortSignal) =>
    wards.parse(
      await http.get(`/estimate-locations/provinces/${encodeURIComponent(provinceCode)}/wards`, {
        params: { datasetVersion },
        signal
      })
    ),
  search: async (address: string, signal?: AbortSignal) =>
    suggestions.parse(await http.get('/maps/search', { params: { address }, signal })),
  place: async (refId: string, signal?: AbortSignal) =>
    coordinates.parse(await http.get('/maps/place', { params: { refId }, signal }))
}
export type LocationSuggestion = z.infer<typeof suggestions>[number]
