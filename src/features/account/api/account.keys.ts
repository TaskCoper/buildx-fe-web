/** Query-key factory cho feature `account`. */
export const accountKeys = {
  all: ['account'] as const,
  plan: () => [...accountKeys.all, 'plan'] as const,
  purchaseHistory: () => [...accountKeys.all, 'purchase-history'] as const,
  /** Gốc của mọi trang và số đếm Lịch sử mua — làm mới sau khi hủy đơn. */
  purchases: () => [...accountKeys.all, 'purchases'] as const,
  purchasePage: (filter: string, pageIndex: number) => [...accountKeys.purchases(), 'page', filter, pageIndex] as const,
  purchaseCounts: () => [...accountKeys.purchases(), 'counts'] as const
} as const
