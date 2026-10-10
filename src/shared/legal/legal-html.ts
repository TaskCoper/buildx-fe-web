import type { LegalDoc, LegalParagraph, LegalRun } from './legal-docs'

/**
 * Đổi nội dung trang pháp lý có sẵn (`legal-docs.ts`) sang HTML để admin sửa tại chỗ bằng trình soạn rich text.
 *
 * Chỉ giữ ngữ nghĩa, vì backend chỉ nhận bộ thẻ gọn (p, h2-h6, ul/ol/li, blockquote, strong, em, table...) và làm sạch
 * mọi thứ khác: tiêu đề trang → `h2`, tiêu đề mục → `h3`, đoạn → `p`, các `li` liền nhau → một `ul`, khung ghi chú →
 * `blockquote`, chữ đậm / nghiêng → `strong` / `em`. Màu chữ, cỡ chữ, canh lề và nền khung ghi chú do CSS của
 * `.legal-html` dựng lại khi hiển thị, nên không đi vào HTML.
 *
 * Hàm thuần, không import gì ngoài kiểu, để kiểm bằng `scripts/legal-html.test.mjs`.
 */

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Dính "Build X" bằng khoảng trắng không ngắt để chữ "X" không rớt xuống dòng riêng (giống `LegalPage`). */
const keepBrandTogether = (text: string) => text.replace(/(build)\s+x\b/gi, '$1\u00a0X')

/** Một đoạn chữ; `bold: false` bỏ thẻ đậm (tiêu đề đã đậm sẵn theo CSS). */
function runsHtml(runs: readonly LegalRun[], bold = true): string {
  return runs
    .map((run) => {
      let html = escapeHtml(keepBrandTogether(run.t))
      if (run.i) html = `<em>${html}</em>`
      if (run.b && bold) html = `<strong>${html}</strong>`
      return html
    })
    .join('')
}

/** Đoạn nhìn như tiêu đề: cả đoạn một kiểu chữ in đậm và lớn hơn thân bài (cùng quy tắc với `LegalPage`). */
function isHeadingLike(paragraph: LegalParagraph, base: LegalDoc['base']): boolean {
  if (paragraph.k !== 'p' && paragraph.k !== 'li') return true
  const only = paragraph.r.length === 1 ? paragraph.r[0] : undefined
  return Boolean(only?.b) && (only?.z ?? base.z) > base.z
}

export function legalDocToHtml(doc: LegalDoc): string {
  const out: string[] = []
  let list: string[] | null = null

  const flushList = () => {
    if (list) out.push(`<ul>${list.join('')}</ul>`)
    list = null
  }

  doc.blocks.forEach((block, index) => {
    if (block.k === 'li') {
      list ??= []
      list.push(`<li><p>${runsHtml(block.r)}</p></li>`)
      return
    }
    flushList()

    if (block.k === 'note') {
      out.push(`<blockquote>${block.ps.map((paragraph) => `<p>${runsHtml(paragraph.r)}</p>`).join('')}</blockquote>`)
      return
    }

    const headingLike = isHeadingLike(block, doc.base)
    if (block.k === 'title' || (index === 0 && headingLike)) {
      out.push(`<h2>${runsHtml(block.r, false)}</h2>`)
    } else if (headingLike) {
      out.push(`<h3>${runsHtml(block.r, false)}</h3>`)
    } else {
      out.push(`<p>${runsHtml(block.r)}</p>`)
    }
  })
  flushList()

  return out.join('')
}
