// Threaded notes between admin and client. Both roles can post.
// Avatar uses first letter of author name on a teal background.
// Textarea auto-grows; post on Cmd/Ctrl+Enter or the Post button.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { relativeTime } from '../admin/ui'

type Note = {
  id: string
  project_id: string
  body: string
  author_name: string | null
  author_role: 'admin' | 'client'
  created_by: string | null
  created_at: string
}

function Avatar({ name, role }: { name: string | null; role: string }) {
  const initial = (name ?? role).charAt(0).toUpperCase()
  const isAdmin = role === 'admin'
  return (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: isAdmin ? tokens.primary : tokens.accent,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.body,
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  )
}

export function ClientNotes({
  projectId,
  currentUserRole,
  currentUserId,
}: {
  projectId: string
  currentUserRole: 'admin' | 'client'
  currentUserId: string
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void fetchNotes()
  }, [projectId])

  async function fetchNotes() {
    const { data } = await supabase
      .from('project_client_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (data) setNotes(data as Note[])
  }

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  async function post() {
    const trimmed = draft.trim()
    if (!trimmed || posting) return
    setPosting(true)
    setPostError(null)
    const { data: sess } = await supabase.auth.getUser()
    const uid = sess.user?.id ?? currentUserId
    const email = sess.user?.email ?? ''
    const authorName = email.split('@')[0] || currentUserRole
    const { error } = await supabase
      .from('project_client_notes')
      .insert({
        project_id: projectId,
        body: trimmed,
        author_name: authorName,
        author_role: currentUserRole,
        created_by: uid,
      })
    setPosting(false)
    if (error) {
      setPostError('Could not send message. Please try again.')
      return
    }
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await fetchNotes()
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  return (
    <div style={s.root}>
      {/* Note thread */}
      {notes.length === 0 ? (
        <p style={s.empty}>No notes yet. Start the conversation below.</p>
      ) : (
        <div style={s.thread}>
          {notes.map((note) => {
            const isMine = note.author_role === currentUserRole
            return (
              <div key={note.id} style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleTheirs) }}>
                <Avatar name={note.author_name} role={note.author_role} />
                <div style={s.bubbleBody}>
                  <div style={s.bubbleMeta}>
                    <span style={s.authorName}>{note.author_name ?? note.author_role}</span>
                    <span style={s.time}>{relativeTime(note.created_at)}</span>
                  </div>
                  <p style={s.noteText}>{note.body}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {postError && <p style={s.postError}>{postError}</p>}

      {/* Compose row */}
      <div style={s.composeWrap}>
        <Avatar name={null} role={currentUserRole} />
        <div style={s.inputWrap}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); autoGrow() }}
            onKeyDown={(e) => {
              // H1: Cmd/Ctrl+Enter submits; plain Enter adds newline
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                void post()
              }
            }}
            placeholder="Write a note... (Cmd+Enter to post)"
            style={s.textarea}
            disabled={posting}
          />
          <button
            type="button"
            onClick={() => void post()}
            disabled={!draft.trim() || posting}
            style={{
              ...s.postBtn,
              opacity: draft.trim() && !posting ? 1 : 0.4,
              cursor: draft.trim() && !posting ? 'pointer' : 'default',
            }}
            aria-label="Post note"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 16 },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    margin: 0,
    textAlign: 'center' as const,
    padding: '16px 0',
  },
  thread: { display: 'flex', flexDirection: 'column', gap: 12 },
  bubble: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  bubbleMine:   {},
  bubbleTheirs: { flexDirection: 'row-reverse' },
  bubbleBody: { display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '80%' },
  bubbleMeta: { display: 'flex', alignItems: 'center', gap: 6 },
  authorName: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.secondary,
  },
  time: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    margin: 0,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '8px 12px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  composeWrap: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTop: `1px solid ${t.border.subtle}`,
  },
  inputWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '6px 8px',
    background: tokens.surface,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  textarea: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    minHeight: 22,
    maxHeight: 160,
    lineHeight: 1.5,
    padding: 0,
    overflowY: 'auto',
  },
  postError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    margin: '0 0 8px',
    background: tokens.rubyLight,
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${tokens.ruby}`,
  },
  postBtn: {
    background: tokens.primary,
    border: 'none',
    borderRadius: 6,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
}
