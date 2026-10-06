'use client'

import { useQuery } from '@tanstack/react-query'

import { guideApi } from '../api/guide.api'
import { guideKeys } from '../api/guide.keys'

export function useGuideVideos() {
  return useQuery({
    queryKey: guideKeys.videos(),
    queryFn: () => guideApi.listVideos(),
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Một video hướng dẫn theo id. `data` là `null` khi video không xem được (đã ẩn / xoá / id sai) —
 * khác `undefined` là chưa tra xong. Không retry: 404 là câu trả lời, không phải lỗi thoáng qua.
 */
export function useGuide(id: string, enabled = true) {
  return useQuery({
    queryKey: guideKeys.detail(id),
    queryFn: () => guideApi.getGuide(id),
    enabled: enabled && Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: false
  })
}

export function useGuideArticles() {
  return useQuery({
    queryKey: guideKeys.articles(),
    queryFn: () => guideApi.listArticles(),
    staleTime: 5 * 60 * 1000
  })
}
