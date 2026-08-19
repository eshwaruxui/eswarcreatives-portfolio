// Custom-styled audio player, shared by every audio surface in the Brand
// Visual Guide (item content_type='audio', the document-layout audio
// attachment, and every multi-attachment audio row) via BrandVisualRenderer.
//
// Not a styling preference -- native <audio controls> genuinely cannot be
// recoloured in current Chrome. Verified directly (not assumed), twice:
// neither accentColor on the <audio> element nor a
// ::-webkit-media-controls-timeline/-volume-slider override had any visible
// effect on the real preview -- Chrome's redesigned (2022+) native media
// controls don't expose that hook to CSS at all anymore. Rebuilding the
// scrubber as a real <input type="range"> fixed the resting color, but a
// second, subtler bug followed: browsers apply their own darkening to
// accent-color on hover/active, and starting from an already-dark brand
// teal (#024C4F), that darkening reads as flat black -- also verified
// directly by hovering/dragging a live accent-color range input side by
// side with a fully custom one. So the thumb and track below are NOT
// accent-color -- appearance:none plus explicit ::-webkit-slider-thumb/
// ::-moz-range-thumb rules give brand teal a fixed color the browser can't
// darken on interaction, with the filled portion drawn as a gradient sized
// to the current playback percentage.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { t, fonts } from '../../theme'

const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
const RANGE_TRACK_COLOR = t.border.default

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

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div style={s.root}>
      {/* Scoped to this component's own class, not a page-wide selector --
          appearance:none plus the two vendor thumb pseudo-elements is the
          only way to give the thumb a fixed color the browser won't darken
          on hover/active (see file header). */}
      <style>{`
        .ec-audio-range { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; outline: none; }
        .ec-audio-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${t.text.primaryBrand}; border: none; cursor: pointer; }
        .ec-audio-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: ${t.text.primaryBrand}; border: none; cursor: pointer; }
        .ec-audio-range::-moz-range-track { height: 4px; border-radius: 2px; background: ${RANGE_TRACK_COLOR}; }
        .ec-audio-range::-moz-range-progress { height: 4px; border-radius: 2px; background: ${t.text.primaryBrand}; }
      `}</style>
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
        className="ec-audio-range pf-focus"
        style={{
          ...s.range,
          background: `linear-gradient(to right, ${t.text.primaryBrand} 0%, ${t.text.primaryBrand} ${pct}%, ${RANGE_TRACK_COLOR} ${pct}%, ${RANGE_TRACK_COLOR} 100%)`,
        }}
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
