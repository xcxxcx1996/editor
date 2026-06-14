'use client'

import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CreateProjectButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createProject() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/projects', {
        body: JSON.stringify({ name: 'Untitled project' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const payload = (await response.json().catch(() => null)) as
        | { code?: string; data?: { id?: string }; details?: string; error?: string; hint?: string }
        | null
      if (!response.ok || !payload?.data?.id) {
        throw new Error(
          [payload?.error, payload?.details, payload?.hint, payload?.code]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Could not create project.',
        )
      }
      router.push(`/project/${payload.data.id}`)
      router.refresh()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create project.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        className="flex h-10 items-center gap-2 rounded-lg bg-[#facc15] px-4 font-semibold text-[#1c1917] text-sm shadow-[0_14px_40px_rgba(250,204,21,0.22)] transition-colors hover:bg-[#fde047] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
        onClick={createProject}
        type="button"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        New project
      </button>
      {error ? <p className="text-[#fecaca] text-xs">{error}</p> : null}
    </div>
  )
}
