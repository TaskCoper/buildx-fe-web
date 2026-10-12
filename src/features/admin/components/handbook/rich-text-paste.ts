/**
 * Chuẩn hoá HTML dán vào ô rich text (Google Docs, Word, trang web) TRƯỚC khi TipTap phân tích, để nội dung giữ
 * được định dạng mà backend lưu (allowlist ở TDD-NEWS-001) thay vì vỡ hoặc bị cắt lúc lưu.
 *
 * Chạy ở trình duyệt (cần `DOMParser`). Các việc làm, theo thứ tự:
 *   · bỏ thẻ không phải nội dung (meta, style, script…) và khối bọc `docs-internal-guid` của Google Docs;
 *   · Docs xuất danh sách PHẲNG: mỗi mục là một `<li aria-level="n">` trong các `<ul>/<ol>` rời nhau. Dựng lại thành
 *     danh sách LỒNG nhau theo `aria-level`, gộp các danh sách liền kề (mục lục nhiều cấp);
 *   · tiêu đề: h1 → h2, h4–h6 → h3 (editor và trang công khai chỉ có h2/h3); bỏ in đậm thừa trong tiêu đề;
 *   · bỏ gạch chân nằm trong liên kết (Docs gạch chân mọi link) và các đoạn / dòng trống do Docs chèn;
 *   · ảnh: backend chỉ nhận ảnh ở kho của hệ thống, nên ảnh từ nguồn ngoài đổi thành `img[data-image-source]` —
 *     `ImagePlaceholder` đọc nó để tự tải ảnh về rồi tải lên kho; nơi không cho ảnh thì bỏ ảnh.
 */

export interface PasteOptions {
  /** Nơi không nhận ảnh (trang pháp lý ở chân trang): bỏ mọi ảnh. */
  allowImages: boolean
  /** Ảnh đã thuộc kho của hệ thống (đang có trong bài) thì giữ nguyên, không tải lại. */
  isOwnImage: (src: string) => boolean
}

const NON_CONTENT = 'meta, style, script, link, title, head > *'

const unwrap = (element: Element) => {
  element.replaceWith(...Array.from(element.childNodes))
}

const rename = (element: Element, tag: string) => {
  const next = element.ownerDocument.createElement(tag)
  next.append(...Array.from(element.childNodes))
  element.replaceWith(next)
}

/** Số nguyên dương trong thuộc tính width/height của ảnh, hoặc `null`. */
export const positiveInt = (value: string | null) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Ảnh là nội dung duy nhất của đoạn (Docs bọc ảnh trong `<p><span>`) thì bỏ đoạn bọc đi: ảnh là khối riêng nên
 * nếu để nguyên, đoạn bị tách đôi và để lại đoạn rỗng thừa quanh ảnh.
 */
function liftFromEmptyParagraph(image: Element) {
  const paragraph = image.closest('p')
  if (!paragraph) return
  const textless = (paragraph.textContent ?? '').replace(/ /g, ' ').trim() === ''
  if (textless && paragraph.querySelectorAll('img').length === 1) paragraph.replaceWith(image)
}

type ListItem = { li: HTMLElement; level: number; ordered: boolean }

/** Dựng các mục (đã có `aria-level`) thành cây danh sách lồng nhau; trả về các danh sách gốc. */
function buildNestedLists(items: ListItem[], doc: Document): HTMLElement[] {
  const roots: HTMLElement[] = []
  const stack: { list: HTMLElement; level: number; ordered: boolean }[] = []

  for (const item of items) {
    item.li.removeAttribute('aria-level')
    item.li.removeAttribute('style')
    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) > item.level) stack.pop()

    let top = stack[stack.length - 1]
    // Cùng cấp nhưng khác kiểu (chấm ↔ số): đóng danh sách cũ, mở danh sách mới ở cấp đó.
    if (top && top.level === item.level && top.ordered !== item.ordered) {
      stack.pop()
      top = stack[stack.length - 1]
    }
    if (!top || top.level < item.level) {
      const list = doc.createElement(item.ordered ? 'ol' : 'ul')
      if (top) (top.list.lastElementChild ?? top.list).appendChild(list)
      else roots.push(list)
      top = { list, level: item.level, ordered: item.ordered }
      stack.push(top)
    }
    top.list.appendChild(item.li)
  }
  return roots
}

