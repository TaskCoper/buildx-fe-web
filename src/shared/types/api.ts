/**
 * Transport-level contracts shared across every feature's API layer.
 * Mirror the envelope shape returned by the .NET backend here so features
 * never re-declare it.
 */

/** Error block inside the BMT `Result<T>` envelope. */
export interface ApiResultError {
  code: string
  message: string
  messageCode?: string | null
}

/**
 * Standard envelope of the BMT .NET API (`Result<T>` in Swagger). Failures that
 * the backend reports without an HTTP error still come back as
 * `isSuccess: false` with `error` filled, so `http` checks both.
 */
export interface ApiResponse<TData = unknown> {
  isSuccess: boolean
  isFailure: boolean
  error?: ApiResultError | null
  value?: TData
}

/** A page of results as returned by BMT list endpoints (`PagedResult<T>`). */
export interface PagedResult<TItem> {
  items: TItem[]
  pageIndex: number
  pageSize: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/** Normalized error shape produced by the response interceptor. */
export interface ApiError {
  /** HTTP status code, or 0 for network/timeout failures. */
  status: number
  /** Machine-readable error code from the backend, when available. */
  code?: string
  /** Stable reason code from the backend (e.g. `AccountLocked`, `InvalidAccessToken`). */
  messageCode?: string
  /** Human-readable message (already localized server-side or generic). */
  message: string
  /** Field-level validation errors keyed by field name. */
  errors?: Record<string, string[]>
}

/** Cursor/page metadata returned by paginated list endpoints. */
export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** A page of results plus its metadata. */
export interface PaginatedResponse<TItem> {
  items: TItem[]
  meta: PaginationMeta
}

/** Query parameters accepted by paginated list endpoints. */
export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
