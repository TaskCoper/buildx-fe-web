'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

import { useAuthStore } from '@/shared/auth'
import { useCmsCollection } from '@/shared/cms'
import { env } from '@/shared/config/env'
import { handbookApi } from '../api/handbook.api'
import { mockHandbookApi } from '../api/handbook.mock'
import { LibraryAccessDeniedError, type ArticleListQuery } from '../api/handbook.bmt'
import { handbookKeys } from '../api/handbook.keys'
import type { TemplateStyleQuery } from '../api/handbook.library'
import { selectPersonalizedTemplates } from '../services/handbook.service'
import { localDayKey, useHandbookQuotaLedger } from '../store/handbook-quota.store'
import type { HandbookFilter, HandbookTemplateKind, LibraryMatchCriteria } from '../types/handbook.types'
import type { HandbookTemplateStyles, LibraryFilterOptions } from '../types/handbook.types'

const STATIC_CONTENT_STALE_TIME = 5 * 60 * 1000

/** Toàn bộ mẫu trong thư viện — dùng cho trang Cẩm nang và panel màn chờ. */
export function useHandbookTemplates() {
  return useQuery({
    queryKey: handbookKeys.templates(),
    queryFn: () => handbookApi.listTemplates(),
    staleTime: STATIC_CONTENT_STALE_TIME
  })
}

/**
 * Một mẫu cụ thể — trang chi tiết mẫu bản vẽ 2D / nội thất 3D.
 *
 * `enabled` để trang chi tiết TẠM DỪNG gọi khi mẫu đến từ API mà khách chưa
 * đăng nhập (dựng cổng đăng nhập trước, không lộ nội dung, không trừ lượt).
 */
export function useHandbookTemplate(id: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: handbookKeys.templateDetail(id),
    queryFn: async () => {
      const template = await handbookApi.getTemplate(id)
      // Mở mẫu lần đầu trừ 1 lượt `catalog.detail` ở BE: đọc lại số dư để huy hiệu "còn x/y lượt" khớp.
      void queryClient.invalidateQueries({ queryKey: handbookKeys.quota() })
      return template
    },
    staleTime: STATIC_CONTENT_STALE_TIME,
    enabled: options?.enabled ?? true,
    // BE đã từ chối mở mẫu (chưa có gói…) thì thử lại cũng vậy.
    retry: (failureCount, error) => !(error instanceof LibraryAccessDeniedError) && failureCount < 2
  })
}

/**
 * Bài viết (`source: 'mock'` cho các khối trang Cẩm nang chưa lấy API: chỉ danh sách bài viết dưới cùng dùng API). `query` lọc ở phía BE (`categoryId` gồm cả danh mục con, `keyword`); bỏ trống thì lấy
 * bài mới nhất như trước và để giao diện tự lọc trên danh sách đã tải.
 */
export function useHandbookArticles(
  topic?: 'architecture' | 'interior',
  query?: ArticleListQuery,
  options?: { source?: 'api' | 'mock' }
) {
  const mock = options?.source === 'mock'
  const base =
    query?.categoryId || query?.keyword
      ? `${topic ?? 'all'}:${query?.categoryId ?? ''}:${query?.keyword ?? ''}`
      : (topic ?? 'all')
  return useQuery({
    queryKey: handbookKeys.articleList(mock ? `mock:${base}` : base),
    queryFn: () => (mock ? mockHandbookApi.listArticles(topic) : handbookApi.listArticles(topic, query)),
    staleTime: STATIC_CONTENT_STALE_TIME
  })
}

/**
 * Toàn bộ cây danh mục tin công khai (danh sách phẳng). Rỗng khi BE chưa có danh mục hoặc lỗi —
 * khi đó bộ lọc bài viết dùng nhãn mock.
 */
export function useHandbookNewsCategoryTree() {
  return useQuery({
    queryKey: handbookKeys.newsCategoryTree(),
    queryFn: () => handbookApi.listNewsCategoryTree(),
    staleTime: STATIC_CONTENT_STALE_TIME
  })
}

/**
 * Danh mục hệ thống, gồm giá trị cũ còn được mẫu công khai dùng; thu hẹp theo loại công trình.
 */
export function useHandbookLibraryFilters(kind: HandbookTemplateKind, enabled = true, buildingTypeId?: string) {
  return useQuery({
    queryKey: handbookKeys.libraryFilters(kind, buildingTypeId),
    queryFn: () => handbookApi.getLibraryFilters({ drawingKind: kind === '3d' ? '3D' : '2D', buildingTypeId }),
    staleTime: STATIC_CONTENT_STALE_TIME,
    enabled
  })
}

/**
 * Mẫu khớp đồng thời các bộ lọc. Tách query theo điều kiện để phản hồi cũ không ghi đè lựa chọn mới.
 */
export function useHandbookTemplateIdsByFilters(query: TemplateStyleQuery, enabled: boolean) {
  return useQuery({
    queryKey: handbookKeys.templateIdsByStyle(query),
    queryFn: () => handbookApi.listTemplateIdsByStyle(query),
    staleTime: STATIC_CONTENT_STALE_TIME,
    enabled
  })
}