/** Gộp các `<ul>/<ol>` liền kề của Google Docs thành danh sách lồng nhau. */
function nestGoogleDocsLists(body: HTMLElement) {
  if (!body.querySelector('li[aria-level]')) return

  const parents = new Set<Element>()
  body.querySelectorAll('li[aria-level]').forEach((li) => {
    const grandParent = li.parentElement?.parentElement
    if (grandParent) parents.add(grandParent)
  })

  const isDocsList = (node: Element) =>
    (node.tagName === 'UL' || node.tagName === 'OL') && node.querySelector(':scope > li[aria-level]') !== null

  for (const parent of parents) {
    let run: Element[] = []
    const flush = () => {
      const first = run[0]
      if (!first) return
      const items: ListItem[] = run.flatMap((list) =>
        Array.from(list.children)
          .filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'LI')
          .map((li) => ({
            li,
            level: Math.max(1, Number.parseInt(li.getAttribute('aria-level') ?? '1', 10) || 1),
            ordered: list.tagName === 'OL'
          }))
      )
      first.before(...buildNestedLists(items, parent.ownerDocument))
      run.forEach((list) => list.remove())
      run = []
    }
    for (const child of Array.from(parent.children)) {
      if (isDocsList(child)) run.push(child)
      else flush()
    }
    flush()
  }
}

export function normalizePastedHtml(html: string, options: PasteOptions): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body

  body.querySelectorAll(NON_CONTENT).forEach((node) => node.remove())
  body.querySelectorAll('[id^="docs-internal-guid"]').forEach(unwrap)

  nestGoogleDocsLists(body)

  body.querySelectorAll('h1').forEach((heading) => rename(heading, 'h2'))
  body.querySelectorAll('h4, h5, h6').forEach((heading) => rename(heading, 'h3'))
  body.querySelectorAll('h2, h3').forEach((heading) => {
    heading.querySelectorAll('b, strong').forEach(unwrap)
    heading.querySelectorAll<HTMLElement>('[style]').forEach((node) => node.style.removeProperty('font-weight'))
  })

  body.querySelectorAll<HTMLElement>('a [style]').forEach((node) => node.style.removeProperty('text-decoration'))

  body.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') ?? ''
    if (!options.allowImages || !src) {
      image.remove()
      return
    }
    // Đường dẫn tương đối (cùng nguồn với trang) là ảnh của hệ thống; `//host/...` thì không.
    if (/^\/(?!\/)/.test(src) || options.isOwnImage(src)) {
      liftFromEmptyParagraph(image)
      return
    }

    const imported = image.ownerDocument.createElement('img')
    imported.setAttribute('data-image-source', src)
    const alt = image.getAttribute('alt')
    if (alt) imported.setAttribute('alt', alt)
    const width = positiveInt(image.getAttribute('width'))
    const height = positiveInt(image.getAttribute('height'))
    if (width && height) {
      imported.setAttribute('width', String(width))
      imported.setAttribute('height', String(height))
    }
    image.replaceWith(imported)
    liftFromEmptyParagraph(imported)
  })

  body.querySelectorAll(':scope > br').forEach((node) => node.remove())
  body.querySelectorAll(':scope > p').forEach((paragraph) => {
    const empty = (paragraph.textContent ?? '').replace(/ /g, ' ').trim() === ''
    if (empty && !paragraph.querySelector('img, table')) paragraph.remove()
  })

  return body.innerHTML
}

/** Tên máy chủ của mọi ảnh `src` tuyệt đối trong một đoạn HTML. */
export function imageHostsIn(html: string): Set<string> {
  const hosts = new Set<string>()
  for (const match of html.matchAll(/<img\b[^>]*?\bsrc="([^"]+)"/gi)) {
    const host = hostOfUrl((match[1] ?? '').replace(/&amp;/g, '&'))
    if (host) hosts.add(host)
  }
  return hosts
}

/** Tên máy chủ của một URL tuyệt đối; `null` nếu không phải URL http(s). */
export function hostOfUrl(src: string): string | null {
  try {
    const url = new URL(src)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.host.toLowerCase() : null
  } catch {
    return null
  }
}
