// Admin Settings page. Sidebar nav (same visual pattern as AdminShell's main
// sidebar) with one section for now: ICP configuration, moved here from
// SmartShortlistTab's Section A (Fix 1). Route: /portal/admin/settings.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Upload, SlidersHorizontal, Sparkles, Trash2, FileText } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { mono, PageHeader } from '../ui'
import { showToast } from '../toast'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { sanitizeFilename } from '../../../lib/sanitizeFilename'
import {
  VERTICAL_LABELS,
  type Vertical,
  type ICPConfig,
} from '../../components/shortlist/types'

const VERTICALS: Vertical[] = ['design_systems', 'branding']
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

type SettingsSection = 'icp' | 'skills'

const SECTIONS: { id: SettingsSection; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'icp', label: 'ICP configuration', Icon: SlidersHorizontal },
  { id: 'skills', label: 'Outreach skills', Icon: Sparkles },
]

export function SettingsPage() {
  const { isMobile } = useBreakpoint()
  const [activeSection, setActiveSection] = useState<SettingsSection>('icp')

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure how Smart Shortlist scores and targets leads" />
      <div style={{ ...s.layout, ...(isMobile ? s.layoutMobile : null) }}>
        <nav style={{ ...s.subNav, ...(isMobile ? s.subNavMobile : null) }}>
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              style={{ ...s.subNavItem, ...(activeSection === id ? s.subNavItemActive : null) }}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={18} color={activeSection === id ? tokens.primary : t.text.muted} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div style={s.content}>
          {activeSection === 'icp' && <ICPConfigPanel />}
          {activeSection === 'skills' && <SkillsPanel />}
        </div>
      </div>
    </>
  )
}

