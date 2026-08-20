import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'

const DAILY_CAP_OPTIONS = [5, 10, 15, 20, 25] as const

type Settings = {
  daily_cap: number
  sending_name: string | null
  sending_email: string | null
}

export function OutreachSettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [sendingName, setSendingName] = useState('')
  const [sendingEmail, setSendingEmail] = useState('')
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return
      setUserId(session.user.id)
      const { data } = await supabase
        .from('outreach_user_settings')
        .select('daily_cap, sending_name, sending_email')
        .eq('user_id', session.user.id)
        .single()
      if (!cancelled && data) {
        setSettings(data as Settings)
        setSendingName(data.sending_name || '')
        setSendingEmail(data.sending_email || '')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleDailyCapChange(cap: number) {
    if (!userId) return
    setSettings((s) => (s ? { ...s, daily_cap: cap } : s))
    await supabase.from('outreach_user_settings').update({ daily_cap: cap }).eq('user_id', userId)
  }

  async function handleSaveIdentity() {
    if (!userId) return
    await supabase
      .from('outreach_user_settings')
      .update({ sending_name: sendingName.trim() || null, sending_email: sendingEmail.trim() || null })
      .eq('user_id', userId)
    setSavedNote(true)
    setTimeout(() => setSavedNote(false), 2000)
  }

  if (!settings) {
    return <div style={styles.wrap} />
  }

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Settings</h1>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Daily send limit</h2>
        <div style={styles.segmentedRow}>
          {DAILY_CAP_OPTIONS.map((opt) => {
            const selected = settings.daily_cap === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleDailyCapChange(opt)}
                style={{
                  ...styles.segmentedButton,
                  background: selected ? tokens.primary : t.background.surface,
                  color: selected ? t.text.onPrimary : t.text.primary,
                  border: `1px solid ${selected ? tokens.primary : t.border.default}`,
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Sending identity</h2>
        <label style={styles.label}>
          Sending name
          <input
            type="text"
            value={sendingName}
            onChange={(e) => setSendingName(e.target.value)}
            onBlur={handleSaveIdentity}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Sending email
          <input
            type="email"
            value={sendingEmail}
            onChange={(e) => setSendingEmail(e.target.value)}
            onBlur={handleSaveIdentity}
            style={styles.input}
          />
        </label>
        <button type="button" onClick={handleSaveIdentity} style={styles.saveButton}>
          Save
        </button>
        {savedNote && <span style={styles.savedNote}>Saved</span>}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitleSmall}>Ideal Customer Profile</h2>
        <p style={styles.icpNote}>
          ICP-based lead matching is coming soon. For now, focus on adding leads manually.
        </p>
      </section>
    </div>
  )
}

const styles: Record<string, any> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 480 },
  title: { fontFamily: fonts.heading, fontSize: 22, color: t.text.primary, margin: 0 },
  section: { display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: t.text.primary, margin: 0 },
  sectionTitleSmall: { fontFamily: fonts.heading, fontSize: 16, color: t.text.primary, margin: 0 },
  segmentedRow: { display: 'flex', gap: 8 },
  segmentedButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  input: {
    height: 44,
    boxSizing: 'border-box',
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '0 14px',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    outline: 'none',
  },
  saveButton: {
    alignSelf: 'flex-start',
    height: 44,
    padding: '0 20px',
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  savedNote: { fontFamily: fonts.body, fontSize: 13, color: t.border.success },
  icpNote: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0, lineHeight: 1.5 },
}
