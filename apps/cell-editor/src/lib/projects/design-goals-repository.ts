import type { SupabaseClient } from '@supabase/supabase-js'
import {
  designGoalRowSchema,
  goalCreateSchema,
  goalPatchSchema,
  type DesignGoal,
  type GoalDraft,
} from './design-goal-schema'

export interface DesignGoalsRepository {
  list(projectId: string): Promise<DesignGoal[]>
  create(projectId: string, draft: GoalDraft): Promise<DesignGoal>
  update(projectId: string, goalId: string, patch: Partial<GoalDraft>): Promise<DesignGoal>
  delete(projectId: string, goalId: string): Promise<void>
}

function repositoryError(message: string) {
  return new Error(message)
}

function parseGoalRow(value: unknown): DesignGoal {
  const parsed = designGoalRowSchema.safeParse(value)
  if (!parsed.success) {
    throw repositoryError('Design goal response did not match the expected shape.')
  }
  return parsed.data
}

async function requireUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw repositoryError('Sign in before managing design goals.')
  }

  return user.id
}

export function createSupabaseGoalsRepository(supabase: SupabaseClient): DesignGoalsRepository {
  return {
    async list(projectId) {
      const { data, error } = await supabase
        .from('design_goal')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw repositoryError(error.message)

      return (data ?? []).map(parseGoalRow)
    },

    async create(projectId, draft) {
      const userId = await requireUserId(supabase)
      const parsed = goalCreateSchema.parse(draft)

      const { data, error } = await supabase
        .from('design_goal')
        .insert({
          constraints: parsed.constraints,
          label: parsed.label,
          project_id: projectId,
          sort_order: parsed.sort_order ?? 0,
          user_id: userId,
          work_condition: parsed.work_condition,
        })
        .select('*')
        .single()

      if (error) throw repositoryError(error.message)
      return parseGoalRow(data)
    },

    async update(projectId, goalId, patch) {
      await requireUserId(supabase)
      const parsed = goalPatchSchema.parse(patch)

      const { data, error } = await supabase
        .from('design_goal')
        .update(parsed)
        .eq('id', goalId)
        .eq('project_id', projectId)
        .select('*')
        .single()

      if (error) throw repositoryError(error.message)
      return parseGoalRow(data)
    },

    async delete(projectId, goalId) {
      await requireUserId(supabase)

      const { error } = await supabase
        .from('design_goal')
        .delete()
        .eq('id', goalId)
        .eq('project_id', projectId)

      if (error) throw repositoryError(error.message)
    },
  }
}
