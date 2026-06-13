'use client'

import { cn } from '@pascal-app/editor'
import { Code2, Loader2, Mail, Zap } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useMemo, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'

type LoginMode = 'magic-link' | 'password'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const url = new URL('/auth/callback', window.location.origin)
    url.searchParams.set('next', nextPath)
    return url.toString()
  }, [nextPath])
  const [mode, setMode] = useState<LoginMode>('magic-link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch (clientError) {
      return clientError instanceof Error ? clientError : new Error('Supabase is not configured.')
    }
  }, [])
  const configurationError = supabase instanceof Error ? supabase.message : null

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    if (supabase instanceof Error) {
      setLoading(false)
      setError(supabase.message)
      return
    }
    setLoading(true)

    const result =
      mode === 'magic-link'
        ? await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          })

    setLoading(false)
    if (result.error) {
      setError(result.error.message)
      return
    }

    if (mode === 'magic-link') {
      setStatus('Magic link sent. Check your email to continue.')
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  async function handleOAuth(provider: 'github' | 'google') {
    setError(null)
    setStatus(null)
    if (supabase instanceof Error) {
      setError(supabase.message)
      return
    }
    setLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    })
    setLoading(false)
    if (oauthError) setError(oauthError.message)
  }

  return (
    <div className="flex min-h-screen bg-[#111113] text-[#f4f4f5]">
      <div className="relative hidden min-h-screen flex-1 overflow-hidden bg-[#d7d7d2] lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,17,19,0.10)_0,transparent_35%),linear-gradient(rgba(17,17,19,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,19,0.08)_1px,transparent_1px)] bg-[size:auto,92px_92px,92px_92px]" />
        <div className="absolute top-1/2 left-1/2 h-36 w-[760px] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] rounded-[10px] border border-black/10 bg-white/35 shadow-2xl backdrop-blur-sm">
          <div className="absolute inset-x-8 top-8 h-3 rounded-full bg-gradient-to-r from-[#60a5fa] via-[#34d399] to-[#f97316]" />
          <div className="absolute inset-x-8 bottom-8 h-2 rounded-full bg-black/20" />
        </div>
      </div>

      <main className="flex min-h-screen w-full items-center justify-center px-6 lg:w-[460px]">
        <section className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#facc15]/14 text-[#fde68a]">
              <Zap className="h-6 w-6" />
            </div>
            <h1 className="font-semibold text-2xl text-white">Cell Editor</h1>
            <p className="mt-2 text-[#a1a1aa] text-sm">
              Sign in to manage simulation jobs and prediction results.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/12 bg-white/[0.05] p-1">
            {(['magic-link', 'password'] as const).map((item) => (
              <button
                className={cn(
                  'h-9 rounded-lg font-medium text-xs transition-colors',
                  mode === item
                    ? 'bg-white/14 text-white'
                    : 'text-[#a1a1aa] hover:bg-white/8 hover:text-white',
                )}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                {item === 'magic-link' ? 'Magic link' : 'Password'}
              </button>
            ))}
          </div>

          <form className="grid gap-3" onSubmit={handleEmailSubmit}>
            <label className="grid gap-1.5 text-[#a1a1aa] text-xs">
              Email
              <input
                autoComplete="email"
                className="h-11 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-white outline-none transition-colors placeholder:text-[#71717a] focus:border-[#818cf8]/70"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            {mode === 'password' ? (
              <label className="grid gap-1.5 text-[#a1a1aa] text-xs">
                Password
                <input
                  autoComplete="current-password"
                  className="h-11 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-white outline-none transition-colors focus:border-[#818cf8]/70"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            ) : null}

            <button
              className="mt-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#818cf8] font-semibold text-sm text-white transition-colors hover:bg-[#707bea] disabled:cursor-not-allowed disabled:bg-[#52599d] disabled:text-white/70"
              disabled={!!configurationError || loading || !email}
              type="submit"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {mode === 'magic-link' ? 'Send magic link' : 'Sign in'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[#a1a1aa] text-xs">
            <div className="h-px flex-1 bg-white/10" />
            OAuth
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] font-medium text-xs text-[#e4e4e7] transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:text-white/45"
              disabled={!!configurationError || loading}
              onClick={() => handleOAuth('github')}
              type="button"
            >
              <Code2 className="h-4 w-4" />
              GitHub
            </button>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] font-medium text-xs text-[#e4e4e7] transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:text-white/45"
              disabled={!!configurationError || loading}
              onClick={() => handleOAuth('google')}
              type="button"
            >
              Google
            </button>
          </div>

          {configurationError ? (
            <p className="mt-4 rounded-lg border border-[#facc15]/20 bg-[#facc15]/10 px-3 py-2 text-[#fde68a] text-xs">
              {configurationError}
            </p>
          ) : null}
          {status ? (
            <p className="mt-4 rounded-lg border border-[#86efac]/20 bg-[#86efac]/10 px-3 py-2 text-[#bbf7d0] text-xs">
              {status}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-lg border border-[#fca5a5]/20 bg-[#fca5a5]/10 px-3 py-2 text-[#fecaca] text-xs">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  )
}