function ICPConfigPanel() {
  const [icpConfigs, setIcpConfigs] = useState<Record<Vertical, ICPConfig | null>>({
    design_systems: null,
    branding: null,
  })
  const [configVertical, setConfigVertical] = useState<Vertical>('design_systems')
  const [icpTextDraft, setIcpTextDraft] = useState('')
  const [goalTextDraft, setGoalTextDraft] = useState('')
  const [icpAttachmentPath, setIcpAttachmentPath] = useState<string | null>(null)
  const [goalAttachmentPath, setGoalAttachmentPath] = useState<string | null>(null)
  const [icpUploading, setIcpUploading] = useState(false)
  const [goalUploading, setGoalUploading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  async function loadIcpConfigs() {
    const { data } = await supabase.from('icp_configs').select('*')
    const map: Record<Vertical, ICPConfig | null> = { design_systems: null, branding: null }
    for (const row of (data ?? []) as ICPConfig[]) map[row.vertical] = row
    setIcpConfigs(map)
  }

  useEffect(() => { loadIcpConfigs() }, [])

  useEffect(() => {
    const cfg = icpConfigs[configVertical]
    setIcpTextDraft(cfg?.icp_text ?? '')
    setGoalTextDraft(cfg?.goal_text ?? '')
    setIcpAttachmentPath(cfg?.icp_attachment_url ?? null)
    setGoalAttachmentPath(cfg?.goal_attachment_url ?? null)
  }, [configVertical, icpConfigs])

  async function uploadAttachment(kind: 'icp' | 'goal', file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      showToast('File too large (max 10MB).', 'error')
      return
    }
    const setUploading = kind === 'icp' ? setIcpUploading : setGoalUploading
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `icp/${configVertical}/${kind}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('icp-attachments').upload(path, file)
    setUploading(false)
    if (error) {
      showToast('Upload failed. Please try again.', 'error')
      return
    }
    if (kind === 'icp') setIcpAttachmentPath(path)
    else setGoalAttachmentPath(path)
  }

  async function viewAttachment(path: string) {
    const { data } = await supabase.storage.from('icp-attachments').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleSaveIcp() {
    setSavingConfig(true)
    const { error } = await supabase.from('icp_configs').upsert(
      {
        vertical: configVertical,
        icp_text: icpTextDraft.trim() || null,
        goal_text: goalTextDraft.trim() || null,
        icp_attachment_url: icpAttachmentPath,
        goal_attachment_url: goalAttachmentPath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vertical' }
    )
    setSavingConfig(false)
    if (error) {
      showToast('Could not save ICP configuration.', 'error')
      return
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
    await loadIcpConfigs()
  }

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>ICP configuration</h2>

      <div style={s.configBody}>
        <div style={s.vertTabs}>
          {VERTICALS.map((v) => (
            <button
              key={v}
              type="button"
              style={{ ...s.vertTab, ...(configVertical === v ? s.vertTabActive : null) }}
              onClick={() => setConfigVertical(v)}
            >
              {VERTICAL_LABELS[v]}
            </button>
          ))}
        </div>

        <label style={s.fieldLabel}>
          ICP profile
          <textarea
            style={s.textareaBig}
            value={icpTextDraft}
            onChange={(e) => setIcpTextDraft(e.target.value)}
            rows={5}
            placeholder="Describe your ideal client profile for this vertical. Include company stage, team size, product type, verticals, and buyer titles."
          />
        </label>

        <AttachmentField
          label="Attachment"
          path={icpAttachmentPath}
          uploading={icpUploading}
          onUpload={(f) => uploadAttachment('icp', f)}
          onRemove={() => setIcpAttachmentPath(null)}
          onView={viewAttachment}
        />

        <label style={s.fieldLabel}>
          Acquisition goal
          <input
            style={s.input}
            value={goalTextDraft}
            onChange={(e) => setGoalTextDraft(e.target.value)}
            placeholder="Example: 2 qualified discovery calls in 2 weeks."
          />
        </label>

        <AttachmentField
          label="Attachment"
          path={goalAttachmentPath}
          uploading={goalUploading}
          onUpload={(f) => uploadAttachment('goal', f)}
          onRemove={() => setGoalAttachmentPath(null)}
          onView={viewAttachment}
        />

        <div style={s.saveRow}>
          <button
            type="button"
            style={{ ...s.primaryBtn, opacity: savingConfig ? 0.6 : 1 }}
            onClick={handleSaveIcp}
            disabled={savingConfig}
          >
            {savingConfig ? 'Saving...' : 'Save ICP'}
          </button>
          {savedFlash && <span style={s.savedFlash}>Saved</span>}
        </div>
      </div>
    </div>
  )
}

// Fix 4: drag-and-drop added (was click-to-browse only). Same handler shape as
// the already-working ScreenshotDropZone in the New Shortlist modal.
function AttachmentField({
  label,
  path,
  uploading,
  onUpload,
  onRemove,
  onView,
}: {
  label: string
  path: string | null
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
  onView: (path: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const filename = path?.split('/').pop() ?? ''

  return (
    <div style={s.fieldLabel}>
      <span>{label}</span>
      {path ? (
        <div style={s.attachmentRow}>
          <button type="button" style={s.attachmentName} onClick={() => onView(path)}>{filename}</button>
          <button type="button" style={s.removeLink} onClick={onRemove}>Remove</button>
        </div>
      ) : (
        <button
          type="button"
          style={{ ...s.uploadZone, ...(dragging ? s.uploadZoneDragging : null) }}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) onUpload(file)
          }}
        >
          <Upload size={13} color={t.text.tertiary} />
          {uploading ? 'Uploading...' : dragging ? 'Drop to upload' : 'Drop PDF or image, or click to browse'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
    </div>
  )
}

type OutreachSkill = {
  id: string
  name: string
  description: string | null
  storage_path: string
  is_active: boolean
  created_at: string
}

// Mirrors process-skill-upload's error codes with an actionable message per
// cause, instead of one generic "could not process" string for every failure
// mode — a missing SKILL.md and a corrupt zip need different next steps.
const SKILL_UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  invalid_skill_file: "That file isn't a valid zip archive — re-download or re-export the .skill bundle and try again.",
  missing_skill_md: 'That zip doesn\'t have a SKILL.md file at its root (or inside a single top-level folder). Check the bundle structure.',
  download_failed: 'Uploaded, but the server could not read it back from storage. Try again.',
  save_failed: 'Parsed the file but could not save it. Try again.',
  invalid_storage_path: 'Something went wrong queuing the upload. Try again.',
  not_authenticated: 'Your session expired — refresh the page and sign in again.',
  not_allowed: 'Your account does not have permission to upload skills.',
}

function processSkillErrorMessage(code: string | undefined): string {
  if (!code) return 'Could not process that skill file. Please try again.'
  return SKILL_UPLOAD_ERROR_MESSAGES[code] ?? `Could not process that skill file (${code}).`
}

// Skill files are .skill bundles (a zip of SKILL.md + optional references —
// the same format Claude Code's own Skill system uses). Unzipping needs a
// real zip library, so the browser just uploads the raw file to storage and
// hands off the path to process-skill-upload, which parses it server-side
// into a plain-text row this panel then lists.
function SkillsPanel() {
  const [skills, setSkills] = useState<OutreachSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadSkills() {
    setLoading(true)
    const { data } = await supabase
      .from('outreach_skills')
      .select('id, name, description, storage_path, is_active, created_at')
      .order('created_at', { ascending: false })
    setSkills((data ?? []) as OutreachSkill[])
    setLoading(false)
  }

  useEffect(() => { loadSkills() }, [])

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.skill')) {
      setError('Only .skill files are supported.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const path = `skills/${Date.now()}-${sanitizeFilename(file.name)}.skill`
      // .skill files carry no registered MIME type, so browsers guess
      // inconsistently (application/octet-stream on some systems, empty
      // string or application/zip on others) — an unlucky guess can fall
      // outside the bucket's allowed_mime_types and fail before this even
      // reaches process-skill-upload. Force it explicitly since we've
      // already validated the .skill extension above.
      const { error: uploadErr } = await supabase.storage
        .from('outreach-skills')
        .upload(path, file, { contentType: 'application/zip' })
      if (uploadErr) {
        setError(`Upload failed: ${uploadErr.message}`)
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error: fnErr } = await supabase.functions.invoke('process-skill-upload', {
        body: { storage_path: path },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (fnErr || !data || data.error) {
        setError(processSkillErrorMessage(data?.error))
        return
      }
      showToast('Skill uploaded', 'success', 2000)
      await loadSkills()
    } catch (e) {
      setError(e instanceof Error ? `Upload failed: ${e.message}` : 'Could not upload that file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(skill: OutreachSkill) {
    await supabase.storage.from('outreach-skills').remove([skill.storage_path])
    await supabase.from('outreach_skills').delete().eq('id', skill.id)
    setSkills((prev) => prev.filter((s) => s.id !== skill.id))
    showToast('Skill removed', 'success', 2000)
  }

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Outreach skills</h2>
      <p style={s.cardSubtitle}>
        Uploaded skills are available to select when generating personalized outreach messages for a lead.
      </p>

      <button
        type="button"
        style={{ ...s.uploadZone, ...(dragging ? s.uploadZoneDragging : null) }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleUpload(file)
        }}
      >
        <Upload size={13} color={t.text.tertiary} />
        {uploading ? 'Uploading...' : dragging ? 'Drop to upload' : 'Drop a .skill file, or click to browse'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".skill"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      {error && <div style={s.skillError}>{error}</div>}

      <div style={s.skillList}>
        {loading ? (
          <p style={s.skillEmpty}>Loading...</p>
        ) : skills.length === 0 ? (
          <p style={s.skillEmpty}>No skills uploaded yet.</p>
        ) : (
          skills.map((skill) => (
            <div key={skill.id} style={s.skillRow}>
              <FileText size={16} color={tokens.primary} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.skillName}>{skill.name}</div>
                {skill.description && <div style={s.skillDescription}>{skill.description}</div>}
              </div>
              <button type="button" style={s.removeLink} onClick={() => handleDelete(skill)} aria-label={`Remove ${skill.name}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  layout: { display: 'flex', gap: 24, alignItems: 'flex-start' },
  layoutMobile: { flexDirection: 'column', gap: 16 },
  subNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    width: 220,
    flexShrink: 0,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 12,
    padding: 8,
  },
  subNavMobile: { width: '100%', flexDirection: 'row', overflowX: 'auto' },
  subNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: t.text.secondary,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  subNavItemActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    fontWeight: 600,
  },
  content: { flex: 1, minWidth: 0 },
  card: {
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 20,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary, margin: '0 0 16px' },
  cardSubtitle: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: '-8px 0 16px' },
  skillList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 },
  skillEmpty: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, margin: 0 },
  skillRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
  },
  skillName: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text.primary },
  skillDescription: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, marginTop: 2 },
  skillError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    marginTop: 8,
  },
  configBody: { display: 'flex', flexDirection: 'column', gap: 16 },
  vertTabs: { display: 'flex', gap: 6 },
  vertTab: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 999,
    padding: '5px 14px',
    cursor: 'pointer',
  },
  vertTabActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    borderColor: tokens.accent,
    fontWeight: 600,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textareaBig: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 400,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 12px',
    minHeight: 120,
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 400,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    textTransform: 'none',
    letterSpacing: 0,
  },
  uploadZone: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: t.background.subtle,
    border: `1px dashed ${t.border.default}`,
    borderRadius: 8,
    padding: '14px 16px',
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 400,
    color: t.text.tertiary,
    cursor: 'pointer',
    textTransform: 'none',
    letterSpacing: 0,
    boxSizing: 'border-box' as const,
  },
  uploadZoneDragging: { borderColor: t.border.brand, borderStyle: 'solid', background: t.background.tint1 },
  attachmentRow: { display: 'flex', alignItems: 'center', gap: 10 },
  attachmentName: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.urlLink,
    cursor: 'pointer',
    padding: 0,
    textTransform: 'none',
    textDecoration: 'underline',
  },
  removeLink: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 0,
    textTransform: 'none',
  },
  saveRow: { display: 'flex', alignItems: 'center', gap: 12 },
  savedFlash: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.border.success },
  primaryBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    cursor: 'pointer',
  },
}
