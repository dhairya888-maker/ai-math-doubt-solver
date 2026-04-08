import { useEffect, useMemo, useRef, useState } from 'react'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function newId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const STORAGE_KEYS = {
  theme: 'aimath_theme',
  recent: 'aimath_recent_questions',
} as const

function readRecentQuestions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recent)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => typeof x === 'string').slice(0, 5)
  } catch {
    return []
  }
}

function writeRecentQuestions(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(items.slice(0, 5)))
  } catch {
    // ignore
  }
}

type AskAction = 'solve' | 'eli10' | 'practice'

async function postAsk(payload: {
  question: string
  action: AskAction
  contextAnswer?: string
}): Promise<{ answer: string }> {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/ask`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  const data = (await res.json().catch(() => null)) as null | { answer?: string; error?: string }
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  if (!data?.answer) throw new Error('Empty response from server')
  return { answer: data.answer }
}

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I’m your AI Math Doubt Solver. Ask me any K–12 math question and I’ll explain step-by-step.",
    },
  ])
  const lastAssistantAnswer = useMemo(() => {
    const m = [...messages].reverse().find((x) => x.role === 'assistant')
    return m?.id === 'welcome' ? '' : m?.content ?? ''
  }, [messages])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [recent, setRecent] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readRecentQuestions()))

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem(STORAGE_KEYS.theme)
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const bottomRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading, error])

  async function send(question: string, action: AskAction) {
    const trimmed = question.trim()
    if (!trimmed) return

    setError(null)
    setIsLoading(true)

    if (action === 'solve') {
      setMessages((prev) => [...prev, { id: newId(), role: 'user', content: trimmed }])
      const nextRecent = [trimmed, ...recent.filter((x) => x !== trimmed)].slice(0, 5)
      setRecent(nextRecent)
      writeRecentQuestions(nextRecent)
    } else {
      // reflect the user intent in chat for demo clarity
      const label =
        action === 'eli10' ? 'Explain like I’m 10' : 'Give me similar questions'
      setMessages((prev) => [...prev, { id: newId(), role: 'user', content: `${label} → ${trimmed}` }])
    }

    try {
      const { answer } = await postAsk({
        question: trimmed,
        action,
        contextAnswer: action === 'solve' ? undefined : lastAssistantAnswer || undefined,
      })
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: answer }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input, 'solve')
    setInput('')
  }

  const canUseButtons = !isLoading && !!lastAssistantAnswer

  async function copyLastAnswer() {
    const text = lastAssistantAnswer
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/70 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight sm:text-base">
                  AI Math Doubt Solver for Students
                </div>
                <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                  Step-by-step explanations • ELI10 • Practice questions
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </header>

        <main className="mt-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex w-full',
                    m.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%]',
                      m.role === 'user'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                        : 'border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                    Thinking…
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
                  <div className="font-semibold">Something went wrong</div>
                  <div className="mt-1 text-rose-800 dark:text-rose-200">{error}</div>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canUseButtons}
                onClick={() => void send(input || 'Simplify the last answer', 'eli10')}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Explain like I’m 10
              </button>
              <button
                type="button"
                disabled={!canUseButtons}
                onClick={() => void send(input || 'Give me similar questions', 'practice')}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Give me similar questions
              </button>
              <button
                type="button"
                disabled={!canUseButtons}
                onClick={() => void copyLastAnswer()}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Copy answer
              </button>

              <div className="ml-auto flex items-center gap-2">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Recent:</div>
                <select
                  className="max-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return
                    setInput(v)
                  }}
                >
                  <option value="">Pick…</option>
                  {recent.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Try: "Solve 2x + 5 = 15"'
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>

            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Tip: Ask in plain English. I’ll respond step-by-step and keep it simple.
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

