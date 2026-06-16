import { NextResponse, type NextRequest } from 'next/server'
import { projectPatchSchema, requireAuthUser, uuidSchema } from '@/src/lib/projects/api'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return NextResponse.json({ error: 'invalid_project_id' }, { status: 400 })

  const { data, error } = await auth.context.supabase
    .from('projects')
    .select('*')
    .eq('id', parsedId.data)
    .eq('user_id', auth.context.user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return NextResponse.json({ error: 'invalid_project_id' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = projectPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_project_payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const patch: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.cell_design !== undefined) patch.cell_design = parsed.data.cell_design
  if (parsed.data.simulation_search_ranges !== undefined) {
    patch.simulation_search_ranges = parsed.data.simulation_search_ranges
  }

  const { data, error } = await auth.context.supabase
    .from('projects')
    .update(patch)
    .eq('id', parsedId.data)
    .eq('user_id', auth.context.user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return NextResponse.json({ error: 'invalid_project_id' }, { status: 400 })

  const { error } = await auth.context.supabase
    .from('projects')
    .delete()
    .eq('id', parsedId.data)
    .eq('user_id', auth.context.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
