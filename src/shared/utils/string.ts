/** Small, pure string helpers. */

/** Build initials from a name, e.g. "Nguyen Van A" -> "NA". */
export function getInitials(name: string, maxChars = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const initials = [parts[0], parts[parts.length - 1]]
    .filter(Boolean)
    .map((p) => p![0]!.toUpperCase())
    .join('')
  return initials.slice(0, maxChars)
}

/** Truncate to `max` characters, appending an ellipsis when cut. */
export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}
