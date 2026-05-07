import { useEffect, useRef } from 'react'
import { CursorCanvas } from './components/CursorCanvas'
import { SharedNote } from './components/SharedNote'
import { useCursors } from './hooks/useCursors'
import { useMouseTracker } from './hooks/useMouseTracker'

export default function App() {
  const { myUserId, username, color } = useMouseTracker()
  const { cursors, registerEl } = useCursors(myUserId)

  const myCursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = myCursorRef.current
    if (!el) return
    function onMove(e: MouseEvent) {
      el!.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const otherCount = cursors.length

  return (
    <div className="min-h-screen bg-gray-950 text-white select-none flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800/60 px-6 py-3 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-gray-200 tracking-tight">PocketBase Realtime</span>
          <span className="text-gray-600 text-sm">·</span>
          <span className="text-sm text-gray-500">Mouse Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-gray-300">{username}</span>
          <span className="text-xs font-mono text-gray-600 bg-gray-900 rounded px-1.5 py-0.5">{myUserId}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        {/* Big counter */}
        <div className="text-center">
          <div className="text-8xl font-black tabular-nums text-white leading-none">{otherCount}</div>
          <div className="mt-2 text-gray-400 text-lg">
            {otherCount === 1 ? 'other cursor' : 'other cursors'} live
          </div>
        </div>

        {/* Avatar pills */}
        {cursors.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {cursors.map((c) => (
              <div
                key={c.userId}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white border"
                style={{
                  backgroundColor: c.color + '22',
                  borderColor: c.color + '55',
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                {c.username}
              </div>
            ))}
          </div>
        )}

        {/* Shared note */}
        <SharedNote myUserId={myUserId} username={username} color={color} />

        {/* Hint */}
        <p className="text-gray-600 text-sm text-center max-w-sm leading-relaxed">
          Move your mouse anywhere on this page. Open another tab or browser to see real-time cursor sync.
        </p>

        {/* Tech info */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          {[
            ['Transport', 'SSE'],
            ['Storage', 'SQLite'],
            ['Throttle', '50ms + 5px'],
            ['Lerp', '0.18'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 text-center"
            >
              <div className="text-xs text-gray-500 font-medium">{label}</div>
              <div className="text-sm font-mono font-semibold text-gray-200 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Remote cursors */}
      <CursorCanvas cursors={cursors} registerEl={registerEl} />

      {/* My cursor */}
      <div
        ref={myCursorRef}
        className="pointer-events-none fixed z-50"
        style={{ willChange: 'transform', top: 0, left: 0 }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={color}
          style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}
        >
          <path d="M5.5 3.5L20 12l-6.5 1.5L11 20z" />
        </svg>
      </div>
    </div>
  )
}
