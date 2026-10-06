import { useLocale } from 'next-intl'
import type { CSSProperties } from 'react'

import {
  LEGAL_DOCS,
  type LegalBlock,
  type LegalDoc,
  type LegalDocKey,
  type LegalNote,
  type LegalParagraph
} from '../constants/legal-docs'
import { LEGAL_DOCS_EN } from '../constants/legal-docs.en'

const ALIGN = { j: 'justify', c: 'center', r: 'right' } as const

/** Dính "Build X" bằng khoảng trắng không ngắt, để chữ "X" không rớt xuống dòng riêng. */
const keepBrandTogether = (text: string) => text.replace(/(build)\s+x\b/gi, '$1 X')

/** Một đoạn chữ với đúng màu / đậm / nghiêng / cỡ chữ của file docs. */
function Runs({ paragraph, base, oneLine }: { paragraph: LegalParagraph; base: LegalDoc['base']; oneLine?: boolean }) {
  // Tiêu đề một dòng: cỡ chữ không vượt quá bề rộng khung chia theo số ký tự (chữ hoa đậm ≈ 0.75em/ký tự).
  const chars = paragraph.r.reduce((n, run) => n + run.t.length, 0)
  const fitCqw = (100 / (chars * 0.75)).toFixed(2)
  return (
    <>
      {paragraph.r.map((run, i) => (
        <span
          key={i}
          style={{
            color: `#${run.c ?? base.c}`,
            // Cỡ thân bài = 1rem; các cỡ khác theo đúng tỉ lệ trong file gốc.
            fontSize: oneLine
              ? `min(${(run.z ?? base.z) / base.z}rem, ${fitCqw}cqw)`
              : run.z && run.z !== base.z
                ? `${run.z / base.z}rem`
                : undefined,
            fontWeight: run.b ? 700 : undefined,
            fontStyle: run.i ? 'italic' : undefined
          }}
        >
          {keepBrandTogether(run.t)}
        </span>
      ))}
    </>
  )
}

/** Đoạn nhìn như tiêu đề: đúng kiểu tiêu đề, hoặc cả đoạn in đậm và lớn hơn thân bài. */
function isHeadingLike(p: LegalParagraph, base: LegalDoc['base']) {
  if (p.k !== 'p' && p.k !== 'li') return true
  const only = p.r.length === 1 ? p.r[0] : undefined
  return Boolean(only?.b) && (only?.z ?? base.z) > base.z
}

function Paragraph({ p, base, first }: { p: LegalParagraph; base: LegalDoc['base']; first: boolean }) {
  const style: CSSProperties = { textAlign: p.a ? ALIGN[p.a] : undefined }
  const spacing = first ? '' : isHeadingLike(p, base) ? 'mt-8' : 'mt-3'
  const Tag = p.k === 'title' ? 'h1' : p.k === 'h2' ? 'h2' : p.k === 'h3' ? 'h3' : 'p'
  return (
    <Tag className={`leading-relaxed ${p.k === 'title' ? 'whitespace-nowrap' : ''} ${spacing}`} style={style}>
      <Runs paragraph={p} base={base} oneLine={p.k === 'title'} />
    </Tag>
  )
}

function Note({ note, base }: { note: LegalNote; base: LegalDoc['base'] }) {
  const { top, right, bottom, left } = note.sides
  const edge = (side?: [string, number]) => (side ? `${side[1]}px solid #${side[0]}` : 'none')
  return (
    <div
      className='mt-4 space-y-2 rounded-md px-5 py-4'
      style={{
        backgroundColor: note.fill ? `#${note.fill}` : undefined,
        borderTop: edge(top),
        borderRight: edge(right),
        borderBottom: edge(bottom),
        borderLeft: edge(left)
      }}
    >
      {note.ps.map((p, i) => (
        <p key={i} className='leading-relaxed' style={{ textAlign: p.a ? ALIGN[p.a] : undefined }}>
          <Runs paragraph={p} base={base} />
        </p>
      ))}
    </div>
  )
}

/**
 * Trang pháp lý (Điều khoản / Quyền riêng tư / Điều khoản AI / TMĐT & Đối tác / Thanh toán & Hoàn tiền).
 *
 * Nội dung và định dạng lấy từ docs Bên A gửi (`legal-docs.ts`, bản tiếng Anh ở `legal-docs.en.ts`). Màu chữ trong docs được
 * chọn cho nền trắng nên tài liệu nằm trên một "tờ giấy" trắng cố định — không đổi theo
 * chế độ tối, để chữ luôn đọc được và đúng màu gốc.
 */
export function LegalPage({ doc }: { doc: LegalDocKey }) {
  // Có bản dịch tiếng Anh cho `en`; ngôn ngữ khác dùng bản tiếng Việt (bản gốc có giá trị pháp lý).
  const locale = useLocale()
  const { base, blocks } = (locale === 'en' ? LEGAL_DOCS_EN : LEGAL_DOCS)[doc]

  // Gom các `li` liền nhau thành một danh sách.
  const groups: ({ kind: 'list'; items: LegalParagraph[] } | { kind: 'block'; block: LegalBlock })[] = []
  for (const block of blocks) {
    if (block.k === 'li') {
      const last = groups.at(-1)
      if (last?.kind === 'list') last.items.push(block)
      else groups.push({ kind: 'list', items: [block] })
    } else {
      groups.push({ kind: 'block', block })
    }
  }

  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-5 lg:px-8'>
      <article
        className='@container rounded-2xl border bg-white px-6 py-10 shadow-sm sm:px-12'
        style={{ color: `#${base.c}` }}
      >
        {groups.map((group, i) => {
          if (group.kind === 'list') {
            return (
              <ul key={i} className='mt-3 list-disc space-y-2 pl-6'>
                {group.items.map((item, j) => (
                  <li key={j} className='leading-relaxed' style={{ textAlign: item.a ? ALIGN[item.a] : undefined }}>
                    <Runs paragraph={item} base={base} />
                  </li>
                ))}
              </ul>
            )
          }
          return group.block.k === 'note' ? (
            <Note key={i} note={group.block} base={base} />
          ) : (
            <Paragraph key={i} p={group.block} base={base} first={i === 0} />
          )
        })}
      </article>
    </div>
  )
}
