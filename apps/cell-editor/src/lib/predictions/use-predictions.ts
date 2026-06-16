'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'

export type PredictionRecord = {
  id: string
  name?: string | null
  label?: string | null
  simulation_config?: unknown
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  finished_at?: string | null
}

export type PredictionStorageReference = {
  bucket?: string
  key?: string
  url?: string
}

export type PredictionResultRecord = {
  id: string
  cell_design?: unknown
  simulation_config?: unknown
  status?: string | null
  result_uri?: string | null
  error_message?: string | null
  finished_at?: string | null
  updated_at?: string | null
}

export type PredictionTimeSeriesMetric = {
  id: string
  label: string
  unit: string
  kind: 'time-series'
  data: Array<{ t: number; value: number }>
}

export type PredictionFieldMetric = {
  id: string
  label: string
  unit: string
  kind: 'field'
  range: [number, number]
  frames: Array<{
    t: number
    width: number
    height: number
    values: number[][]
  }>
}

export type PredictionSimulationResult = {
  id: string
  label: string
  condition: string
  duration: number
  metrics: Array<PredictionTimeSeriesMetric | PredictionFieldMetric>
}

export type SimulationTaskType = 'single_point' | 'spatial_search'

export type SimulationConstraintScore = {
  metric: string
  operator: string
  target: number
  actual: number
  satisfied: boolean
}

export type SimulationScheme = {
  id: string
  label: string
  rank?: number
  parameters?: Record<string, number>
  cell_design: unknown
  condition?: string
  metrics: Array<PredictionTimeSeriesMetric | PredictionFieldMetric>
  goals_met?: boolean
  constraint_scores?: SimulationConstraintScore[]
}

export type SimulationResultPayload = {
  version?: 1
  task_type: SimulationTaskType
  duration?: number
  schemes: SimulationScheme[]
}

export type PredictionResultResponse = {
  data?: PredictionResultRecord
  error?: string
  resultError?: string | null
  simulationResult?: SimulationResultPayload | null
  storage?: PredictionStorageReference | null
}

export type PredictionCreateInput = {
  cell_design?: unknown
  input?: unknown
  label?: string | null
  name?: string | null
  project_id?: string | null
  scene?: unknown
  simulation_config?: unknown
  simulation_configs?: unknown
}

type UsePredictionsOptions = {
  limit?: number
  pollIntervalMs?: number
  projectId?: string
  status?: string
}

const INCOMPLETE_STATUSES = new Set(['pending', 'queued', 'running'])
const predictionResultCache = new Map<string, PredictionResultResponse>()
const predictionResultRequests = new Map<string, Promise<PredictionResultResponse>>()

function isIncompletePrediction(status: string | null | undefined) {
  return INCOMPLETE_STATUSES.has(status ?? 'pending')
}

function storageReferenceFromResultUri(
  value: string | null | undefined,
): PredictionStorageReference | null {
  const uri = value?.trim()
  if (!uri) return null
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return { url: uri }
  }
  return { bucket: 'prediction-results', key: uri }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseTaskType(value: unknown): SimulationTaskType {
  return value === 'spatial_search' ? 'spatial_search' : 'single_point'
}

function normalizeScheme(value: unknown, index: number): SimulationScheme {
  if (!isRecord(value)) throw new Error(`Scheme ${index + 1} is not an object.`)
  if (!Array.isArray(value.metrics)) throw new Error(`Scheme ${index + 1} is missing metrics.`)

  return {
    cell_design: value.cell_design,
    condition: typeof value.condition === 'string' ? value.condition : undefined,
    constraint_scores: Array.isArray(value.constraint_scores)
      ? (value.constraint_scores as SimulationConstraintScore[])
      : undefined,
    goals_met: typeof value.goals_met === 'boolean' ? value.goals_met : undefined,
    id: typeof value.id === 'string' && value.id ? value.id : `scheme-${index + 1}`,
    label: typeof value.label === 'string' && value.label ? value.label : `Scheme ${index + 1}`,
    metrics: value.metrics as Array<PredictionTimeSeriesMetric | PredictionFieldMetric>,
    parameters: isRecord(value.parameters)
      ? Object.fromEntries(
          Object.entries(value.parameters).filter(
            (entry): entry is [string, number] =>
              typeof entry[1] === 'number' && Number.isFinite(entry[1]),
          ),
        )
      : undefined,
    rank: typeof value.rank === 'number' && Number.isFinite(value.rank) ? value.rank : undefined,
  }
}

