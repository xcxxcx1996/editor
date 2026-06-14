import { NextResponse, type NextRequest } from 'next/server'
import { createDefaultCellScene } from '@/src/lib/defaults'
import { projectCreateSchema, requireAuthUser } from '@/src/lib/projects/api'

function parseLimit(searchParams: URLSearchParams) {
  const raw = Number.parseInt(searchParams.get('limit') || '50', 10)
  return Math.min(Math.max(Number.isFinite(raw) ? raw : 50, 1), 100)
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const limit = parseLimit(request.nextUrl.searchParams)
  const { data, error } = await auth.context.supabase
    .from('projects')
    .select('id, user_id, name, created_at, updated_at')
    .eq('user_id', auth.context.user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json(
      { code: error.code, details: error.details, error: error.message, hint: error.hint },
      { status: 500 },
    )
  }
  return NextResponse.json({ data, limit })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => undefined)
  const parsed = projectCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_project_payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { data, error } = await auth.context.supabase
    .from('projects')
    .insert({
      cell_design: createDefaultCellScene(),
      name: parsed.data?.name ?? 'Untitled project',
      user_id: auth.context.user.id,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(
      { code: error.code, details: error.details, error: error.message, hint: error.hint },
      { status: 500 },
    )
  }
  return NextResponse.json({ data }, { status: 201 })
}
