import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/src/lib/supabase/server'

export type AuthApiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
}

export async function requireAuthUser(): Promise<
  | { ok: true; context: AuthApiContext }
  | { ok: false; response: NextResponse<{ error: string }> }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }

  return { context: { supabase, user }, ok: true }
}

export const projectCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
  })
  .optional()

export const projectPatchSchema = z
  .object({
    cell_design: z.unknown().optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => value.cell_design !== undefined || value.name !== undefined, {
    message: 'At least one project field is required.',
  })

export const uuidSchema = z.string().uuid()

export const workConditionSchema = z
  .object({
    cutoff_voltage_v: z.number().finite().optional(),
    mode: z.enum(['charge', 'discharge']).optional(),
    protocol: z.string().trim().min(1).max(80).optional(),
    rate: z.string().trim().min(1).max(40).optional(),
    soc_pct: z.number().finite().optional(),
    temperature_c: z.number().finite().optional(),
  })
  .passthrough()

export const designConstraintSchema = z
  .object({
    baseline: z.string().trim().min(1).max(120).optional(),
    metric: z.string().trim().min(1).max(120),
    operator: z.enum(['lt', 'lte', 'gt', 'gte', 'eq']),
    unit: z.string().trim().min(1).max(40).optional(),
    value: z.number().finite(),
  })
  .passthrough()

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
  .refine(
    (value) =>
      value.constraints !== undefined ||
      value.label !== undefined ||
      value.sort_order !== undefined ||
      value.work_condition !== undefined,
    { message: 'At least one goal field is required.' },
  )

export const parseNaturalLanguageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
})

export async function projectBelongsToUser(context: AuthApiContext, projectId: string) {
  const { data, error } = await context.supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', context.user.id)
    .maybeSingle()

  if (error) throw error
  return !!data
}
