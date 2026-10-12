/**
 * Sinh trước các bản ảnh đã resize để không khách nào phải chờ (cách làm của perlunas — xem `image-variants.ts`).
 *
 * Bộ tối ưu của Next chỉ resize khi có người YÊU CẦU, và mỗi lần deploy là một container mới nên cache ảnh lại trống. Ảnh
 * nguội chờ 3,5–5,8 giây, ảnh trong cache ~0,3 giây. Ghim bớt bậc chỉ giảm SỐ biến thể phải tạo; vẫn luôn có một người
 * xấu số phải tạo ra chúng. Cách duy nhất để không ai phải chờ là tạo sẵn: hàm này gom mọi URL ảnh từ các endpoint công
 * khai của BE rồi chạm vào `/_next/image` cho từng bậc.
 *
 * Chạy khi nào: `/api/warm` (gọi tay hoặc sau mỗi lần deploy) và `/api/cms/revalidate` (sau mỗi lần nội dung đổi).
 *
 * Không tốn thêm tài nguyên đáng kể: mỗi biến thể vẫn chỉ resize đúng một lần như trước, chỉ là site trả trước thay vì
 * để khách trả bằng thời gian chờ; biến thể đã có trong cache chỉ tốn một lượt chạm.
 */
import { CMS_PAGE_KEYS } from '@/shared/cms/cms-cache'
import { collectImageUrls } from './image-urls'
import { ALL_WIDTHS, optimizedImageUrl } from './image-variants'

/** Các endpoint công khai (không cần đăng nhập) chứa URL ảnh mà trang khách hiển thị. */
const PUBLIC_ENDPOINTS = [
  '/api/v1/news/articles?pageIndex=1&pageSize=100',
  '/api/v1/design-templates?pageIndex=1&pageSize=100',
  '/api/v1/guides?pageIndex=1&pageSize=100',
  '/api/v1/architects?pageIndex=1&pageSize=100',
  '/api/v1/handbook/stages',
  '/api/v1/handbook/newsletter',
  ...CMS_PAGE_KEYS.map((pageKey) => `/api/v1/pages/${pageKey}/sections?locale=vi`)
]

/**
 * Bao nhiêu ảnh resize song song. ĐỂ THẤP CÓ CHỦ Ý: máy chủ nhỏ, bắn nhiều request cùng lúc chỉ làm chúng tranh CPU và
 * quá hạn, còn khách thật vẫn phải được phục vụ trong lúc warm chạy.
 */
const CONCURRENCY = 2
/** Dừng trước khi bị cắt giữa chừng; phần còn lại báo bằng `nextFrom` để gọi tiếp. */
const TIME_BUDGET_MS = 240_000

async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000)
    })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

async function collectImages(): Promise<string[]> {
  const origin = (process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com').replace(/\/$/, '')
  const found = new Set<string>()
  for (const path of PUBLIC_ENDPOINTS) collectImageUrls(await fetchJson(`${origin}${path}`), found)
  return [...found].sort()
}

type Outcome = 'ok' | 'fail'

async function runPool(jobs: (() => Promise<Outcome>)[], deadline: number) {
  let next = 0
  let ok = 0
  let failed = 0
  const worker = async () => {
    while (next < jobs.length && Date.now() < deadline) {
      const outcome = await jobs[next++]!()
      if (outcome === 'ok') ok++
      else failed++
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { ok, failed, done: next }
}

/** Đang có một lượt warm chạy thì lượt khác (vd. webhook đến dồn dập) bỏ qua, khỏi nhân đôi việc. */
let running = false

export interface WarmResult {
  skipped?: boolean
  images: number
  jobs: number
  ok: number
  failed: number
  /** `null` khi đã xong; khác `null` là chưa hết giờ/việc — gọi lại với `from=nextFrom`. */
  nextFrom: number | null
  tookMs: number
}

/** Địa chỉ để tự gọi `/_next/image`: luôn là cổng nội bộ của chính container, không đi vòng qua tên miền công khai. */
const selfOrigin = () => `http://127.0.0.1:${process.env.PORT ?? 3000}`

export async function warmImages(from = 0): Promise<WarmResult> {
  const started = Date.now()
  if (running) return { skipped: true, images: 0, jobs: 0, ok: 0, failed: 0, nextFrom: from, tookMs: 0 }
  running = true
  try {
    const images = await collectImages()
    // Một "việc" = một bậc của một ảnh; trải phẳng để chia đều cho pool.
    const jobs = images.flatMap((src) => ALL_WIDTHS.map((width) => ({ src, width })))
    const slice = jobs.slice(from)
    const { ok, failed, done } = await runPool(
      slice.map(({ src, width }) => async (): Promise<Outcome> => {
        try {
          // Chỉ cần chạm tới là bộ tối ưu resize và cache lại; huỷ body để socket không treo. Phải gửi đúng `Accept` của
          // trình duyệt thật: định dạng trả về (AVIF/WebP) nằm trong cache key.
          const response = await fetch(`${selfOrigin()}${optimizedImageUrl(src, width)}`, {
            headers: { Accept: 'image/avif,image/webp,image/*' },
            cache: 'no-store'
          })
          void response.body?.cancel()
          return response.ok ? 'ok' : 'fail'
        } catch {
          return 'fail'
        }
      }),
      started + TIME_BUDGET_MS
    )
    const remaining = slice.length - done
    return {
      images: images.length,
      jobs: jobs.length,
      ok,
      failed,
      nextFrom: remaining > 0 ? from + done : null,
      tookMs: Date.now() - started
    }
  } finally {
    running = false
  }
}
