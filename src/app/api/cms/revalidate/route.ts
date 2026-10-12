import { createHash, timingSafeEqual } from 'node:crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { CMS_LOCALES, CMS_PAGE_KEYS, cmsCacheEntries } from '@/shared/cms/cms-cache'
import { warmImages } from '@/shared/lib/warm-images'

export const runtime = 'nodejs'

const targetSchema = z
  .object({
    pageKey: z.enum([...CMS_PAGE_KEYS, 'all']),
    locale: z.enum([...CMS_LOCALES, 'all'])
  })
  .strict()

const permissionResponseSchema = z.object({ isSuccess: z.literal(true), value: z.array(z.unknown()) })

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function sameSecret(supplied: string, expected: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(supplied), digest(expected))
}

export async function POST(request: Request) {
  // Webhook BE dùng secret chỉ có trên server. Trình duyệt dùng cookie và quyền hiện hành do BE kiểm.
  const authorization = request.headers.get('authorization')
  if (authorization !== null) {
    const secret = process.env.CMS_REVALIDATION_SECRET
    if (!secret || !sameSecret(authorization, `Bearer ${secret}`)) return json({ code: 'Unauthorized' }, 401)
  } else {
    const cookie = request.headers.get('cookie')
    if (!cookie) return json({ code: 'Unauthorized' }, 401)
    const trustedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin
    if (request.headers.get('origin') !== trustedOrigin) return json({ code: 'CsrfInvalid' }, 403)
  }

  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return json({ code: 'InvalidCmsCacheTarget' }, 400)
  }
  const parsed = targetSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ code: 'InvalidCmsCacheTarget' }, 400)
  const target = parsed.data

  if (authorization === null) {
    // Dùng endpoint đã bảo vệ bằng policy news.manage, gồm cả kiểm phiên, tài khoản và quyền.
    const pageKey = target.pageKey === 'all' ? 'home' : target.pageKey
    const locale = target.locale === 'all' ? 'vi' : target.locale
    const origin = (process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com').replace(/\/$/, '')
    try {
      const response = await fetch(`${origin}/api/v1/admin/pages/${pageKey}/sections?locale=${locale}`, {
        headers: { Accept: 'application/json', Cookie: request.headers.get('cookie')! },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(5000)
      })
      if (response.status === 401) return json({ code: 'Unauthorized' }, 401)
      if (response.status === 403) return json({ code: 'Forbidden' }, 403)
      if (!response.ok || !permissionResponseSchema.safeParse(await response.json()).success) {
        return json({ code: 'CmsAuthorizationUnavailable' }, 503)
      }
    } catch {
      return json({ code: 'CmsAuthorizationUnavailable' }, 503)
    }
  }

  const entries = cmsCacheEntries(target)
  for (const entry of entries) {
    // Hết hạn ngay: lần đọc tiếp theo chờ dữ liệu mới, không trả bản cũ rồi làm mới nền.
    revalidateTag(entry.tag, { expire: 0 })
    revalidatePath(entry.path, entry.type)
  }
  // Nội dung vừa đổi nên có thể có ảnh mới: sinh trước các bậc ảnh sau khi đã trả lời, để lần đầu khách mở không phải chờ
  // resize nguội (xem `warm-images.ts`). Chạy nền, lỗi không ảnh hưởng việc làm mới cache.
  if (process.env.NODE_ENV === 'production') {
    after(async () => {
      await warmImages().catch(() => undefined)
    })
  }
  return json({ revalidated: true, ...target, tags: entries.map(({ tag }) => tag) })
}
