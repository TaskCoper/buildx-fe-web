'use client'

import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { ARTICLE_BODY_CLASS, LEGAL_BODY_CLASS } from '@/shared/lib/rich-content'
import { cn } from '@/shared/lib/utils'

import { ImagePlaceholder, hasOwnImageHost, stripImagePlaceholders } from './image-placeholder'
import { ResizableImage } from './resizable-image'
import { RichTextToolbar } from './rich-text-toolbar'
import { hostOfUrl, imageHostsIn, normalizePastedHtml } from './rich-text-paste'

const { Text } = Typography

/** Trong khoảng này, `value` trùng một giá trị editor vừa phát ra được coi là bản vọng lại (về trễ), không phải reset từ ngoài. */
const ECHO_WINDOW_MS = 3000

/**
 * Giá trị của editor xuất cho form: bỏ khung ảnh đang chờ (chỉ có lúc soạn), và vì TipTap coi tài
 * liệu rỗng là `<p></p>` nên quy về chuỗi rỗng để đếm ký tự / validate.
 */
const toValue = (html: string) => {
  const clean = stripImagePlaceholders(html)
  return clean === '<p></p>' ? '' : clean
}

/**
 * Ô nội dung dạng RICH TEXT (WYSIWYG) — MỘT ô duy nhất: thanh công cụ nằm ngay trên vùng soạn và vùng soạn
 * hiển thị đúng như bản render (tiêu đề, danh sách, bảng, ảnh), không còn chuyển Soạn / Xem trước. Không cho
 * gõ HTML thô. Xuất `contentHtml` gồm định dạng, ảnh và bảng; backend làm sạch lại khi lưu, giữ cấu trúc bảng
 * và độ rộng hợp lệ.
 *
 * Nút ảnh chèn một KHUNG ẢNH vào chỗ con trỏ; bấm chọn tệp hoặc kéo thả ảnh vào khung là tải thẳng lên kho qua
 * MEDIA (presign), khung tự thành ảnh — không còn dán link.
 *
 * DÁN từ Google Docs / Word / web: `normalizePastedHtml` giữ tiêu đề, đậm / nghiêng / gạch chân, liên kết, danh
 * sách lồng nhau và bảng; ảnh dán từ nguồn ngoài tự tải lên kho. Màu và cỡ chữ không nằm trong allowlist của
 * backend nên không được giữ. Căn lề đoạn / tiêu đề (left / center / right / justify) được lưu thành
 * `style="text-align: …"`; backend phải có bản cho phép kiểu này (NewsHtmlSanitizer) thì mới lưu được.
 *
 * `allowImages={false}` cho nơi backend không nhận ảnh (trang pháp lý ở chân trang): bỏ nút ảnh và cả khả năng nhận ảnh
 * khi dán hay kéo thả, để HTML xuất ra luôn lưu được.
 *
 * Dùng như control của `Form.Item` (nhận `value` / `onChange`).
 */
