'use client'

import {
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  UnderlineOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import { Button, Input, Popover, Segmented, Space, Tooltip, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect, useState, type ReactNode } from 'react'

import { IMAGE_PLACEHOLDER, ImagePlaceholder, stripImagePlaceholders } from './image-placeholder'
import { ResizableImage } from './resizable-image'
import { TableToolbar } from './table-toolbar'

const { Text } = Typography

const PREVIEW_STYLE =
  'body{font:15px/1.6 system-ui,sans-serif;color:#1f1f1f;margin:16px}img{max-width:100%;height:auto;border-radius:6px}blockquote{border-left:3px solid #ccc;margin:0;padding-left:12px;color:#555}.tableWrapper{overflow-x:auto;max-width:100%;margin:12px 0}table{border-collapse:collapse;table-layout:fixed;width:100%}td,th{border:1px solid #bfbfbf;padding:8px;min-width:60px;vertical-align:top;overflow-wrap:anywhere}th{background:#f5f5f5;font-weight:600;text-align:start}td>p,th>p{margin:0}'

/**
 * Giá trị của editor xuất cho form: bỏ khung ảnh đang chờ (chỉ có lúc soạn), và vì TipTap coi tài
 * liệu rỗng là `<p></p>` nên quy về chuỗi rỗng để đếm ký tự / validate.
 */
const toValue = (html: string) => {
  const clean = stripImagePlaceholders(html)
  return clean === '<p></p>' ? '' : clean
}

/** Thêm https:// nếu người dùng dán link thiếu giao thức. */
const withHttps = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)

/** Nút định dạng đơn (bật/tắt) — ánh xạ đúng allowlist backend giữ lại (TDD-NEWS-001). */
type ToolKey =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'heading2'
  | 'heading3'
  | 'paragraph'
  | 'bulletList'
  | 'numberList'
  | 'quote'
type Tool = { key: ToolKey; icon: ReactNode; run: (editor: Editor) => void; active: (editor: Editor) => boolean }

const TOOLS: Tool[] = [
  {
    key: 'bold',
    icon: <BoldOutlined />,
    run: (e) => e.chain().focus().toggleBold().run(),
    active: (e) => e.isActive('bold')
  },
  {
    key: 'italic',
    icon: <ItalicOutlined />,
    run: (e) => e.chain().focus().toggleItalic().run(),
    active: (e) => e.isActive('italic')
  },
  {
    key: 'underline',
    icon: <UnderlineOutlined />,
    run: (e) => e.chain().focus().toggleUnderline().run(),
    active: (e) => e.isActive('underline')
  },
  {
    key: 'heading2',
    icon: 'H2',
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    active: (e) => e.isActive('heading', { level: 2 })
  },
  {
    key: 'heading3',
    icon: 'H3',
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    active: (e) => e.isActive('heading', { level: 3 })
  },
  {
    key: 'paragraph',
    icon: 'P',
    run: (e) => e.chain().focus().setParagraph().run(),
    active: (e) => e.isActive('paragraph')
  },
  {
    key: 'bulletList',
    icon: <UnorderedListOutlined />,
    run: (e) => e.chain().focus().toggleBulletList().run(),
    active: (e) => e.isActive('bulletList')
  },
  {
    key: 'numberList',
    icon: <OrderedListOutlined />,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    active: (e) => e.isActive('orderedList')
  },
  {
    key: 'quote',
    icon: '“ ”',
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    active: (e) => e.isActive('blockquote')
  }
]

