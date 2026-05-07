import { useSharedNote } from '../hooks/useSharedNote'

interface Props {
  myUserId: string
  username: string
  color: string
}

export function SharedNote({ myUserId, username, color }: Props) {
  const { content, lastAuthor, isOtherTyping, updateNote } = useSharedNote(myUserId, username, color)

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 backdrop-blur overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shared Note</span>
          </div>
          <div className="flex items-center gap-2 h-5">
            {isOtherTyping && lastAuthor ? (
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full animate-bounce"
                      style={{
                        backgroundColor: lastAuthor.color,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: lastAuthor.color }}>
                  {lastAuthor.name} is typing
                </span>
              </div>
            ) : lastAuthor ? (
              <span className="text-xs text-gray-600">
                Last edit by{' '}
                <span className="font-medium" style={{ color: lastAuthor.color }}>
                  {lastAuthor.name}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => updateNote(e.target.value)}
          placeholder="Type something... everyone sees it live"
          className="w-full bg-transparent text-gray-200 text-sm px-4 py-3 resize-none outline-none placeholder-gray-700 min-h-[120px] leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