export function parseSimulationResult(
  value: unknown,
  fallbackCellDesign?: unknown,
): SimulationResultPayload {
  if (!isRecord(value)) throw new Error('Result JSON is not an object.')

  if (Array.isArray(value.schemes)) {
    const taskType = parseTaskType(value.task_type)
    const schemes = value.schemes.map(normalizeScheme)
    if (taskType === 'spatial_search' && schemes.length === 0) {
      throw new Error('Spatial search result JSON has no schemes.')
    }

    return {
      duration: typeof value.duration === 'number' ? value.duration : undefined,
      schemes,
      task_type: taskType,
      version: value.version === 1 ? 1 : undefined,
    }
  }

  if (!Array.isArray(value.metrics)) throw new Error('Result JSON is missing metrics.')

  return {
    duration: typeof value.duration === 'number' ? value.duration : undefined,
    schemes: [
      {
        cell_design: value.cell_design ?? fallbackCellDesign,
        condition: typeof value.condition === 'string' ? value.condition : undefined,
        id: typeof value.id === 'string' && value.id ? value.id : 'single-point',
        label: typeof value.label === 'string' && value.label ? value.label : 'Single point',
        metrics: value.metrics as Array<PredictionTimeSeriesMetric | PredictionFieldMetric>,
      },
    ],
    task_type: 'single_point',
  }
}

export function getSchemesFromResult(
  result: SimulationResultPayload | null | undefined,
): SimulationScheme[] {
  return result?.schemes ?? []
}

export function getDefaultSimulationScheme(
  result: SimulationResultPayload | null | undefined,
): SimulationScheme | null {
  const schemes = getSchemesFromResult(result)
  if (schemes.length === 0) return null
  return schemes.reduce((best, scheme) => {
    if (best.rank === undefined) return scheme.rank === undefined ? best : scheme
    if (scheme.rank === undefined) return best
    return scheme.rank < best.rank ? scheme : best
  }, schemes[0]!)
}

async function loadSimulationResult(
  supabase: ReturnType<typeof createClient>,
  storage: PredictionStorageReference | null,
  fallbackCellDesign?: unknown,
) {
  if (!storage) return null

  if (storage.bucket && storage.key) {
    const { data, error } = await supabase.storage.from(storage.bucket).download(storage.key)
    if (error) throw error
    return parseSimulationResult(JSON.parse(await data.text()), fallbackCellDesign)
  }

  if (storage.url?.startsWith('http://') || storage.url?.startsWith('https://')) {
    const response = await fetch(storage.url, { cache: 'no-store' })
    if (!response.ok) throw new Error('Could not load prediction result JSON.')
    return parseSimulationResult(await response.json(), fallbackCellDesign)
  }

  return null
}

function isCompleteResultResponse(result: PredictionResultResponse) {
  return !isIncompletePrediction(result.data?.status)
}