/**
 * Ô nội dung bài viết dạng RICH TEXT (WYSIWYG) — soạn trực tiếp trên bản render,
 * không cho gõ HTML thô. Xuất `contentHtml` gồm định dạng, ảnh và bảng;
 * backend làm sạch lại khi lưu, giữ cấu trúc bảng và độ rộng hợp lệ.
 * Nút ảnh chèn một KHUNG ẢNH vào chỗ con trỏ; bấm
 * chọn tệp hoặc kéo thả ảnh vào khung là tải thẳng lên kho qua MEDIA (presign),
 * khung tự thành ảnh — không còn dán link.
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
  allowImages = true
}: {
  value?: string
  onChange?: (value: string) => void
  maxLength: number
  allowImages?: boolean
}) {
  const t = useTranslations('admin.newsArticles.editor')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

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
      ...(allowImages ? [ResizableImage.configure({ inline: false }), ImagePlaceholder] : [])
    ],
    content: value ?? '',
    editorProps: { attributes: { class: 'admin-richtext' } },
    onUpdate: ({ editor }) => onChange?.(toValue(editor.getHTML()))
  })

  // Đồng bộ khi `value` đổi từ bên ngoài (mở bài khác, reset form). Chỉ đặt lại
  // khi khác nội dung hiện tại để không nhảy con trỏ trong lúc gõ. So theo `toValue` (đã bỏ khung ảnh)
  // để khung đang chờ không bị xoá mỗi lần form nhận lại giá trị.
  useEffect(() => {
    if (!editor) return
    if ((value ?? '') !== toValue(editor.getHTML()))
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false })
  }, [value, editor])

  const html = value ?? ''

  function applyLink() {
    if (!editor) return
    const raw = linkUrl.trim()
    setLinkOpen(false)
    setLinkUrl('')
    if (!raw) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const href = withHttps(raw)
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${href}">${href}</a>`).run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
  }

  /** Chèn khung ảnh tại con trỏ (focus() trả lại vùng chọn cuối trong editor). */
  function insertImagePlaceholder() {
    editor?.chain().focus().insertContent({ type: IMAGE_PLACEHOLDER }).run()
  }

  return (
    <Space orientation='vertical' size={8} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        <Segmented
          size='small'
          value={mode}
          onChange={setMode}
          options={[
            { value: 'edit', label: t('edit') },
            { value: 'preview', label: t('preview') }
          ]}
        />
        {mode === 'edit' && editor ? (
          <>
            {TOOLS.map((tool) => (
              <Tooltip key={tool.key} title={t(`tools.${tool.key}`)}>
                <Button
                  size='small'
                  type={tool.active(editor) ? 'primary' : 'default'}
                  aria-label={t(`tools.${tool.key}`)}
                  onClick={() => tool.run(editor)}
                >
                  {tool.icon}
                </Button>
              </Tooltip>
            ))}
            <Popover
              open={linkOpen}
              onOpenChange={setLinkOpen}
              trigger='click'
              content={
                <UrlInput
                  placeholder={t('urlPlaceholder')}
                  action={t('urlAdd')}
                  value={linkUrl}
                  onChange={setLinkUrl}
                  onSubmit={applyLink}
                />
              }
            >
              <Button
                size='small'
                type={editor.isActive('link') ? 'primary' : 'default'}
                aria-label={t('tools.link')}
                icon={<LinkOutlined />}
              />
            </Popover>
            {allowImages ? (
              <Tooltip title={t('tools.image')}>
                <Button
                  size='small'
                  aria-label={t('tools.image')}
                  icon={<PictureOutlined />}
                  onClick={insertImagePlaceholder}
                />
              </Tooltip>
            ) : null}
            <TableToolbar editor={editor} />
          </>
        ) : null}
      </div>
      {mode === 'edit' ? <EditorContent editor={editor} /> : <HtmlPreview html={html} title={t('preview')} />}
      <Text type={html.length > maxLength ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
        {t('count', { count: html.length.toLocaleString(), max: maxLength.toLocaleString() })} · {t('hint')}
      </Text>
    </Space>
  )
}

/** Ô dán URL nhỏ trong Popover cho nút liên kết / ảnh. */
function UrlInput({
  placeholder,
  action,
  value,
  onChange,
  onSubmit
}: {
  placeholder: string
  action: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <Space.Compact style={{ width: 280 }}>
      <Input
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPressEnter={onSubmit}
      />
      <Button type='primary' onClick={onSubmit}>
        {action}
      </Button>
    </Space.Compact>
  )
}

/** Xem trước HTML trong iframe `sandbox` rỗng — không chạy script, không đọc cookie. */
export function HtmlPreview({ html, title, height = 420 }: { html: string; title: string; height?: number }) {
  return (
    <iframe
      title={title}
      sandbox=''
      srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>${PREVIEW_STYLE}</style></head><body>${html}</body></html>`}
      style={{ width: '100%', height, border: '1px solid var(--admin-border)', borderRadius: 8 }}
    />
  )
}
