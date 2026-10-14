export interface DiffLine {
  kind: 'same' | 'added' | 'removed'
  text: string
}
/** Bounded line diff: matching anchors preserve order without a quadratic matrix for long documents. */
export function revisionDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n'),
    b = after.split('\n'),
    out: DiffLine[] = []
  let i = 0,
    j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i++]! })
      j++
      continue
    }
    let left = -1,
      right = -1
    for (let n = 1; n <= 80; n++) {
      if (j + n < b.length && i < a.length && a[i] === b[j + n]) {
        right = n
        break
      }
      if (i + n < a.length && j < b.length && a[i + n] === b[j]) {
        left = n
        break
      }
    }
    if (right > 0) {
      while (right--) out.push({ kind: 'added', text: b[j++]! })
    } else if (left > 0) {
      while (left--) out.push({ kind: 'removed', text: a[i++]! })
    } else {
      if (i < a.length) out.push({ kind: 'removed', text: a[i++]! })
      if (j < b.length) out.push({ kind: 'added', text: b[j++]! })
    }
  }
  return out
}
