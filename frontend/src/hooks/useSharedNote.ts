import { useEffect, useRef, useState } from 'react'
import { pb } from '../pocketbase'

export interface NoteAuthor {
  name: string
  color: string
}

export interface UseSharedNoteResult {
  content: string
  lastAuthor: NoteAuthor | null
  isOtherTyping: boolean
  updateNote: (value: string) => void
}

export function useSharedNote(
  myUserId: string,
  username: string,
  color: string,
): UseSharedNoteResult {
  const [content, setContent] = useState('')
  const [lastAuthor, setLastAuthor] = useState<NoteAuthor | null>(null)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const noteIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localContentRef = useRef('')

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const list = await pb.collection('note').getList(1, 1)
        if (!mounted) return
        if (list.totalItems > 0) {
          const record = list.items[0]
          noteIdRef.current = record.id
          setContent(record.content ?? '')
          localContentRef.current = record.content ?? ''
          if (record.authorName) {
            setLastAuthor({ name: record.authorName, color: record.authorColor })
          }
        } else {
          const record = await pb.collection('note').create({
            content: '',
            authorName: '',
            authorColor: '',
          })
          if (!mounted) return
          noteIdRef.current = record.id
        }
      } catch (err) {
        console.error('[SharedNote] Failed to init note record:', err)
      }
    }

    init()

    let cancelled = false
    let unsub: (() => void) | null = null

    pb.collection('note').subscribe('*', (e) => {
      if (!mounted) return
      const incoming = e.record.content ?? ''
      const isFromOther = e.record.Userid !== myUserId

      if (isFromOther) {
        setContent(incoming)
        localContentRef.current = incoming
      }

      if (e.record.authorName && isFromOther) {
        setLastAuthor({ name: e.record.authorName, color: e.record.authorColor })
        setIsOtherTyping(true)
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => setIsOtherTyping(false), 1500)
      }
    }).then((fn) => {
      if (cancelled) { fn(); return }
      unsub = fn
    }).catch(console.error)

    return () => {
      mounted = false
      cancelled = true
      unsub?.()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [myUserId, username])

  function updateNote(value: string) {
    setContent(value)
    localContentRef.current = value
    if (!noteIdRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!noteIdRef.current) return
      pb.collection('note').update(noteIdRef.current, {
        content: value,
        Userid: myUserId,
        authorName: username,
        authorColor: color,
      }).catch(() => {})
    }, 300)
  }

  return { content, lastAuthor, isOtherTyping, updateNote }
}