/** Summary chưa kèm phong cách: đọc membership qua danh sách công khai, không mở chi tiết/tính lượt. */
export function useHandbookTemplateStyles(options: LibraryFilterOptions | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: handbookKeys.templateStyles(options),
    enabled: enabled && Boolean(options),
    staleTime: STATIC_CONTENT_STALE_TIME,
    queryFn: async (): Promise<Record<string, HandbookTemplateStyles>> => {
      const result: Record<string, HandbookTemplateStyles> = {}
      const entries = [
        ...(options?.architectureStyles ?? []).map((style) => ({ group: 'architectureStyles' as const, style })),
        ...(options?.interiorStyles ?? []).map((style) => ({ group: 'interiorStyles' as const, style }))
      ]
      // Giới hạn bốn yêu cầu song song; mỗi nhóm/ID lấy membership một lần cho cả lưới.
      for (let start = 0; start < entries.length; start += 4) {
        const memberships = await Promise.all(
          entries.slice(start, start + 4).map(async ({ group, style }) => ({
            group,
            style,
            ids: await handbookApi.listTemplateIdsByStyle({
              drawingKind: '3D',
              ...(group === 'architectureStyles'
                ? { architectureStyleIds: [style.styleId] }
                : { interiorStyleIds: [style.styleId] })
            })
          }))
        )
        for (const { group, style, ids } of memberships) {
          for (const id of ids ?? []) {
            const labels = (result[id] ??= { architectureStyles: [], interiorStyles: [] })
            labels[group].push(style)
          }
        }
      }
      return result
    }
  })
}

export function useHandbookArticle(slug: string) {
  return useQuery({
    queryKey: handbookKeys.articleDetail(slug),
    queryFn: () => handbookApi.getArticle(slug),
    staleTime: STATIC_CONTENT_STALE_TIME
  })
}

/** Ba giai đoạn + chủ đề của cẩm nang nền tảng. */
export function useHandbookStages() {
  return useQuery({
    queryKey: handbookKeys.stages(),
    queryFn: () => handbookApi.listStages(),
    staleTime: STATIC_CONTENT_STALE_TIME
  })
}

/**
 * Hạn mức tra cứu thư viện trong ngày.
 *
 * `staleTime: 0` vì đây là số đếm theo tài khoản, không phải nội dung tĩnh —
 * mở lại trang phải thấy số mới nhất.
 */
export function useHandbookQuota() {
  return useQuery({
    queryKey: handbookKeys.quota(),
    queryFn: () => handbookApi.getQuota()
  })
}

/**
 * Effective lookup quota used by the public template grid.
 *
 * In mock mode the API only exposes the configured daily allowance, so a
 * persisted client ledger supplies consumption/reset behaviour for QA and the
 * frontend demo. With the real API connected, server values stay authoritative
 * and no client-side subtraction is applied.
 */
