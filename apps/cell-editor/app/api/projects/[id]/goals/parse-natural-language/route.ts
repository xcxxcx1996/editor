import { NextResponse, type NextRequest } from 'next/server'
import {
  parseNaturalLanguageSchema,
  projectBelongsToUser,
  requireAuthUser,
  uuidSchema,
} from '@/src/lib/projects/api'

type RouteContext = {
  params: Promise<{ id: string }>
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
  const parsed = parseNaturalLanguageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_parse_payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const upstreamUrl = process.env.GOALS_NLP_API_URL
  if (!upstreamUrl) {
    return NextResponse.json(
      {
        error: 'goals_nlp_not_configured',
        goals: [],
        message: 'GOALS_NLP_API_URL is not configured.',
      },
      { status: 501 },
    )
  }

  return NextResponse.json(
    {
      error: 'goals_nlp_not_implemented',
      goals: [],
      message: 'GOALS_NLP_API_URL is reserved for a future parser integration.',
    },
    { status: 501 },
  )
}
