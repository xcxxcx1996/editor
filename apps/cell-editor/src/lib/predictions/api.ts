import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/src/lib/supabase/server'

export const predictionCreateSchema = z
  .object({
    cell_design: z.unknown().optional(),
    input: z.unknown().optional(),
    label: z.string().trim().max(120).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    scene: z.unknown().optional(),
    simulation_config: z.unknown().optional(),
    simulation_configs: z.unknown().optional(),
  })
  .passthrough()

export type PredictionCreateInput = z.infer<typeof predictionCreateSchema>

export type PredictionApiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
}

export async function requirePredictionUser(): Promise<
  | { ok: true; context: PredictionApiContext }
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

export function predictionApiBaseUrl() {
  return process.env.PREDICTIONS_API_BASE_URL?.replace(/\/+$/, '') || null
}

export function predictionProxyHeaders(user: User) {
  const headers = new Headers({
    'content-type': 'application/json',
    'x-pascal-user-id': user.id,
  })
  const token = process.env.PREDICTIONS_API_TOKEN
  if (token) headers.set('authorization', `Bearer ${token}`)
  return headers
}

export async function proxyPredictionRequest({
  body,
  method,
  path,
  searchParams,
  user,
}: {
  body?: unknown
  method: 'GET' | 'POST'
  path: string
  searchParams?: URLSearchParams
  user: User
}) {
  const baseUrl = predictionApiBaseUrl()
  if (!baseUrl) return null

  const url = new URL(`${baseUrl}${path}`)
  if (searchParams) {
    for (const [key, value] of searchParams) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: predictionProxyHeaders(user),
    method,
  })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { data: await response.text() }

  return NextResponse.json(payload, { status: response.status })
}

export function parseLimit(searchParams: URLSearchParams) {
  const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10)
  return Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 100)
}

export function parseOffset(searchParams: URLSearchParams) {
  const rawOffset = Number.parseInt(searchParams.get('offset') || '0', 10)
  return Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0)
}

type S3Reference = {
  bucket?: string
  key?: string
  url?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function extractS3Reference(value: unknown): S3Reference | null {
  if (typeof value === 'string') {
    const uri = value.trim()
    if (!uri) return null
    if (uri.startsWith('s3://') || uri.startsWith('http://') || uri.startsWith('https://')) {
      return { url: uri }
    }
    return { bucket: 'prediction-results', key: uri }
  }

  if (!isRecord(value)) return null

  const directCandidates = [
    value.s3,
    value.s3Result,
    value.s3_result,
    value.outputS3,
    value.output_s3,
    value.resultS3,
    value.result_s3,
  ]

  for (const candidate of directCandidates) {
    if (isRecord(candidate)) {
      const nested = extractS3Reference(candidate)
      if (nested) return nested
    }
  }

  const url =
    typeof value.s3_url === 'string'
      ? value.s3_url
      : typeof value.s3Url === 'string'
        ? value.s3Url
        : typeof value.url === 'string' && value.url.startsWith('s3://')
          ? value.url
          : typeof value.url === 'string' && value.url.includes('amazonaws.com')
            ? value.url
            : undefined

  const key =
    typeof value.s3_key === 'string'
      ? value.s3_key
      : typeof value.s3Key === 'string'
        ? value.s3Key
        : typeof value.key === 'string'
          ? value.key
          : undefined

  const bucket =
    typeof value.s3_bucket === 'string'
      ? value.s3_bucket
      : typeof value.s3Bucket === 'string'
        ? value.s3Bucket
        : typeof value.bucket === 'string'
          ? value.bucket
          : undefined

  if (url || key || bucket) return { bucket, key, url }

  for (const child of Object.values(value)) {
    const nested = extractS3Reference(child)
    if (nested) return nested
  }

  return null
}
