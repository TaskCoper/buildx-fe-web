import { z } from 'zod'

/**
 * Validated, typed access to public environment variables.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so we must
 * reference each variable statically (no dynamic indexing) for them to be
 * replaced. We validate once at module load and fail fast on misconfiguration.
 */
const publicEnvSchema = z.object({
  // Either an absolute URL or a same-origin path. The default `/api/v1` goes
  // through the Next rewrite in `next.config.ts`, which keeps the backend's
  // httpOnly auth cookies first-party.
  NEXT_PUBLIC_API_BASE_URL: z.union([z.string().url(), z.string().regex(/^\/\S*$/)]).default('/api/v1'),
  NEXT_PUBLIC_API_TIMEOUT: z.coerce.number().int().positive().default(30000),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('BuildX AI'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  // Dev-only: route auth through an in-browser mock while the .NET API is WIP.
  NEXT_PUBLIC_USE_MOCK_AUTH: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Dev-only: serve feature data (projects, estimates…) from in-browser mocks.
  NEXT_PUBLIC_USE_MOCK_API: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /**
   * Khoá VietMap CÔNG KHAI — chỉ để render bản đồ xem trước trong trình duyệt.
   * Khoá tra toạ độ là biến `VIETMAP_API_KEY` riêng, KHÔNG có tiền tố
   * NEXT_PUBLIC_ nên chỉ đọc được ở máy chủ (route `/api/geocode`); đừng gộp hai
   * khoá làm một, gộp là phơi khoá tính phí ra trang web.
   *
   * Để trống thì phần bản đồ tự ẩn, app vẫn chạy — nên không đặt `.min(1)`.
   */
  NEXT_PUBLIC_VIETMAP_API_KEY: z.string().default('')
})

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_USE_MOCK_AUTH: process.env.NEXT_PUBLIC_USE_MOCK_AUTH,
  NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API,
  NEXT_PUBLIC_VIETMAP_API_KEY: process.env.NEXT_PUBLIC_VIETMAP_API_KEY
})

if (!parsed.success) {
  // Surface a readable error during local dev / CI builds.
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables. See .env.example.')
}

export const env = parsed.data

export type Env = typeof env
