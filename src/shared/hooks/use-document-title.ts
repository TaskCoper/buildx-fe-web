'use client'

import { useEffect } from 'react'

import { titleWithBrand } from '@/shared/lib/page-title'

/**
 * Đặt tiêu đề tab theo TÊN THẬT của mục đang xem ("{tên} | BuildX") — bài viết, nhà thầu, kiến
 * trúc sư. Các màn này tải dữ liệu ở trình duyệt nên `generateMetadata` phía máy chủ chưa biết
 * tên; nó chỉ đặt tiêu đề chung ("Bài viết cẩm nang | BuildX") làm chỗ đợi, hook này thay bằng tên
 * ngay khi dữ liệu về. Chưa có tên thì giữ tiêu đề chung.
 */
export function useDocumentTitle(name: string | null | undefined) {
  useEffect(() => {
    if (name) document.title = titleWithBrand(name)
  }, [name])
}
