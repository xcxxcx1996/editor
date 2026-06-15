'use client'

import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { createSupabaseGoalsRepository } from './design-goals-repository'
import { designGoalsReducer, initialDesignGoalsState } from './design-goals-state'
import type { GoalDraft } from './types'

async function readJson(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) {
    throw new Error(payload?.error || 'Design goals request failed.')
  }
  return payload
}

export function useDesignGoals(projectId: string) {
  const repository = useMemo(() => createSupabaseGoalsRepository(createClient()), [])
  const [state, dispatch] = useReducer(designGoalsReducer, initialDesignGoalsState)

  const reload = useCallback(async () => {
    dispatch({ type: 'load_start' })
    try {
      const goals = await repository.list(projectId)
      dispatch({ type: 'load_success', goals })
    } catch (error) {
      dispatch({
        type: 'load_error',
        error: error instanceof Error ? error.message : 'Could not load design goals.',
      })
    }
  }, [projectId, repository])

  const createGoal = useCallback(
    async (draft: GoalDraft) => {
      const goal = await repository.create(projectId, draft)
      dispatch({ type: 'merge_created', goal })
      return goal
    },
    [projectId, repository],
  )

  const createGoals = useCallback(
    async (drafts: GoalDraft[]) => {
      if (drafts.length === 0) return []

      const created = await Promise.all(drafts.map((draft) => repository.create(projectId, draft)))
      dispatch({ type: 'merge_created_many', goals: created })
      return created
    },
    [projectId, repository],
  )

  const updateGoal = useCallback(
    async (goalId: string, patch: Partial<GoalDraft>) => {
      const goal = await repository.update(projectId, goalId, patch)
      dispatch({ type: 'merge_updated', goal })
      return goal
    },
    [projectId, repository],
  )

  const deleteGoal = useCallback(
    async (goalId: string) => {
      await repository.delete(projectId, goalId)
      dispatch({ type: 'merge_deleted', goalId })
    },
    [projectId, repository],
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
    createGoals,
    deleteGoal,
    parseNaturalLanguage,
    reload,
    updateGoal,
  }
}
