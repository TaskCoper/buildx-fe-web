import type { LucideIconNode } from './home-sections'

/** Metadata icon thuộc frontend, dùng chung cho bộ chọn và icon mới nhận từ CMS ở client. */
export async function fetchIconNode(name: string): Promise<LucideIconNode | null> {
  const response = await fetch(`/api/icon-preview?name=${encodeURIComponent(name)}`)
  if (!response.ok) throw new Error('Icon preview unavailable')
  const body = (await response.json()) as { node?: LucideIconNode | null }
  return body.node ?? null
}

export async function fetchIconNames(): Promise<string[]> {
  const response = await fetch('/api/icon-preview?catalog=1')
  if (!response.ok) throw new Error('Icon catalog unavailable')
  const body = (await response.json()) as { names?: unknown }
  if (
    !Array.isArray(body.names) ||
    body.names.some((name) => typeof name !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(name))
  )
    throw new Error('Invalid icon catalog')
  return body.names as string[]
}
