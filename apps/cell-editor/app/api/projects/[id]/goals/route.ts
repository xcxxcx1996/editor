import { NextResponse, type NextRequest } from 'next/server'
import {
  goalCreateSchema,
  projectBelongsToUser,
  requireAuthUser,
  uuidSchema,
} from '@/src/lib/projects/api'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return NextResponse.json({ error: 'invalid_project_id' }, { status: 400 })

  const ownsProject = await projectBelongsToUser(auth.context, parsedId.data)
  if (!ownsProject) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const { data, error } = await auth.context.supabase
    .from('design_goal')
    .select('*')
    .eq('project_id', parsedId.data)
    .eq('user_id', auth.context.user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return NextResponse.json({ error: 'invalid_project_id' }, { status: 400 })

  const ownsProject = await projectBelongsToUser(auth.context, parsedId.data)
  if (!ownsProject) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = goalCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_goal_payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { data, error } = await auth.context.supabase
    .from('design_goal')
    .insert({
      constraints: parsed.data.constraints,
      label: parsed.data.label,
      project_id: parsedId.data,
      sort_order: parsed.data.sort_order ?? 0,
      user_id: auth.context.user.id,
      work_condition: parsed.data.work_condition,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
