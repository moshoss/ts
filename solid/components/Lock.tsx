import { createSignal, onCleanup, type Component } from 'solid-js'

export interface LockScreenProps {
  onUnlock?: (password: string) => void
}

const LockScreen: Component<LockScreenProps> = (props) => {
  const [now, setNow] = createSignal(new Date())
  const [password, setPassword] = createSignal('')
  const [shake, setShake] = createSignal(false)

  const timer = setInterval(() => setNow(new Date()), 1000)
  onCleanup(() => clearInterval(timer))

  const hours = () => now().getHours().toString().padStart(2, '0')
  const minutes = () => now().getMinutes().toString().padStart(2, '0')
  const seconds = () => now().getSeconds().toString().padStart(2, '0')

  const dateStr = () =>
    now().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (password().trim()) {
      props.onUnlock?.(password())
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-zinc-900 select-none">
      {/* Background decorative elements */}
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/15 dark:bg-blue-500/10 blur-3xl" />
        <div class="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/15 dark:bg-purple-500/10 blur-3xl" />
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-3xl" />
      </div>

      <div class="relative flex flex-col items-center gap-8">
        {/* Time */}
        <div class="flex items-baseline gap-1 tabular-nums">
          <span class="text-8xl font-extralight tracking-tight text-slate-800 dark:text-white">{hours()}</span>
          <span class="text-7xl font-extralight text-slate-400 dark:text-white/40 animate-pulse">:</span>
          <span class="text-8xl font-extralight tracking-tight text-slate-800 dark:text-white">{minutes()}</span>
          <span class="ml-2 text-3xl font-light text-slate-400 dark:text-white/30">{seconds()}</span>
        </div>

        {/* Date */}
        <p class="text-lg font-light tracking-wide text-slate-500 dark:text-white/50">{dateStr()}</p>

        {/* Divider */}
        <div class="h-px w-48 bg-gradient-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent" />

        {/* Password input */}
        <form onSubmit={handleSubmit} class="flex flex-col items-center gap-4">
          <div
            class="transition-transform"
            classList={{ 'animate-[shake_0.5s_ease-in-out]': shake() }}
          >
            <input
              type="password"
              placeholder="输入密码解锁"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="w-64 rounded-full border border-slate-200 bg-white/60 px-6 py-3 text-center text-sm text-slate-800 placeholder-slate-400 backdrop-blur-sm outline-none transition-all focus:border-slate-300 focus:bg-white/80 focus:ring-1 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:border-white/25 dark:focus:bg-white/10 dark:focus:ring-white/10"
            />
          </div>
          <button
            type="submit"
            class="group flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-medium text-slate-500 transition-all hover:text-slate-800 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="size-4 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            解锁
          </button>
        </form>
      </div>
    </div>
  )
}

export default LockScreen
