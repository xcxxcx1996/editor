import { NextResponse, type NextRequest } from 'next/server'
import { proxyPredictionRequest, requirePredictionUser } from '@/src/lib/predictions/api'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requirePredictionUser()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const proxied = await proxyPredictionRequest({
    method: 'GET',
    path: `/predictions/${encodeURIComponent(id)}`,
    searchParams: request.nextUrl.searchParams,
    user: auth.context.user,
  })
  if (proxied) return proxied

  const { data, error } = await auth.context.supabase
    .from('prediction_job')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}