export function HtmlContentEditor({
  value,
  onChange,
  maxLength,
  allowImages = true,
  appearance = 'article'
}: {
  value?: string
  onChange?: (value: string) => void
  maxLength: number
  allowImages?: boolean
  /** Nội dung sẽ hiển thị ở đâu cho khách: bài Cẩm nang (mặc định) hay trang pháp lý. Quyết định kiểu chữ của vùng soạn. */
  appearance?: 'article' | 'legal'
}) {
  const t = useTranslations('admin.newsArticles.editor')
  const editorRef = useRef<Editor | null>(null)
  // Các giá trị editor vừa báo ra (kèm lúc báo) — để nhận ra bản vọng lại của chính nó khi `value` về trễ.
  const emitted = useRef<{ value: string; at: number }[]>([])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          protocols: ['https'],
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
        }
      }),
      TableKit.configure({ table: { resizable: true, renderWrapper: true, cellMinWidth: 60 } }),
      // Căn lề đoạn / tiêu đề (cả đoạn trong ô bảng): lưu thành `style="text-align: …"`, backend giữ lại.
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
      ...(allowImages ? [ResizableImage.configure({ inline: false }), ImagePlaceholder] : [])
    ],
    content: value ?? '',
    editorProps: {
      // Cùng lớp CSS với nơi khách đọc (`shared/lib/rich-content`) để soạn thấy sao khách thấy vậy.
      // `font-sans` vì vùng soạn nằm trong Ant Design (thừa hưởng font của antd) còn trang công khai dùng `font-sans` của site.
      attributes: {
        class: cn('admin-richtext font-sans', appearance === 'legal' ? LEGAL_BODY_CLASS : ARTICLE_BODY_CLASS)
      },
      // Ảnh đã nằm trong bài hoặc vừa tải lên kho thì giữ nguyên; ảnh từ nguồn khác được tự tải về rồi tải lên.
      transformPastedHTML: (html) =>
        normalizePastedHtml(html, {
          allowImages,
          isOwnImage: (src) => {
            const host = hostOfUrl(src)
            if (!host) return false
            return hasOwnImageHost(host) || imageHostsIn(editorRef.current?.getHTML() ?? '').has(host)
          }
        })
    },
    onCreate: ({ editor: created }) => {
      editorRef.current = created
    },
    onUpdate: ({ editor: updated }) => {
      const next = toValue(updated.getHTML())
      emitted.current = [...emitted.current.slice(-19), { value: next, at: Date.now() }]
      onChange?.(next)
    }
  })

  // Đồng bộ khi `value` đổi từ bên ngoài (mở bài khác, reset form). Chỉ đặt lại
  // khi khác nội dung hiện tại để không nhảy con trỏ trong lúc gõ. So theo `toValue` (đã bỏ khung ảnh)
  // để khung đang chờ không bị xoá mỗi lần form nhận lại giá trị. Giá trị form có thể về TRỄ một nhịp (dán
  // rồi ảnh tải xong ngay sau đó): đó là bản vọng lại của chính editor, không phải thay đổi từ ngoài, nên bỏ qua
  // — nếu không nó ghi đè lên nội dung mới hơn. Chỉ tính là vọng lại khi khớp một lần phát ra trong vài giây
  // gần đây; reset từ ngoài về cùng giá trị sau đó (vd. đổi ngôn ngữ nội dung rồi đổi lại) vẫn được áp dụng.
  useEffect(() => {
    if (!editor) return
    const incoming = value ?? ''
    if (incoming === toValue(editor.getHTML())) return
    const now = Date.now()
    if (emitted.current.some((entry) => entry.value === incoming && now - entry.at < ECHO_WINDOW_MS)) return
    editor.commands.setContent(incoming || '<p></p>', { emitUpdate: false })
  }, [value, editor])

  const html = value ?? ''

  return (
    <div className='flex flex-col gap-2'>
      <div className='admin-richtext-box'>
        {editor ? <RichTextToolbar editor={editor} allowImages={allowImages} /> : null}
        <EditorContent editor={editor} />
      </div>
      <Text type={html.length > maxLength ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
        {t('count', { count: html.length.toLocaleString(), max: maxLength.toLocaleString() })} · {t('hint')}
      </Text>
    </div>
  )
}

/**
 * Hiển thị HTML đã lưu đúng như khách thấy: dùng cùng lớp CSS với trang Cẩm nang (`ARTICLE_BODY_CLASS`). HTML lấy từ
 * API nên đã được backend làm sạch theo allowlist (TDD-NEWS-001) — cùng cách trang công khai render bài viết.
 */
export function HtmlPreview({ html, title, height = 420 }: { html: string; title: string; height?: number }) {
  return (
    <div
      role='region'
      aria-label={title}
      className='overflow-auto rounded-lg border p-4'
      style={{ maxHeight: height, borderColor: 'var(--admin-border)' }}
    >
      <div className={ARTICLE_BODY_CLASS} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
