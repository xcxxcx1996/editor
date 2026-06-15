import { z } from 'zod'

export const designConstraintMetrics = [
  'capacity',
  'capacity_retention_pct',
  'dcir',
  'energy',
  'energy_density',
  'median_voltage',
] as const

export const workConditionSchema = z
  .object({
    cutoff_voltage_v: z.number().finite().optional(),
    mode: z.enum(['charge', 'discharge']).optional(),
    protocol: z.string().trim().min(1).max(80).optional(),
    rate: z.string().trim().min(1).max(40).optional(),
    soc_pct: z.number().finite().optional(),
    temperature_c: z.number().finite().optional(),
  })
  .strict()

export const designConstraintSchema = z
  .object({
    baseline: z.string().trim().min(1).max(120).optional(),
    metric: z.enum(designConstraintMetrics),
    operator: z.enum(['lt', 'lte', 'gt', 'gte', 'eq']),
    unit: z.string().trim().min(1).max(40).optional(),
    value: z.number().finite(),
  })
  .strict()

export const goalCreateSchema = z.object({
  constraints: designConstraintSchema,
  label: z.string().trim().min(1).max(200),
  sort_order: z.number().int().optional(),
  work_condition: workConditionSchema.default({}),
})

export const goalPatchSchema = z
  .object({
    constraints: designConstraintSchema.optional(),
    label: z.string().trim().min(1).max(200).optional(),
    sort_order: z.number().int().optional(),
    work_condition: workConditionSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.constraints !== undefined ||
      value.label !== undefined ||
      value.sort_order !== undefined ||
      value.work_condition !== undefined,
    { message: 'At least one goal field is required.' },
  )

export const designGoalRowSchema = goalCreateSchema.extend({
  created_at: z.string(),
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  sort_order: z.number().int(),
  updated_at: z.string(),
  user_id: z.string().uuid(),
})

export const parseNaturalLanguageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
})

export type WorkCondition = z.infer<typeof workConditionSchema>
export type DesignConstraint = z.infer<typeof designConstraintSchema>
export type GoalDraft = z.infer<typeof goalCreateSchema>
export type DesignGoal = z.infer<typeof designGoalRowSchema>

export type GoalFormInput = {
  baseline: string
  cutoff_voltage_v: string
  label: string
  metric: string
  mode: 'charge' | 'discharge'
  operator: DesignConstraint['operator']
  protocol: string
  rate: string
  soc_pct: string
  temperature_c: string
  unit: string
  value: string
}

function numberOrUndefined(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseMetric(value: string): DesignConstraint['metric'] {
  const normalized = value.trim().toLowerCase()
  const match = designConstraintMetrics.find((metric) => metric === normalized)
  if (!match) {
    throw new Error(`Unknown metric "${value.trim()}".`)
  }
  return match
}

export function draftFromForm(form: GoalFormInput): GoalDraft {
  return goalCreateSchema.parse({
    constraints: {
      baseline: form.baseline.trim() || undefined,
      metric: parseMetric(form.metric),
      operator: form.operator,
      unit: form.unit.trim() || undefined,
      value: numberOrUndefined(form.value) ?? 0,
    },
    label: form.label.trim(),
    work_condition: {
      cutoff_voltage_v: numberOrUndefined(form.cutoff_voltage_v),
      mode: form.mode,
      protocol: form.protocol.trim() || undefined,
      rate: form.rate.trim() || undefined,
      soc_pct: numberOrUndefined(form.soc_pct),
      temperature_c: numberOrUndefined(form.temperature_c),
    },
  })
}
