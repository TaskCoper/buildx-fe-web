import { http } from '@/shared/lib/api'
import type { BmtPageSection, BmtStage } from './handbook.cms.logic'

/**
 * Nội dung biên tập của trang Cẩm nang — ba bước, khối Bản tin và khối chữ cố định (TDD-HB-001, TDD-HB-002,
 * TDD-HB-003). Cả ba endpoint đều công khai.
 *
 * KHÔNG rơi về mock khi lỗi: DB đã seed đủ ba bước nên rỗng/lỗi là một sự cố cần thấy, không phải chuyện để che
 * bằng dữ liệu giả. Hook chịu trách nhiệm hiển thị trạng thái lỗi.
 */

/** Bài trong khối Bản tin — cùng hình dạng với một phần tử của `GET /news/articles`. */
export interface BmtNewsletterArticle {
  id: string
  slug?: string | null
  title: string
  readingTimeMinutes?: number | null
  coverImageUrl: string
  firstPublishedAtUtc: string
  categories: { id: string; name: string }[]
}

export interface BmtNewsletter {
  /** Tối đa bốn bài đang công bố theo thứ tự người quản lý xếp. Rỗng nghĩa là trang không dựng dải Bản tin. */
  featured: BmtNewsletterArticle[]
  /** Suy từ danh mục của bài đứng đầu; rỗng khi bài đó không gắn danh mục nào. */
  related: BmtNewsletterArticle[]
}

/** Ba bước kèm chủ đề hướng dẫn của từng bước (`GET /handbook/stages`). */
export const fetchStages = () => http.get<BmtStage[]>('/handbook/stages')

/** Khối Bản tin (`GET /handbook/newsletter`). */
export const fetchNewsletter = () => http.get<BmtNewsletter>('/handbook/newsletter')

/**
 * Các khối chữ đã biên tập của trang Cẩm nang ở một ngôn ngữ (`GET /pages/handbook/sections`). Khối chưa biên
 * tập không có trong kết quả, và ngôn ngữ chưa có bản riêng trả rỗng — không mượn bản tiếng Việt.
 */
export const fetchPageSections = (locale: string) =>
  http.get<BmtPageSection[]>('/pages/handbook/sections', { params: { locale } })
