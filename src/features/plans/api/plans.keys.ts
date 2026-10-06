/** Query-key factory cho feature `plans`. */
export const planKeys = {
  all: ['plans'] as const,
  list: () => [...planKeys.all, 'list'] as const
} as const
