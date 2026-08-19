// Custom-styled audio player, shared by every audio surface in the Brand
// Visual Guide (item content_type='audio', the document-layout audio
// attachment, and every multi-attachment audio row) via BrandVisualRenderer.
//
// Not a styling preference -- native <audio controls> genuinely cannot be
// recoloured in current Chrome. Verified directly (not assumed): neither
// accentColor on the <audio> element nor a ::-webkit-media-controls-timeline/
// -volume-slider CSS override (both tried and shipped, then found to still
// render the default near-black scrubber on the real preview) has any
// visible effect -- Chrome's redesigned (2022+) native media controls don't
// expose that hook to CSS at all anymore. A real <input type="range">, by
// contrast, is a standard form control that reliably honors accent-color
// across Chrome/Firefox/Safari, confirmed by direct side-by-side browser
// testing. So this drives the underlying (hidden-controls) <audio> element
// with our own play/pause button, time display and range-input scrubber
// instead of trusting the browser's own widget to pick up brand colour.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { t, fonts } from '../../theme'

const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function BrandVisualAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)

  // A caller re-mounting this with a new src (Previous/Next paging through
  // items) needs playback state reset -- otherwise the scrubber would show
  // the previous track's position for a moment before metadata loads.
  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onLoaded = () => setDuration(audio.duration || 0)
    const onEnded = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [src])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  function seek(next: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = next
    setCurrentTime(next)
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  return (
    <div style={s.root}>
      {/* Native controls deliberately off -- this element is only ever the
          decode/playback engine; every visible control below is ours. */}
      <audio ref={audioRef} preload="metadata" src={src} style={{ display: 'none' }} />
      <button
        type="button"
        className="pf-focus"
        onClick={togglePlay}
        style={s.playBtn}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={13} color={t.text.onPrimary} /> : <Play size={13} color={t.text.onPrimary} />}
      </button>
      <span style={s.time}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
        className="pf-focus"
        style={s.range}
        aria-label="Seek"
      />
      <button
        type="button"
        className="pf-focus"
        onClick={toggleMute}
        style={s.iconBtn}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={15} color={t.text.secondary} /> : <Volume2 size={15} color={t.text.secondary} />}
      </button>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 999,
    padding: '6px 14px 6px 6px',
    fontFamily: fonts.body,
  },
  playBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: 'none',
    background: t.text.primaryBrand,
    cursor: 'pointer',
    flexShrink: 0,
  },
  time: {
    fontFamily: mono,
    fontSize: 11.5,
    color: t.text.secondary,
    flexShrink: 0,
    minWidth: 70,
  },
  range: {
    flex: 1,
    accentColor: t.text.primaryBrand,
    cursor: 'pointer',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 4,
  },
}
