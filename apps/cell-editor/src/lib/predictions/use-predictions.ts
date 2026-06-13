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

export type PredictionResultResponse = {
  data?: PredictionResultRecord
  error?: string
  resultError?: string | null
  simulationResult?: PredictionSimulationResult | null
  storage?: PredictionStorageReference | null
}

export type PredictionCreateInput = {
  cell_design?: unknown
  input?: unknown
  label?: string | null
  name?: string | null
  scene?: unknown
  simulation_config?: unknown
  simulation_configs?: unknown
}

type UsePredictionsOptions = {
  limit?: number
  pollIntervalMs?: number
  status?: string
}

const INCOMPLETE_STATUSES = new Set(['pending', 'queued', 'running'])

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

function parseSimulationResult(value: unknown): PredictionSimulationResult {
  if (!isRecord(value)) throw new Error('Result JSON is not an object.')
  if (!Array.isArray(value.metrics)) throw new Error('Result JSON is missing metrics.')

  return value as PredictionSimulationResult
}

async function loadSimulationResult(
  supabase: ReturnType<typeof createClient>,
  storage: PredictionStorageReference | null,
) {
  if (!storage) return null

  if (storage.bucket && storage.key) {
    const { data, error } = await supabase.storage.from(storage.bucket).download(storage.key)
    if (error) throw error
    return parseSimulationResult(JSON.parse(await data.text()))
  }

  if (storage.url?.startsWith('http://') || storage.url?.startsWith('https://')) {
    const response = await fetch(storage.url, { cache: 'no-store' })
    if (!response.ok) throw new Error('Could not load prediction result JSON.')
    return parseSimulationResult(await response.json())
  }

  return null
}

export function usePredictions({
  limit = 50,
  pollIntervalMs = 3000,
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

      const { data, error: queryError } = await query
      if (queryError) throw queryError
      setPredictions((data ?? []) as PredictionRecord[])
    } catch (loadError) {
      setPredictions([])
      setError(loadError instanceof Error ? loadError.message : 'Could not load predictions.')
    } finally {
      setLoading(false)
    }
  }, [limit, status, supabase])

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
    [reload, supabase],
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

    setLoading(true)
    setError(null)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Sign in before loading prediction results.')
      }

      const { data, error: queryError } = await supabase
        .from('prediction_job')
        .select('id, cell_design, status, result_uri, error_message, finished_at, updated_at')
        .eq('id', predictionId)
        .single()

      if (queryError) throw queryError

      const record = data as PredictionResultRecord
      const storage = storageReferenceFromResultUri(record.result_uri)
      let simulationResult: PredictionSimulationResult | null = null
      let resultError: string | null = null
      try {
        simulationResult = await loadSimulationResult(supabase, storage)
      } catch (downloadError) {
        resultError =
          downloadError instanceof Error ? downloadError.message : 'Could not load result JSON.'
      }

      setResult({
        data: record,
        resultError,
        simulationResult,
        storage,
      })
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
