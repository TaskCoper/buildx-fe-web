/**
 * Cú pháp tiêu đề tab của cả site: "{Tên trang} | BuildX" (bảng title SEO của khách).
 * Một nơi duy nhất giữ đuôi thương hiệu để layout (`title.template`), hook đặt tiêu đề theo
 * tên mục đang xem và trang lỗi không lệch nhau.
 */
export const TITLE_BRAND = 'BuildX'

/** Mẫu cho `metadata.title.template` của Next. */
export const TITLE_TEMPLATE = `%s | ${TITLE_BRAND}`

export const titleWithBrand = (name: string) => `${name} | ${TITLE_BRAND}`
