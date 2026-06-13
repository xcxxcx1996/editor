import { NextResponse, type NextRequest } from 'next/server'
import {
  parseLimit,
  parseOffset,
  predictionCreateSchema,
  proxyPredictionRequest,
  requirePredictionUser,
} from '@/src/lib/predictions/api'

export async function GET(request: NextRequest) {
  const auth = await requirePredictionUser()
  if (!auth.ok) return auth.response

  const proxied = await proxyPredictionRequest({
    method: 'GET',
    path: '/predictions',
    searchParams: request.nextUrl.searchParams,
    user: auth.context.user,
  })
  if (proxied) return proxied

  const limit = parseLimit(request.nextUrl.searchParams)
  const offset = parseOffset(request.nextUrl.searchParams)
  const status = request.nextUrl.searchParams.get('status')

  let query = auth.context.supabase
    .from('prediction_job')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { count, data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count, data, limit, offset })
}

export async function POST(request: NextRequest) {
  const auth = await requirePredictionUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = predictionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_prediction_payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const proxied = await proxyPredictionRequest({
    body: { ...parsed.data, userId: auth.context.user.id },
    method: 'POST',
    path: '/predictions',
    user: auth.context.user,
  })
  if (proxied) return proxied

  const cellDesign = parsed.data.cell_design ?? parsed.data.input ?? parsed.data.scene
  if (cellDesign === undefined) {
    return NextResponse.json({ error: 'missing_cell_design' }, { status: 400 })
  }

  const { data, error } = await auth.context.supabase
    .from('prediction_job')
    .insert({
      cell_design: cellDesign,
      label: parsed.data.label ?? null,
      name: parsed.data.name ?? parsed.data.label ?? 'Cell prediction',
      simulation_config: parsed.data.simulation_config ?? parsed.data.simulation_configs ?? {},
      status: 'pending',
      user_id: auth.context.user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
