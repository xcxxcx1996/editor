import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CELL_DESIGN_FIELD_MAPPINGS } from '@/src/lib/cell-graph/field-map'

export type SimulationSearchRange = {
  designKey: string
  nodeKind: string
  sceneKey: string
  min: number
  max: number
  enabled: boolean
}

export type SimulationTaskType = 'single_point' | 'spatial_search'

const INTEGER_SEARCH_DESIGN_KEYS = new Set(['number_of_layers'])

export function isIntegerSearchField(designKey: string): boolean {
  return INTEGER_SEARCH_DESIGN_KEYS.has(designKey)
}

export function quantizeSearchRangeValue(value: number, designKey: string): number {
  return isIntegerSearchField(designKey) ? Math.round(value) : value
}

export function normalizeSearchRangeBounds(range: SimulationSearchRange): SimulationSearchRange {
  if (!isIntegerSearchField(range.designKey)) return range
  const min = Math.round(range.min)
  const max = Math.round(range.max)
  return { ...range, min: Math.min(min, max), max: Math.max(min, max) }
}

export function formatSearchRangeBounds(range: SimulationSearchRange): string {
  const normalized = normalizeSearchRangeBounds(range)
  const formatValue = (value: number) =>
    isIntegerSearchField(range.designKey)
      ? String(Math.round(value))
      : String(Number.parseFloat(value.toFixed(4)))
  return `${formatValue(normalized.min)} – ${formatValue(normalized.max)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function designKeyForSceneField(nodeKind: string, sceneKey: string): string {
  return (
    CELL_DESIGN_FIELD_MAPPINGS.find(
      (mapping) => mapping.nodeKind === nodeKind && mapping.sceneKey === sceneKey,
    )?.designKey ?? sceneKey
  )
}

export function normalizeSimulationSearchRanges(value: unknown): SimulationSearchRange[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const nodeKind = typeof item.nodeKind === 'string' ? item.nodeKind : ''
    const sceneKey = typeof item.sceneKey === 'string' ? item.sceneKey : ''
    const min = finiteNumber(item.min)
    const max = finiteNumber(item.max)
    if (!nodeKind || !sceneKey || min === null || max === null) return []

    const designKey =
      typeof item.designKey === 'string'
        ? item.designKey
        : designKeyForSceneField(nodeKind, sceneKey)
    return [
      normalizeSearchRangeBounds({
        designKey,
        enabled: item.enabled === true,
        max: Math.max(min, max),
        min: Math.min(min, max),
        nodeKind,
        sceneKey,
      }),
    ]
  })
}

export function validEnabledSearchRanges(
  ranges: readonly SimulationSearchRange[],
): SimulationSearchRange[] {
  return ranges.filter(
    (range) =>
      range.enabled &&
      Number.isFinite(range.min) &&
      Number.isFinite(range.max) &&
      range.max > range.min,
  )
}

export function inferSimulationTaskType(
  ranges: readonly SimulationSearchRange[],
): SimulationTaskType {
  return validEnabledSearchRanges(ranges).length > 0 ? 'spatial_search' : 'single_point'
}

export function useSimulationSearchRanges(projectId: string) {
  const [ranges, setRanges] = useState<SimulationSearchRange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadedRef.current = false

    fetch(`/api/projects/${projectId}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          data?: { simulation_search_ranges?: unknown }
          error?: string
        } | null
        if (!response.ok) throw new Error(payload?.error || 'Could not load search ranges.')
        return normalizeSimulationSearchRanges(payload?.data?.simulation_search_ranges)
      })
      .then((nextRanges) => {
        if (cancelled) return
        setRanges(nextRanges)
        loadedRef.current = true
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'Could not load search ranges.')
        loadedRef.current = true
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!loadedRef.current) return
    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          body: JSON.stringify({ simulation_search_ranges: ranges }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error || 'Could not save search ranges.')
        }
        setError(null)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Could not save search ranges.')
      } finally {
        saveTimeoutRef.current = null
      }
    }, 450)

    return () => {
      if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current)
    }
  }, [projectId, ranges])

  const updateRange = useCallback((next: SimulationSearchRange) => {
    setRanges((current) => {
      const index = current.findIndex(
        (range) => range.nodeKind === next.nodeKind && range.sceneKey === next.sceneKey,
      )
      if (index === -1) return [...current, next]
      const copy = [...current]
      copy[index] = next
      return copy
    })
  }, [])

  return useMemo(
    () => ({ error, loading, ranges, setRanges, updateRange }),
    [error, loading, ranges, updateRange],
  )
}
