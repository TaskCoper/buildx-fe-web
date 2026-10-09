import sharp from 'sharp'
import { createHash } from 'node:crypto'

import {
  isGuid,
  parseLibraryImageWidth,
  LIBRARY_IMAGE_MAX_SOURCE_BYTES,
  LIBRARY_IMAGE_PASSTHROUGH_MAX_BYTES,
  negotiateLibraryImageFormat,
  libraryImageQuality,
  shouldServeLibraryImageOriginal
} from './library-image.logic'

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie, Accept',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Referrer-Policy': 'no-referrer'
}
// Bound source reads even when upstream omits Content-Length.
const MAX_SOURCE_BYTES = LIBRARY_IMAGE_MAX_SOURCE_BYTES
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function failure(status: number) {
  return new Response(null, { status, headers: PRIVATE_HEADERS })
}

async function readImage(response: Response): Promise<Buffer | null> {
  if (Number(response.headers.get('content-length')) > MAX_SOURCE_BYTES) {
    await response.body?.cancel()
    return null
  }
  if (!response.body) return null
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_SOURCE_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
    return size ? Buffer.concat(chunks) : null
  } finally {
    reader.releaseLock()
  }
}

/** Presentation-only adapter: .NET checks session, version access and asset membership before any bytes are read. */
export function createLibraryImageHandler({
  apiOrigin,
  fetchSource = fetch,
  passThroughMaxBytes = LIBRARY_IMAGE_PASSTHROUGH_MAX_BYTES
}: {
  apiOrigin: string
  fetchSource?: typeof fetch
  /** Nguồn nhỏ hơn mức này (byte) được trả nguyên file; đặt 0 để luôn mã hoá lại (dùng trong test). */
  passThroughMaxBytes?: number
}) {
  // Share only overlapping reads of the SAME source with the EXACT same session cookies.
  // Delete on completion (including errors): later requests must check .NET again. No image/auth cache.
  const pending = new Map<string, Promise<{ bytes: Buffer; contentType: string } | { status: number }>>()
  const readSource = (src: string, cookie: string) => {
    const key = createHash('sha256').update(cookie).update('\0').update(src).digest('hex')
    const existing = pending.get(key)
    if (existing) return existing
    const reading = (async () => {
      const source = await fetchSource(new URL(src, apiOrigin), {
        headers: { Cookie: cookie, Accept: 'image/jpeg, image/png, image/webp', 'Accept-Encoding': 'identity' },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000)
      })
      if (source.status !== 200) {
        await source.body?.cancel()
        return { status: [401, 403, 404, 429, 503].includes(source.status) ? source.status : 502 }
      }
      const contentType = source.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
      if (!IMAGE_TYPES.has(contentType)) {
        await source.body?.cancel()
        return { status: 415 }
      }
      const bytes = await readImage(source)
      return bytes ? { bytes, contentType } : { status: 413 }
    })().finally(() => pending.delete(key))
    pending.set(key, reading)
    return reading
  }
  return async function handle(
    request: Request,
    context: { params: Promise<{ versionId: string; assetId: string }> }
  ): Promise<Response> {
    const { versionId, assetId } = await context.params
    const query = new URL(request.url).searchParams
    const width = parseLibraryImageWidth(query.get('w'))
    if (
      !isGuid(versionId) ||
      !isGuid(assetId) ||
      !width ||
      query.getAll('w').length !== 1 ||
      [...query.keys()].some((name) => name !== 'w')
    )
      return failure(400)
    const src = `/api/v1/library-versions/${versionId}/assets/${assetId}/content`
    const cookie = request.headers.get('cookie')
    if (!cookie) return failure(401)

    try {
      // Never accept a source host from the browser, follow redirects or use Next's shared image/data cache.
      const source = await readSource(src, cookie)
      if ('status' in source) return failure(source.status)
      if (request.signal.aborted) return failure(408)
      const image = sharp(source.bytes, { limitInputPixels: 120_000_000, animated: false })
      const metadata = await image.metadata()
      // MIME declarations are not sufficient: refuse SVG/PDF/CAD or other decoders even if labelled image/png.
      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) return failure(415)
      const format = negotiateLibraryImageFormat(request.headers.get('accept'))
      if (
        format === 'original' ||
        shouldServeLibraryImageOriginal({
          bytes: source.bytes.length,
          sourceWidth: metadata.width,
          width,
          maxBytes: passThroughMaxBytes
        })
      )
        return new Response(new Uint8Array(source.bytes), {
          headers: {
            ...PRIVATE_HEADERS,
            'Content-Type': source.contentType,
            'Content-Length': String(source.bytes.length)
          }
        })
      const { quality, chroma } = libraryImageQuality(source.contentType)
      const resized = image.rotate().resize({ width, withoutEnlargement: true })
      const output =
        format === 'avif'
          ? await resized.avif({ quality, effort: 3, chromaSubsampling: chroma }).toBuffer()
          : await resized.webp({ quality: quality + 15 }).toBuffer()
      return new Response(new Uint8Array(output), {
        headers: { ...PRIVATE_HEADERS, 'Content-Type': `image/${format}`, 'Content-Length': String(output.length) }
      })
    } catch (error) {
      const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
      return failure(timedOut ? 504 : 502)
    }
  }
}
