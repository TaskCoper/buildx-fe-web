'use client'

import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ClearOutlined,
  DownOutlined,
  ItalicOutlined,
  LinkOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import { useEditorState, type Editor } from '@tiptap/react'
import { Button, Dropdown, Input, Popover, Space, Tooltip } from 'antd'
import { useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'

import { IMAGE_PLACEHOLDER } from './image-placeholder'
import { ORDERED_LIST_TYPES, type OrderedListType } from './list-type'
import { activeOrderedListType, setOrderedListType } from './ordered-list-type'
import { TableToolbar } from './table-toolbar'

/** Thêm https:// nếu người dùng dán link thiếu giao thức. */
const withHttps = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)

type TextStyle = 'paragraph' | 'heading2' | 'heading3'

/** Khóa chuỗi i18n của từng kiểu đánh số (`tools.listStyles.*`) và mẫu ký hiệu hiện trong menu. */
const LIST_STYLE_KEY = {
  '1': 'decimal',
  a: 'lowerAlpha',
  A: 'upperAlpha',
  i: 'lowerRoman',
  I: 'upperRoman'
} as const satisfies Record<OrderedListType, string>
const LIST_STYLE_SAMPLE: Record<OrderedListType, string> = {
  '1': '1. 2. 3.',
  a: 'a. b. c.',
  A: 'A. B. C.',
  i: 'i. ii. iii.',
  I: 'I. II. III.'
}

/** Ký hiệu nút trích dẫn (antd không có biểu tượng dấu trích). */
const QUOTE_GLYPH = '“ ”'

function ToolButton({
  label,
  active = false,
  disabled,
  onClick,
  children
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip title={label}>
      <Button
        size='small'
        type={active ? 'primary' : 'text'}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  )
}

const Separator = () => <span aria-hidden className='mx-1 h-5 w-px bg-[var(--admin-border)]' />

/**
 * Thanh công cụ của ô rich text — một hàng nút ngay trên vùng soạn (kiểu CKEditor). Chỉ có định dạng mà backend
 * giữ lại khi lưu (TDD-NEWS-001): đoạn, tiêu đề h2/h3, đậm / nghiêng / gạch chân / gạch ngang, liên kết, danh
 * sách (thụt / lùi để lồng nhiều cấp, hoặc phím Tab / Shift+Tab), trích dẫn, ảnh và bảng.
 */
export function RichTextToolbar({ editor, allowImages }: { editor: Editor; allowImages: boolean }) {
  const t = useTranslations('admin.newsArticles.editor')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      link: current.isActive('link'),
      heading2: current.isActive('heading', { level: 2 }),
      heading3: current.isActive('heading', { level: 3 }),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      orderedListType: activeOrderedListType(current),
      blockquote: current.isActive('blockquote'),
      alignCenter: current.isActive({ textAlign: 'center' }),
      alignRight: current.isActive({ textAlign: 'right' }),
      alignJustify: current.isActive({ textAlign: 'justify' }),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      canIndent: current.can().sinkListItem('listItem'),
      canOutdent: current.can().liftListItem('listItem')
    })
  })

  // Căn trái là mặc định (không ghi thuộc tính), nên coi là đang căn trái khi không căn kiểu khác.
  const alignLeft = !state.alignCenter && !state.alignRight && !state.alignJustify

  const textStyle: TextStyle = state.heading2 ? 'heading2' : state.heading3 ? 'heading3' : 'paragraph'

  function setTextStyle(next: TextStyle) {
    const chain = editor.chain().focus()
    if (next === 'paragraph') chain.setParagraph().run()
    else chain.setHeading({ level: next === 'heading2' ? 2 : 3 }).run()
  }

  function applyLink() {
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

  return (
    <div
      role='toolbar'
      aria-label={t('toolbar')}
      className='flex flex-wrap items-center gap-0.5 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1.5'
    >
      <ToolButton label={t('tools.undo')} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <UndoOutlined />
      </ToolButton>
      <ToolButton label={t('tools.redo')} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <RedoOutlined />
      </ToolButton>

      <Separator />

      <Dropdown
        trigger={['click']}
        menu={{
          selectable: true,
          selectedKeys: [textStyle],
          items: (['paragraph', 'heading2', 'heading3'] as const).map((key) => ({
            key,
            label: t(`tools.${key}`)
          })),
          onClick: ({ key }) => setTextStyle(key as TextStyle)
        }}
      >
        <Button size='small' type='text' aria-label={t('tools.textStyle')} style={{ minWidth: 112, textAlign: 'left' }}>
          {t(`tools.${textStyle}`)} <DownOutlined />
        </Button>
      </Dropdown>

      <Separator />

      <ToolButton
        label={t('tools.alignLeft')}
        active={alignLeft}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeftOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.alignCenter')}
        active={state.alignCenter}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenterOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.alignRight')}
        active={state.alignRight}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRightOutlined />
      </ToolButton>

      <Separator />

      <ToolButton label={t('tools.bold')} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <BoldOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.italic')}
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.underline')}
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.strike')}
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.clearFormat')}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <ClearOutlined />
      </ToolButton>

      <Separator />

      <Popover
        open={linkOpen}
        onOpenChange={setLinkOpen}
        trigger='click'
        content={
          <Space.Compact style={{ width: 280 }}>
            <Input
              autoFocus
              placeholder={t('urlPlaceholder')}
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onPressEnter={applyLink}
            />
            <Button type='primary' onClick={applyLink}>
              {t('urlAdd')}
            </Button>
          </Space.Compact>
        }
      >
        <Button
          size='small'
          type={state.link ? 'primary' : 'text'}
          aria-label={t('tools.link')}
          aria-pressed={state.link}
          icon={<LinkOutlined />}
        />
      </Popover>

      <Separator />

      <ToolButton
        label={t('tools.bulletList')}
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <UnorderedListOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.numberList')}
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <OrderedListOutlined />
      </ToolButton>
      <Dropdown
        trigger={['click']}
        menu={{
          selectable: true,
          selectedKeys: state.orderedListType ? [state.orderedListType] : [],
          items: ORDERED_LIST_TYPES.map((type) => ({
            key: type,
            label: (
              <span className='flex items-center justify-between gap-6'>
                <span>{t(`tools.listStyles.${LIST_STYLE_KEY[type]}`)}</span>
                <span className='text-[var(--admin-muted)]'>{LIST_STYLE_SAMPLE[type]}</span>
              </span>
            )
          })),
          onClick: ({ key }) => setOrderedListType(editor, key as OrderedListType)
        }}
      >
        <Button
          size='small'
          type='text'
          aria-label={t('tools.listStyle')}
          title={t('tools.listStyle')}
          icon={<DownOutlined />}
          style={{ marginLeft: -2, paddingInline: 4 }}
        />
      </Dropdown>
      <ToolButton
        label={t('tools.outdent')}
        disabled={!state.canOutdent}
        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
      >
        <MenuFoldOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.indent')}
        disabled={!state.canIndent}
        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
      >
        <MenuUnfoldOutlined />
      </ToolButton>
      <ToolButton
        label={t('tools.quote')}
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        {QUOTE_GLYPH}
      </ToolButton>

      <Separator />

      {allowImages ? (
        <ToolButton
          label={t('tools.image')}
          onClick={() => editor.chain().focus().insertContent({ type: IMAGE_PLACEHOLDER }).run()}
        >
          <PictureOutlined />
        </ToolButton>
      ) : null}
      <TableToolbar editor={editor} />
    </div>
  )
}
