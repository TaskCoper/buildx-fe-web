'use client'

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { isApiError } from '@/shared/lib/api'
import { consultationApi } from '../api/consultation.api'
import { consultationKeys } from '../api/consultation.keys'
import { CONSULTANT_DIRECTORY_PAGE_SIZE } from '../constants/consultation.constants'
import type { BookConsultationPayload } from '../types/consultation.types'

/** Danh sách kiến trúc sư của trang Tư vấn 1:1 (mục VIII.1). */
export function useConsultants() {
  return useQuery({
    queryKey: consultationKeys.consultants(),
    queryFn: () => consultationApi.listConsultants()
  })
}

/**
 * Trang Tư vấn 1:1: từng trang 6 KTS do backend tìm và lọc (`keyword`, `specialtyId`), nút "Xem thêm" tải trang kế tiếp.
 * Đổi từ khóa hoặc chuyên môn là một danh sách mới bắt đầu lại từ trang 1; danh sách cũ vẫn hiện mờ cho tới khi trang
 * đầu của danh sách mới về, nên lưới không nhấp nháy trống giữa hai lần gõ.
 */
export function useConsultantDirectory(filter: { keyword: string; specialtyId: string }) {
  return useInfiniteQuery({
    queryKey: consultationKeys.directory(filter),
    queryFn: ({ pageParam, signal }) =>
      consultationApi.listConsultantsPage(pageParam, signal, {
        ...(filter.keyword ? { keyword: filter.keyword } : {}),
        ...(filter.specialtyId ? { specialtyId: filter.specialtyId } : {}),
        pageSize: CONSULTANT_DIRECTORY_PAGE_SIZE
      }),
    initialPageParam: 1,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    getNextPageParam: (page) => (page.hasNextPage && page.items.length > 0 ? page.pageIndex + 1 : undefined),
    select: (data) => ({
      consultants: [...new Map(data.pages.flatMap((page) => page.items).map((item) => [item.id, item])).values()],
      totalCount: data.pages.at(-1)?.totalCount ?? 0
    })
  })
}

/** Chuyên môn có ít nhất một KTS hiển thị, cho dropdown lọc của trang Tư vấn 1:1. */
export function useConsultantSpecialties() {
  return useQuery({
    queryKey: consultationKeys.specialties(),
    queryFn: ({ signal }) => consultationApi.listSpecialties(signal),
    staleTime: 5 * 60_000
  })
}

/** Danh sách cuộn ở hồ sơ KTS; giữ trang đã tải khi chuyển hồ sơ. */
export function useConsultantPages() {
  return useInfiniteQuery({
    queryKey: consultationKeys.consultantPages(),
    queryFn: ({ pageParam, signal }) => consultationApi.listConsultantsPage(pageParam, signal),
    initialPageParam: 1,
    staleTime: 30_000,
    getNextPageParam: (page) => (page.hasNextPage && page.items.length > 0 ? page.pageIndex + 1 : undefined),
    retry: false,
    select: (data) => [...new Map(data.pages.flatMap((page) => page.items).map((item) => [item.id, item])).values()]
  })
}

export function useConsultant(consultantId: string) {
  return useQuery({
    queryKey: consultationKeys.consultantDetail(consultantId),
    queryFn: () => consultationApi.getConsultant(consultantId),
    enabled: Boolean(consultantId)
  })
}

/** Lịch trống 7 ngày của một KTS (mục VIII.2). */
export function useAvailability(consultantId: string) {
  return useQuery({
    queryKey: consultationKeys.availability(consultantId),
    queryFn: () => consultationApi.getAvailability(consultantId),
    enabled: Boolean(consultantId)
  })
}

/**
 * Xác nhận đặt lịch (mục VIII.3): toast góc phải trên rồi làm mới lịch để slot
 * vừa đặt chuyển sang "Kín". SMS xác nhận do backend gửi (mục VIII.4).
 */
export function useBookConsultation() {
  const queryClient = useQueryClient()
  const t = useTranslations('consult.booking')
  const tErrors = useTranslations('errors')

  return useMutation({
    mutationFn: (payload: BookConsultationPayload) => consultationApi.bookConsultation(payload),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.availability(booking.consultantId) })
      queryClient.invalidateQueries({ queryKey: consultationKeys.myBookings() })
      queryClient.invalidateQueries({ queryKey: consultationKeys.myRequests() })
      toast.success(t('successToast'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : tErrors('generic'))
    }
  })
}

/** Yêu cầu tư vấn của chính khách (`GET /me/consultation-requests`), tải thêm từng trang. */
export function useMyConsultationRequests(enabled = true) {
  return useInfiniteQuery({
    queryKey: consultationKeys.myRequests(),
    queryFn: ({ pageParam, signal }) => consultationApi.listMyRequestsPage(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasNextPage && page.items.length > 0 ? page.pageIndex + 1 : undefined),
    enabled,
    retry: false
  })
}

/** Lịch sử tư vấn của người dùng đang đăng nhập. */
export function useMyConsultations(enabled = true) {
  return useQuery({
    queryKey: consultationKeys.myBookings(),
    queryFn: () => consultationApi.getMyBookings(),
    enabled
  })
}

/** Hủy lịch từ tab Tài khoản và làm mới danh sách ngay sau khi backend xác nhận. */
export function useCancelConsultation() {
  const queryClient = useQueryClient()
  const t = useTranslations('account.consultationHistory')
  const tErrors = useTranslations('errors')

  return useMutation({
    mutationFn: (bookingId: string) => consultationApi.cancelMyBooking(bookingId),
    onSuccess: (history) => {
      queryClient.setQueryData(consultationKeys.myBookings(), history)
      toast.success(t('cancel.success'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : tErrors('generic'))
    }
  })
}
