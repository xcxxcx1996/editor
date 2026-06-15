export type {
  DesignConstraint,
  DesignGoal,
  GoalDraft,
  WorkCondition,
} from './design-goal-schema'

export type ProjectRecord = {
  id: string
  user_id: string
  name: string
  cell_design: unknown
  created_at: string
  updated_at: string
}
