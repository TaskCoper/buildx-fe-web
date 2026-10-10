import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { BmtCustomerStatus } from './customers.logic'

/**
 * Tra cứu tài khoản khách hàng (`CustomerApi`, quyền `customer.manage`) — CHỈ ĐỌC.
 *
 * Backend chỉ trả khách (`AccountKind = Customer`) chưa xóa, gồm cả tài khoản bị khóa. Không có thao tác khóa/mở khóa
 * khách, không có lọc theo trạng thái và không có lịch sử lượt: xem `docs/BE_API_GAPS.md`. Gói đã mua, đơn và giao dịch
 * của một khách lấy từ API thương mại (`bmtCommerceApi`, quyền `commerce.read`) theo `customerId`.
 */
export interface BmtCustomerInfo {
  id: string
  firstName?: string | null
  lastName?: string | null
  email: string
  phoneNumber?: string | null
  avatar?: string | null
  status: BmtCustomerStatus
  isEmailVerified: boolean
  createdAtUtc: string
}

export interface CustomerListQuery {
  pageIndex: number
  pageSize: number
  /** Tìm theo tên, email hoặc SĐT, không phân biệt hoa thường (tối đa 100 dòng mỗi trang). */
  search?: string
}

export const bmtCustomersApi = {
  list: (params: CustomerListQuery) => http.get<PagedResult<BmtCustomerInfo>>('/customers', { params }),
  /** Không có, đã xóa hoặc thuộc nhân viên đều trả 404 `CustomerNotFound`. */
  get: (customerId: string) => http.get<BmtCustomerInfo>(`/customers/${encodeURIComponent(customerId)}`)
}
