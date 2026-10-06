'use client'

import { useEffect, useRef, useState } from 'react'

import { readVideoParam, withoutVideoParam } from '../api/guide.logic'
import type { GuideVideo } from '../types/guide.types'
import { useGuide } from './use-guide'

interface UseGuideDeepLinkOptions {
  videos: GuideVideo[] | undefined
  videosPending: boolean
  onOpen: (video: GuideVideo) => void
}

/**
 * Deep link `?video=<id>` của trang Hướng dẫn: mở thẳng video đó trong lightbox.
 *
 * Tra trong danh sách đã tải trước; không có mới gọi `GET /guides/{id}` (vd video nằm ngoài danh sách
 * đang hiển thị, hoặc danh sách đang là bản mock). Tra xong mà không xem được (404 `GuideNotFound`:
 * đã ẩn / xoá / id sai) thì `unavailable` bật để trang hiện câu "không còn khả dụng" kèm đường về danh sách.
 *
 * `release()` bỏ `?video=` khỏi thanh địa chỉ (không điều hướng) để tải lại trang không mở lại video
 * vừa đóng, và tắt câu báo nếu đang hiện.
 */
export function useGuideDeepLink({ videos, videosPending, onOpen }: UseGuideDeepLinkOptions) {
  // Đọc một lần lúc vào trang. Khởi tạo lười để lần vẽ đầu đã có id, khỏi phải effect + setState.
  // Id chỉ dùng cho điều kiện tra cứu, không ra markup nên server (null) và client không lệch HTML.
  const [guideId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : readVideoParam(window.location.search)
  )
  const [released, setReleased] = useState(false)
  const openedRef = useRef(false)

  const known = guideId && videos ? videos.find((video) => video.id === guideId) : undefined
  const needsLookup = Boolean(guideId) && !videosPending && !known
  const lookup = useGuide(guideId ?? '', needsLookup)

  const found = known ?? lookup.data ?? null
  const lookupDone = !needsLookup || lookup.isFetched
  const unavailable = Boolean(guideId) && !released && !videosPending && lookupDone && !found

  useEffect(() => {
    if (!guideId || openedRef.current || !found) return
    openedRef.current = true
    onOpen(found)
  }, [guideId, found, onOpen])

  const release = () => {
    setReleased(true)
    if (guideId && typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', withoutVideoParam(window.location.href))
    }
  }

  return { unavailable, release }
}