export function useHandbookLookupQuota() {
  const query = useHandbookQuota()
  const user = useAuthStore((state) => state.user)
  const userEmail = user?.email
  const plans = useCmsCollection('plans')
  const subscriptions = useCmsCollection('subscriptions')
  const transactions = useCmsCollection('transactions')
  const lookupPeriodKey = useHandbookQuotaLedger((state) => state.lookupPeriodKey)
  const lookupUsed = useHandbookQuotaLedger((state) => state.lookupUsed)
  const resetForToday = useHandbookQuotaLedger((state) => state.resetForToday)
  const syncLookupPeriod = useHandbookQuotaLedger((state) => state.syncLookupPeriod)
  const consumeLookup = useHandbookQuotaLedger((state) => state.consumeLookup)
  const mockManaged = env.NEXT_PUBLIC_USE_MOCK_API
  const activeSubscription = useMemo(
    () =>
      subscriptions.find(
        (subscription) =>
          Boolean(userEmail) &&
          subscription.customerEmail.toLowerCase() === userEmail?.toLowerCase() &&
          subscription.status === 'active'
      ),
    [subscriptions, userEmail]
  )
  const latestPaidTier = useMemo(() => {
    if (!userEmail) return null
    return (
      transactions
        .filter(
          (transaction) =>
            transaction.customerEmail.toLowerCase() === userEmail.toLowerCase() &&
            transaction.status === 'paid' &&
            (transaction.tier === 'advanced' || transaction.tier === 'pro')
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.tier ?? null
    )
  }, [transactions, userEmail])
  const entitlementTier =
    activeSubscription?.tier === 'advanced' || activeSubscription?.tier === 'pro'
      ? activeSubscription.tier
      : latestPaidTier
  const activePlan = useMemo(
    () => (entitlementTier ? plans.find((plan) => plan.tier === entitlementTier) : undefined),
    [entitlementTier, plans]
  )
  const paidMockQuota = mockManaged && Boolean(activePlan)
  const period = paidMockQuota ? ('month' as const) : ('day' as const)
  const periodKey = paidMockQuota
    ? `month:${userEmail ?? 'guest'}:${localMonthKey()}:${activePlan?.tier ?? 'none'}`
    : `day:${localDayKey()}`

  useEffect(() => {
    resetForToday()
    syncLookupPeriod(periodKey)

    const now = new Date()
    const nextReset = new Date(now)
    if (period === 'month') {
      nextReset.setMonth(now.getMonth() + 1, 1)
      nextReset.setHours(0, 0, 0, 20)
    } else {
      nextReset.setHours(24, 0, 0, 20)
    }
    const timer = window.setTimeout(
      () => {
        resetForToday()
        syncLookupPeriod(
          period === 'month'
            ? `month:${userEmail ?? 'guest'}:${localMonthKey()}:${activePlan?.tier ?? 'none'}`
            : `day:${localDayKey()}`
        )
      },
      Math.max(250, nextReset.getTime() - now.getTime())
    )
    return () => window.clearTimeout(timer)
  }, [activePlan?.tier, period, periodKey, resetForToday, syncLookupPeriod, userEmail])

  const total = paidMockQuota ? (activePlan?.libraryCredits ?? 0) : (query.data?.lookupTotal ?? 0)
  const serverRemaining = paidMockQuota ? total : (query.data?.lookupRemaining ?? 0)
  const usedInPeriod = mockManaged && lookupPeriodKey === periodKey ? lookupUsed : 0
  const remaining = Math.max(serverRemaining - usedInPeriod, 0)

  const consume = useCallback(() => {
    if (remaining <= 0) return false
    if (!mockManaged) return true
    return consumeLookup(serverRemaining, periodKey)
  }, [consumeLookup, mockManaged, periodKey, remaining, serverRemaining])

  return {
    ...query,
    remaining,
    total,
    period,
    planTier: activePlan?.tier ?? null,
    consume
  }
}

function localMonthKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Effective detail-view quota for the template detail page.
 *
 * Mock mode persists the set of templates viewed today so revisiting the same
 * template does not consume another credit. With the real API connected the
 * server remains authoritative; this hook never subtracts a second local copy.
 */
export function useHandbookDetailQuota() {
  const query = useHandbookQuota()
  const dayKey = useHandbookQuotaLedger((state) => state.dayKey)
  const detailViewedIds = useHandbookQuotaLedger((state) => state.detailViewedIds)
  const resetForToday = useHandbookQuotaLedger((state) => state.resetForToday)
  const consumeDetail = useHandbookQuotaLedger((state) => state.consumeDetail)
  const mockManaged = env.NEXT_PUBLIC_USE_MOCK_API

  useEffect(() => {
    resetForToday()
  }, [dayKey, resetForToday])

  const total = query.data?.detailTotal ?? 0
  const serverRemaining = query.data?.detailRemaining ?? 0
  const viewedTodayIds = useMemo(
    () => (mockManaged && dayKey === localDayKey() ? detailViewedIds : {}),
    [dayKey, detailViewedIds, mockManaged]
  )
  const remaining = Math.max(serverRemaining - Object.keys(viewedTodayIds).length, 0)

  const hasViewed = useCallback((templateId: string) => Boolean(viewedTodayIds[templateId]), [viewedTodayIds])

  const consume = useCallback(
    (templateId: string) => {
      if (hasViewed(templateId)) return 'seen' as const
      if (remaining <= 0) return 'blocked' as const
      if (!mockManaged) return 'consumed' as const
      return consumeDetail(templateId, serverRemaining)
    },
    [consumeDetail, hasViewed, mockManaged, remaining, serverRemaining]
  )

  return {
    ...query,
    remaining,
    total,
    hasViewed,
    consume
  }
}

/**
 * Mẫu thư viện khớp với dự toán đang được AI lập (màn chờ Bước 2). Tách khỏi polling của AI: lỗi ở đây chỉ làm rỗng danh
 * sách, không đụng tới tác vụ AI. Không tự gọi lại (TDD-LIB-001 chưa chốt tần suất làm mới) — chỉ đổi khi điều kiện đổi.
 */
export function useMatchedTemplates(criteria: LibraryMatchCriteria | null | undefined, kind: HandbookTemplateKind) {
  return useQuery({
    queryKey: handbookKeys.matched(criteria as LibraryMatchCriteria, kind),
    queryFn: () => handbookApi.matchTemplates(criteria as LibraryMatchCriteria, kind),
    enabled: Boolean(criteria),
    staleTime: STATIC_CONTENT_STALE_TIME,
    retry: 1,
    refetchOnWindowFocus: false
  })
}

/**
 * Năm mẫu cho panel cẩm nang cá nhân hóa (màn chờ Bước 2 và Bước 3).
 *
 * The random pick is memoised on the fetched pool + filter so the cards stay put
 * while the user reads them — re-rolling on every render would make the panel
 * flicker during the progress ticks.
 */
export function usePersonalizedTemplates(filter: HandbookFilter, kind: HandbookTemplateKind) {
  const query = useHandbookTemplates()
  const pool = query.data

  const templates = useMemo(() => {
    if (!pool) return []
    return selectPersonalizedTemplates(
      pool.filter((template) => template.kind === kind),
      filter
    )
  }, [pool, filter, kind])

  return { ...query, templates }
}
