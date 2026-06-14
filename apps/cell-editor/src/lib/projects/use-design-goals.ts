'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DesignGoal, GoalDraft } from './types'

type UseDesignGoalsState = {
  error: string | null
  goals: DesignGoal[]
  loading: boolean
}

async function readJson(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) {
    throw new Error(payload?.error || 'Design goals request failed.')
  }
  return payload
}

export function useDesignGoals(projectId: string) {
  const [state, setState] = useState<UseDesignGoalsState>({
    error: null,
    goals: [],
    loading: true,
  })

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, error: null, loading: true }))
    try {
      const payload = (await readJson(
        await fetch(`/api/projects/${projectId}/goals`, { cache: 'no-store' }),
      )) as { data?: DesignGoal[] }
      setState({ error: null, goals: payload.data ?? [], loading: false })
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : 'Could not load design goals.',
        goals: [],
        loading: false,
      })
    }
  }, [projectId])

  const createGoal = useCallback(
    async (draft: GoalDraft) => {
      const payload = (await readJson(
        await fetch(`/api/projects/${projectId}/goals`, {
          body: JSON.stringify(draft),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
      )) as { data?: DesignGoal }
      await reload()
      return payload.data
    },
    [projectId, reload],
  )

  const updateGoal = useCallback(
    async (goalId: string, patch: Partial<GoalDraft>) => {
      const payload = (await readJson(
        await fetch(`/api/projects/${projectId}/goals/${goalId}`, {
          body: JSON.stringify(patch),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        }),
      )) as { data?: DesignGoal }
      await reload()
      return payload.data
    },
    [projectId, reload],
  )

  const deleteGoal = useCallback(
    async (goalId: string) => {
      await readJson(
        await fetch(`/api/projects/${projectId}/goals/${goalId}`, {
          method: 'DELETE',
        }),
      )
      await reload()
    },
    [projectId, reload],
  )

  const parseNaturalLanguage = useCallback(
    async (text: string) => {
      return readJson(
        await fetch(`/api/projects/${projectId}/goals/parse-natural-language`, {
          body: JSON.stringify({ text }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
      ) as Promise<{ goals?: GoalDraft[]; error?: string }>
    },
    [projectId],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    ...state,
    createGoal,
    deleteGoal,
    parseNaturalLanguage,
    reload,
    updateGoal,
  }
}
