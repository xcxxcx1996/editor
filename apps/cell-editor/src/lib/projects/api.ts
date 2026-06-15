import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/src/lib/supabase/server'

export {
  designConstraintSchema,
  goalCreateSchema,
  goalPatchSchema,
  parseNaturalLanguageSchema,
  workConditionSchema,
} from './design-goal-schema'

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
