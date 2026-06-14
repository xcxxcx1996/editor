import { NextResponse, type NextRequest } from 'next/server'
import {
  goalPatchSchema,
  projectBelongsToUser,
  requireAuthUser,
  uuidSchema,
} from '@/src/lib/projects/api'

type RouteContext = {
  params: Promise<{ goalId: string; id: string }>
}

async function validateProjectAndGoal(context: RouteContext) {
  const { goalId, id } = await context.params
  const parsedProjectId = uuidSchema.safeParse(id)
  const parsedGoalId = uuidSchema.safeParse(goalId)
  if (!parsedProjectId.success || !parsedGoalId.success) return null
  return { goalId: parsedGoalId.data, projectId: parsedProjectId.data }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const ids = await validateProjectAndGoal(context)
  if (!ids) return NextResponse.json({ error: 'invalid_goal_id' }, { status: 400 })

  const ownsProject = await projectBelongsToUser(auth.context, ids.projectId)
  if (!ownsProject) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = goalPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_goal_payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { data, error } = await auth.context.supabase
    .from('design_goal')
    .update(parsed.data)
    .eq('id', ids.goalId)
    .eq('project_id', ids.projectId)
    .eq('user_id', auth.context.user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const ids = await validateProjectAndGoal(context)
  if (!ids) return NextResponse.json({ error: 'invalid_goal_id' }, { status: 400 })

  const ownsProject = await projectBelongsToUser(auth.context, ids.projectId)
  if (!ownsProject) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const { error } = await auth.context.supabase
    .from('design_goal')
    .delete()
    .eq('id', ids.goalId)
    .eq('project_id', ids.projectId)
    .eq('user_id', auth.context.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
