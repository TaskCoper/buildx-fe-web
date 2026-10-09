'use client'

import { useQueries, useQuery } from '@tanstack/react-query'
import { env } from '@/shared/config/env'
import { getContractorFilterOptions, type ContractorSearchFilters } from '@/shared/contractors'

import { contractorsApi } from '../api/contractors.api'
import { contractorKeys } from '../api/contractors.keys'
import { bmtContractorsApi } from '../api/contractors.bmt'

/** Danh bạ công khai S09; không yêu cầu hồ sơ khi chưa lọc bán kính. */
export function useContractorDirectory(filters: ContractorSearchFilters = {}) {
  return useQuery({
    queryKey: contractorKeys.directory(filters),
    queryFn: ({ signal }) => bmtContractorsApi.listDirectory(filters, signal),
    enabled: !env.NEXT_PUBLIC_USE_MOCK_API
  })
}

/** Danh sách nhà thầu đề xuất cho một hồ sơ dự án (S12). */
export function useContractors(projectId: string, filters: ContractorSearchFilters = {}, enabled = true) {
  return useQuery({
    queryKey: contractorKeys.list(projectId, filters),
    queryFn: ({ signal }) => contractorsApi.listContractors(projectId, filters, signal),
    enabled: enabled && Boolean(projectId)
  })
}

/**
 * Chi tiết một dự án của nhà thầu (hộp thoại dự án ở S13). `data` là `null` khi không có gì để bổ sung
 * (dự án mock, 404, lỗi mạng) — giao diện giữ dữ liệu thẻ. Không retry: 404 là câu trả lời.
 */
export function useContractorProject(contractorId: string, projectId: string) {
  return useQuery({
    queryKey: contractorKeys.project(contractorId, projectId),
    queryFn: () => contractorsApi.getContractorProject(contractorId, projectId),
    enabled: Boolean(contractorId && projectId),
    staleTime: 5 * 60 * 1000,
    retry: false
  })
}

/** Hồ sơ một nhà thầu — dùng chung cho cả 4 tab (S13, S14). */
export function useContractor(contractorId: string) {
  return useQuery({
    queryKey: contractorKeys.detail(contractorId),
    queryFn: () => contractorsApi.getContractor(contractorId),
    enabled: Boolean(contractorId),
    retry: false
  })
}

/**
 * Hồ sơ của một DANH SÁCH nhà thầu theo mã (bảng so sánh S15): mỗi mã một request `GET /contractors/{id}` chạy song song,
 * dùng chung cache với {@link useContractor}. Kết quả giữ đúng thứ tự `ids`; mã nào lỗi thì `contractors[i]` là `undefined`
 * và nằm trong `failedIds` — một nhà thầu lỗi không làm mất các cột còn lại.
 */
export function useContractorsByIds(ids: readonly string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: contractorKeys.detail(id),
      queryFn: () => contractorsApi.getContractor(id),
      retry: false,
      staleTime: 60 * 1000
    })),
    combine: (results) => ({
      contractors: results.map((result) => result.data),
      isPending: results.some((result) => result.isPending),
      failedIds: ids.filter((_, index) => results[index]?.isError),
      refetchFailed: () => Promise.all(results.map((result) => (result.isError ? result.refetch() : undefined)))
    })
  })
}

export function useContractorFilterOptions() {
  return useQuery({
    queryKey: [...contractorKeys.all, 'filter-options'],
    queryFn: ({ signal }) => getContractorFilterOptions(signal),
    enabled: !env.NEXT_PUBLIC_USE_MOCK_API
  })
}
