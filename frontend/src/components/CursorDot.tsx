import type { CursorMeta } from '../types'

interface Props {
  cursor: CursorMeta
  onRef: (el: HTMLElement | null) => void
}

export function CursorDot({ cursor, onRef }: Props) {
  return (
    <div
      ref={onRef}
      className="pointer-events-none absolute top-0 left-0"
      style={{ willChange: 'transform' }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={cursor.color}
        style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}
      >
        <path d="M5.5 3.5L20 12l-6.5 1.5L11 20z" />
      </svg>
      <div
        className="absolute left-4 top-4 rounded-full px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap shadow-md"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.username}
      </div>
    </div>
  )
}
