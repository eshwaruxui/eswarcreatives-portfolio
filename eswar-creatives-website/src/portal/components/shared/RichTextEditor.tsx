// Minimal WYSIWYG editor for Tone of Voice's prose Text field -- Bold,
// one heading level (matching the existing ### convention already typed
// into the plain textarea), bullet/numbered lists, undo/redo. Reads and
// writes plain markdown (via tiptap-markdown), not HTML: storage stays a
// plain string, no schema change, and BrandVisualRenderer's read side
// parses that same markdown with the same library (markdown-it, already
// a transitive dependency here) rather than trusting two different
// formats to agree.
//
// Deliberately not StarterKit's full default set -- italic/strike/code/
// codeBlock/blockquote/horizontalRule are all disabled below. Nothing in
// this feature's brief asked for them, and every extra mark/node is a
// wider surface for the exact class of bug this session kept finding in
// hand-rolled editable state (cursor jumps, unexpected remounts).
import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import {
  Bold as BoldIcon,
  Heading3,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import type { MarkdownStorage } from 'tiptap-markdown'
import { t, fonts } from '../../theme'

// tiptap-markdown ships MarkdownStorage as its own extension's storage
// type, but doesn't merge it into @tiptap/core's generic Storage interface
// -- editor.storage.markdown is genuinely present at runtime (Markdown
// registers it) but invisible to TypeScript without this augmentation.
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage
  }
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 180,
}: {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Markdown.configure({ html: false, tightLists: true }),
    ],
    content: value,
    editorProps: { attributes: { class: 'ec-rte-content' } },
    onUpdate: ({ editor: e }) => {
      onChange(e.storage.markdown.getMarkdown())
    },
  })

  // Sync an externally-changed value (e.g. opening a different item) into
  // the editor -- but only when it genuinely differs from what the editor
  // itself last produced, or every keystroke's own onUpdate -> parent
  // state -> this prop would immediately re-set content and fight the
  // cursor, the same remount-on-every-render class of bug this session
  // already hit twice in the shared Modal.
  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) return null

  return (
    <div style={s.wrap}>
      <style>{`
        .ec-rte-content { outline: none; }
        .ec-rte-content p { margin: 0 0 12px; }
        .ec-rte-content p:last-child { margin-bottom: 0; }
        .ec-rte-content h3 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
        .ec-rte-content ul, .ec-rte-content ol { margin: 0 0 12px; padding-left: 22px; }
        .ec-rte-content li { margin-bottom: 4px; }
        .ec-rte-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: ${t.text.tertiary};
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <div style={s.toolbar}>
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </ToolbarButton>
        <span style={s.divider} />
        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} />
        </ToolbarButton>
      </div>
      <div style={{ ...s.body, minHeight }} className="pf-focus">
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  )
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection/focus intact
      onClick={onClick}
      style={{ ...s.toolbarBtn, ...(active ? s.toolbarBtnActive : null) }}
    >
      {children}
    </button>
  )
}

const s: Record<string, CSSProperties> = {
  wrap: {
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    overflow: 'hidden',
    background: t.background.surface,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '6px 8px',
    borderBottom: `1px solid ${t.border.subtle}`,
    background: t.background.subtle,
  },
  toolbarBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: t.text.secondary,
    cursor: 'pointer',
  },
  toolbarBtnActive: {
    background: t.background.tint2,
    color: t.text.primaryBrand,
  },
  divider: {
    width: 1,
    height: 18,
    background: t.border.subtle,
    margin: '0 4px',
  },
  body: {
    padding: '10px 12px',
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: t.text.primary,
    overflowY: 'auto',
    maxHeight: 360,
  },
}
