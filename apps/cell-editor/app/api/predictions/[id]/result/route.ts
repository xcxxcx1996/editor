import { NextResponse, type NextRequest } from 'next/server'
import {
  extractS3Reference,
  proxyPredictionRequest,
  requirePredictionUser,
} from '@/src/lib/predictions/api'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requirePredictionUser()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const proxied = await proxyPredictionRequest({
    method: 'GET',
    path: `/predictions/${encodeURIComponent(id)}/result`,
    searchParams: request.nextUrl.searchParams,
    user: auth.context.user,
  })
  if (proxied) return proxied

  const { data, error } = await auth.context.supabase
    .from('prediction_job')
    .select('id, status, result_uri, error_message, finished_at, updated_at')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data, s3: extractS3Reference(data?.result_uri) })
}
