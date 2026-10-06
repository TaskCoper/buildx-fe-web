import { mockAdminApi } from './admin.mock'

/**
 * Kho CMS của khu quản trị (bảng + tài liệu cấu hình, lưu localStorage).
 *
 * BMT API không có kho nội dung chung kiểu này, nên kho CMS luôn chạy bản
 * localStorage kể cả khi tắt `NEXT_PUBLIC_USE_MOCK_API`. Các màn đã có API
 * riêng (tin tức, KTS, gói, đơn…) không đi qua đây mà gọi module BMT của màn đó.
 */
export const adminApi = mockAdminApi
