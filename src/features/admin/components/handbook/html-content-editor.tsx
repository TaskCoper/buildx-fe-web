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
import Image from '@tiptap/extension-image'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button, Input, Popover, Segmented, Space, Tooltip, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect, useState, type ReactNode } from 'react'

const { Text } = Typography

const PREVIEW_STYLE =
  'body{font:15px/1.6 system-ui,sans-serif;color:#1f1f1f;margin:16px}img{max-width:100%;height:auto;border-radius:6px}blockquote{border-left:3px solid #ccc;margin:0;padding-left:12px;color:#555}'

/** TipTap coi tài liệu rỗng là `<p></p>` — quy về chuỗi rỗng để đếm ký tự / validate. */
const normalize = (html: string) => (html === '<p></p>' ? '' : html)

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
 * không cho gõ HTML thô. Vẫn xuất `contentHtml` giới hạn đúng allowlist backend
 * (đậm, nghiêng, gạch chân, H2/H3, đoạn, danh sách, trích dẫn, liên kết, ảnh);
 * backend làm sạch lại khi lưu. API không có upload nên ảnh là URL https có sẵn
 * trên kho — chèn bằng nút ảnh rồi dán link.
 *
 * Dùng như control của `Form.Item` (nhận `value` / `onChange`).
 */
export function HtmlContentEditor({
  value,
  onChange,
  maxLength
}: {
  value?: string
  onChange?: (value: string) => void
  maxLength: number
}) {
  const t = useTranslations('admin.newsArticles.editor')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [linkOpen, setLinkOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')

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
      Image.configure({ inline: false })
    ],
    content: value ?? '',
    editorProps: { attributes: { class: 'admin-richtext' } },
    onUpdate: ({ editor }) => onChange?.(normalize(editor.getHTML()))
  })

  // Đồng bộ khi `value` đổi từ bên ngoài (mở bài khác, reset form). Chỉ đặt lại
  // khi khác nội dung hiện tại để không nhảy con trỏ trong lúc gõ.
  useEffect(() => {
    if (!editor) return
    const next = value ? value : '<p></p>'
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false })
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

  function applyImage() {
    if (!editor) return
    const raw = imageUrl.trim()
    setImageOpen(false)
    setImageUrl('')
    if (raw)
      editor
        .chain()
        .focus()
        .setImage({ src: withHttps(raw) })
        .run()
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
            <Popover
              open={imageOpen}
              onOpenChange={setImageOpen}
              trigger='click'
              content={
                <UrlInput
                  placeholder={t('imagePlaceholder')}
                  action={t('urlAdd')}
                  value={imageUrl}
                  onChange={setImageUrl}
                  onSubmit={applyImage}
                />
              }
            >
              <Button size='small' aria-label={t('tools.image')} icon={<PictureOutlined />} />
            </Popover>
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