function loadPredictionResult(
  supabase: ReturnType<typeof createClient>,
  predictionId: string,
): Promise<PredictionResultResponse> {
  const cached = predictionResultCache.get(predictionId)
  if (cached && isCompleteResultResponse(cached)) return Promise.resolve(cached)

  const pending = predictionResultRequests.get(predictionId)
  if (pending) return pending

  const request = (async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Sign in before loading prediction results.')
    }

    const { data, error: queryError } = await supabase
      .from('prediction_job')
      .select(
        'id, cell_design, simulation_config, status, result_uri, error_message, finished_at, updated_at',
      )
      .eq('id', predictionId)
      .single()

    if (queryError) throw queryError

    const record = data as PredictionResultRecord
    const storage = storageReferenceFromResultUri(record.result_uri)
    let simulationResult: SimulationResultPayload | null = null
    let resultError: string | null = null
    try {
      simulationResult = await loadSimulationResult(supabase, storage, record.cell_design)
    } catch (downloadError) {
      resultError =
        downloadError instanceof Error ? downloadError.message : 'Could not load result JSON.'
    }

    const result = {
      data: record,
      resultError,
      simulationResult,
      storage,
    } satisfies PredictionResultResponse

    if (isCompleteResultResponse(result)) {
      predictionResultCache.set(predictionId, result)
    }

    return result
  })()

  predictionResultRequests.set(predictionId, request)
  request.then(
    () => predictionResultRequests.delete(predictionId),
    () => predictionResultRequests.delete(predictionId),
  )

  return request
}

export function usePredictions({
  limit = 50,
  pollIntervalMs = 3000,
  projectId,
  status,
}: UsePredictionsOptions = {}) {
  const supabase = useMemo(() => createClient(), [])
  const [predictions, setPredictions] = useState<PredictionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Sign in before loading prediction tasks.')
      }

      let query = supabase
        .from('prediction_job')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (status) query = query.eq('status', status)
      if (projectId) query = query.eq('project_id', projectId)

      const { data, error: queryError } = await query
      if (queryError) throw queryError
      setPredictions((data ?? []) as PredictionRecord[])
    } catch (loadError) {
      setPredictions([])
      setError(loadError instanceof Error ? loadError.message : 'Could not load predictions.')
    } finally {
      setLoading(false)
    }
  }, [limit, projectId, status, supabase])

  const createPrediction = useCallback(
    async (input: PredictionCreateInput) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Sign in before creating prediction tasks.')
      }

      const cellDesign = input.cell_design ?? input.input ?? input.scene
      if (cellDesign === undefined) throw new Error('Prediction task requires cell_design.')

      const { data, error: insertError } = await supabase
        .from('prediction_job')
        .insert({
          cell_design: cellDesign,
          label: input.label ?? null,
          name: input.name ?? input.label ?? 'Cell prediction',
          project_id: input.project_id ?? projectId ?? null,
          simulation_config: input.simulation_config ?? input.simulation_configs ?? {},
          status: 'pending',
          user_id: user.id,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      await reload()
      return data as PredictionRecord
    },
    [projectId, reload, supabase],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!predictions.some((prediction) => isIncompletePrediction(prediction.status))) return

    const timer = window.setInterval(() => {
      void reload()
    }, pollIntervalMs)

    return () => window.clearInterval(timer)
  }, [pollIntervalMs, predictions, reload])

  return { createPrediction, error, loading, predictions, reload }
}

export function usePredictionResult(predictionId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [result, setResult] = useState<PredictionResultResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!predictionId) {
      setResult(null)
      setError(null)
      setLoading(false)
      return
    }

    const cached = predictionResultCache.get(predictionId)
    if (cached && isCompleteResultResponse(cached)) {
      setResult(cached)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      setResult(await loadPredictionResult(supabase, predictionId))
    } catch (loadError) {
      setResult(null)
      setError(loadError instanceof Error ? loadError.message : 'Could not load result.')
    } finally {
      setLoading(false)
    }
  }, [predictionId, supabase])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!predictionId) return
    if (result?.simulationResult && !isIncompletePrediction(result.data?.status)) return

    const timer = window.setInterval(() => {
      void reload()
    }, 3000)

    return () => window.clearInterval(timer)
  }, [predictionId, reload, result])

  return { error, loading, reload, result }
}
