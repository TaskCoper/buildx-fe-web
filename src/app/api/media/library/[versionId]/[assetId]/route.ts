import { createLibraryImageHandler } from '@/shared/media/library-image.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = createLibraryImageHandler({
  apiOrigin: process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com'
})
