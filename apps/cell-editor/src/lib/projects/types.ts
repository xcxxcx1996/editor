export type WorkCondition = {
  temperature_c?: number
  soc_pct?: number
  rate?: string
  mode?: 'charge' | 'discharge'
  cutoff_voltage_v?: number
  protocol?: string
}

export type DesignConstraint = {
  metric: string
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
  value: number
  unit?: string
  baseline?: string
}

export type ProjectRecord = {
  id: string
  user_id: string
  name: string
  cell_design: unknown
  created_at: string
  updated_at: string
}

export type DesignGoal = {
  id: string
  project_id: string
  user_id: string
  label: string
  work_condition: WorkCondition
  constraints: DesignConstraint
  sort_order: number
  created_at: string
  updated_at: string
}

export type GoalDraft = {
  label: string
  work_condition: WorkCondition
  constraints: DesignConstraint
  sort_order?: number
}
