'use client'

import { useScene } from '@pascal-app/core'
import { cn } from '@pascal-app/editor'
import { useThree } from '@react-three/fiber'
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  Pause,
  Play,
  Thermometer,
  Waves,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import {
  DoubleSide,
  Float32BufferAttribute,
  type Material,
  type Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Vector3,
} from 'three'
import { type CellStructureNode, resolveCellStructure } from '@/src/lib/cell-structure'
import {
  type PredictionResultResponse,
  type PredictionSimulationResult,
  usePredictions,
} from '@/src/lib/predictions/use-predictions'
import { resolveCellStackContext } from '@/src/lib/resolve-templates'
import { buildStackLayout, computePresentationStackSpanMm } from '@/src/lib/stack-layout'
import { mmToMeters } from '@/src/lib/units'

type TimeSeriesMetric = {
  id: string
  label: string
  unit: string
  kind: 'time-series'
  data: Array<{ t: number; value: number }>
}

type FieldPoint = {
  x: number
  y: number
  z: number
  value: number
}

type FieldMetric = {
  id: string
  label: string
  unit: string
  kind: 'field'
  range: [number, number]
  frames: Array<{ t: number; points: FieldPoint[] }>
}

type SimulationMetric = TimeSeriesMetric | FieldMetric

type SimulationJob = {
  id: string
  label: string
  condition: string
  status: 'complete' | 'running'
  duration: number
  metrics: SimulationMetric[]
}

export type SimulationPreviewState = {
  activeJobId: string
  activeMetricId: string
  activePredictionId: string | null
  currentTime: number
  sliceRatio: number
  playing: boolean
}

export type SimulationPreviewPatch = Partial<SimulationPreviewState>

export type SimulationResultState = {
  error: string | null
  loading: boolean
  result: PredictionResultResponse | null
}

const SIMULATION_DURATION = 60
const FIELD_FRAME_TIMES = [0, 10, 20, 30, 40, 50, 60]

function createTimeSeries(
  sample: (t: number, ratio: number) => number,
): Array<{ t: number; value: number }> {
  return Array.from({ length: 31 }, (_, index) => {
    const t = index * 2
    return { t, value: Number(sample(t, t / SIMULATION_DURATION).toFixed(3)) }
  })
}

function createFieldFrames(
  base: number,
  span: number,
  wave: number,
): Array<{ t: number; points: FieldPoint[] }> {
  return FIELD_FRAME_TIMES.map((t) => {
    const ratio = t / SIMULATION_DURATION
    const points: FieldPoint[] = []

    for (let xi = 0; xi < 8; xi += 1) {
      for (let yi = 0; yi < 4; yi += 1) {
        for (let zi = 0; zi < 5; zi += 1) {
          const x = -0.44 + xi * 0.126
          const y = 0.08 + yi * 0.032
          const z = -0.22 + zi * 0.11
          const gradient = xi / 7
          const pulse = Math.sin(ratio * Math.PI * 1.4 + xi * 0.52 + zi * 0.38) * wave
          const layerBias = yi * span * 0.035
          points.push({
            x,
            y,
            z,
            value: Number((base + gradient * span + layerBias + pulse).toFixed(2)),
          })
        }
      }
    }

    return { t, points }
  })
}

const SIMULATION_JOBS: SimulationJob[] = [
  {
    id: 'job-1c-charge',
    label: '1C Charge',
    condition: '25 C ambient - CC-CV - 60 s preview',
    status: 'complete',
    duration: SIMULATION_DURATION,
    metrics: [
      {
        id: 'voltage',
        label: 'Terminal voltage',
        unit: 'V',
        kind: 'time-series',
        data: createTimeSeries((_t, r) => 3.38 + r * 0.74 + Math.sin(r * Math.PI * 2.2) * 0.035),
      },
      {
        id: 'current',
        label: 'Current',
        unit: 'A',
        kind: 'time-series',
        data: createTimeSeries((t, r) => (t < 46 ? 42 : 42 * Math.max(0.24, 1 - (r - 0.76) * 2.6))),
      },
      {
        id: 'soc',
        label: 'SOC',
        unit: '%',
        kind: 'time-series',
        data: createTimeSeries((_t, r) => 18 + r * 63),
      },
      {
        id: 'temperature',
        label: 'Temperature',
        unit: 'C',
        kind: 'field',
        range: [24, 42],
        frames: createFieldFrames(24.5, 13.5, 1.6),
      },
      {
        id: 'current-density',
        label: 'Current density',
        unit: 'A/m2',
        kind: 'field',
        range: [120, 760],
        frames: createFieldFrames(130, 560, 48),
      },
    ],
  },
  {
    id: 'job-pulse',
    label: 'Pulse Discharge',
    condition: '10 s pulses - 30 C ambient - tabs opposite',
    status: 'complete',
    duration: SIMULATION_DURATION,
    metrics: [
      {
        id: 'voltage',
        label: 'Terminal voltage',
        unit: 'V',
        kind: 'time-series',
        data: createTimeSeries((t, r) => 4.08 - r * 0.48 - (Math.floor(t / 10) % 2 ? 0.08 : 0)),
      },
      {
        id: 'current',
        label: 'Current',
        unit: 'A',
        kind: 'time-series',
        data: createTimeSeries((t) => (Math.floor(t / 10) % 2 ? -64 : -12)),
      },
      {
        id: 'temperature',
        label: 'Temperature',
        unit: 'C',
        kind: 'field',
        range: [29, 48],
        frames: createFieldFrames(29, 15, 2.2),
      },
    ],
  },
]

export const INITIAL_SIMULATION_PREVIEW_STATE: SimulationPreviewState = {
  activeJobId: SIMULATION_JOBS[0]!.id,
  activeMetricId: SIMULATION_JOBS[0]!.metrics[0]!.id,
  activePredictionId: null,
  currentTime: 0,
  sliceRatio: 0.5,
  playing: false,
}

function formatPredictionDate(value: string | null | undefined) {
  if (!value) return 'pending'
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function predictionStatusTone(status: string | null | undefined) {
  if (status === 'failed' || status === 'error') return 'bg-[#fca5a5]/12 text-[#fecaca]'
  if (status === 'running' || status === 'processing') return 'bg-[#facc15]/12 text-[#fde68a]'
  if (status === 'complete' || status === 'completed' || status === 'succeeded') {
    return 'bg-[#86efac]/12 text-[#86efac]'
  }
  return 'bg-white/8 text-muted-foreground'
}

function predictionConfigSummary(config: unknown) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null

  const record = config as Record<string, unknown>
  const duration = typeof record.duration === 'number' ? `${record.duration} s` : null
  const conditions = Array.isArray(record.conditions) ? record.conditions : []
  const labels = conditions
    .map((condition) => {
      if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return null
      const conditionRecord = condition as Record<string, unknown>
      return typeof conditionRecord.label === 'string'
        ? conditionRecord.label
        : typeof conditionRecord.id === 'string'
          ? conditionRecord.id
          : null
    })
    .filter((label): label is string => !!label)

  if (labels.length === 0) return duration
  return [labels.join(', '), duration].filter(Boolean).join(' - ')
}

function canPreviewPrediction(status: string | null | undefined) {
  return status === 'succeeded' || status === 'complete' || status === 'completed'
}

function predictionResultToJob(result: PredictionSimulationResult | null | undefined) {
  if (!result) return null
  if (!Array.isArray(result.metrics) || result.metrics.length === 0) return null

  const metrics: SimulationMetric[] = result.metrics.map((metric) => {
    if (metric.kind === 'time-series') return metric

    return {
      id: metric.id,
      label: metric.label,
      unit: metric.unit,
      kind: 'field',
      range: metric.range,
      frames: metric.frames.map((frame) => {
        const rows = frame.values
        const rowCount = Math.max(rows.length, 1)
        const columnCount = Math.max(rows[0]?.length ?? frame.width, 1)
        const points: FieldPoint[] = []

        rows.forEach((row, rowIndex) => {
          row.forEach((value, columnIndex) => {
            points.push({
              x: -0.44 + (columnIndex / Math.max(columnCount - 1, 1)) * 0.88,
              y: 0.08,
              z: -0.22 + (rowIndex / Math.max(rowCount - 1, 1)) * 0.44,
              value,
            })
          })
        })

        return { points, t: frame.t }
      }),
    }
  })

  return {
    id: result.id,
    label: result.label,
    condition: result.condition,
    duration: result.duration,
    metrics,
    status: 'complete',
  } satisfies SimulationJob
}

export function CellSimulationJobsPanel({
  embedded = false,
  onClose,
  onSelectJob,
  projectId,
}: {
  embedded?: boolean
  onClose: () => void
  onSelectJob: (jobId: string, metricId: string) => void
  projectId?: string
}) {
  const { error, loading, predictions } = usePredictions({ limit: 50, projectId })

  return (
    <section
      className={cn(
        'pointer-events-auto flex flex-col overflow-hidden bg-background/95 text-foreground',
        embedded
          ? 'h-full border-border/60 border-l'
          : 'max-h-[calc(100dvh-5rem)] w-[min(410px,calc(100vw-2rem))] rounded-xl border border-border/60 shadow-2xl backdrop-blur-xl',
      )}
    >
      <header className="flex h-13 shrink-0 items-center justify-between border-border/60 border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#facc15]/15 text-[#fde68a]">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-sm">Simulation Jobs</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              Submitted tasks and completed result sets
            </p>
          </div>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2C2C2E] text-muted-foreground transition-colors hover:bg-[#3e3e3e] hover:text-foreground"
          onClick={onClose}
          title="Close jobs"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="rounded-lg border border-border/50 bg-white/[0.03] p-3 text-muted-foreground text-xs">
            Loading prediction tasks...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[#fca5a5]/25 bg-[#fca5a5]/10 p-3 text-[#fecaca] text-xs">
            {error}
          </div>
        ) : null}

        {!loading && !error && predictions.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-white/[0.03] p-3 text-muted-foreground text-xs">
            No prediction tasks yet.
          </div>
        ) : null}

        <div className="grid gap-2">
          {predictions.map((prediction) => {
            const canPreview = canPreviewPrediction(prediction.status)

            return (
              <button
                className={cn(
                  'rounded-lg border border-border/50 bg-white/[0.03] p-3 text-left transition-colors',
                  canPreview
                    ? 'hover:border-[#818cf8]/45 hover:bg-[#818cf8]/12'
                    : 'cursor-not-allowed opacity-55',
                )}
                disabled={!canPreview}
                key={prediction.id}
                onClick={() => onSelectJob(prediction.id, 'voltage')}
                title={canPreview ? 'Open prediction result' : 'Result is not ready yet'}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-semibold text-sm">
                    {prediction.label ||
                      prediction.name ||
                      `Prediction ${prediction.id.slice(0, 8)}`}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px]',
                      predictionStatusTone(prediction.status),
                    )}
                  >
                    {prediction.status ?? 'pending'}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {predictionConfigSummary(prediction.simulation_config) || prediction.id}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatPredictionDate(prediction.created_at)}</span>
                  <span>
                    {formatPredictionDate(prediction.finished_at ?? prediction.updated_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function metricIcon(metric: SimulationMetric) {
  if (metric.kind === 'time-series') return <Activity className="h-3.5 w-3.5" />
  if (metric.id === 'temperature') return <Thermometer className="h-3.5 w-3.5" />
  return <Waves className="h-3.5 w-3.5" />
}

function resolveActive(jobId: string, metricId: string, jobs: SimulationJob[] = SIMULATION_JOBS) {
  const job = jobs.find((item) => item.id === jobId) ?? jobs[0] ?? SIMULATION_JOBS[0]!
  const metric = job.metrics.find((item) => item.id === metricId) ?? job.metrics[0]!
  return { job, metric }
}

function colorChannelsForValue(
  value: number,
  [min, max]: [number, number],
): [number, number, number] {
  const ratio = Math.min(1, Math.max(0, (value - min) / Math.max(0.001, max - min)))
  const stops =
    ratio < 0.5
      ? {
          from: [0x3b, 0x82, 0xf6] as const,
          localRatio: ratio / 0.5,
          to: [0x22, 0xc5, 0x5e] as const,
        }
      : {
          from: [0x22, 0xc5, 0x5e] as const,
          localRatio: (ratio - 0.5) / 0.5,
          to: [0xf9, 0x73, 0x16] as const,
        }
  const red = Math.round(stops.from[0] + (stops.to[0] - stops.from[0]) * stops.localRatio)
  const green = Math.round(stops.from[1] + (stops.to[1] - stops.from[1]) * stops.localRatio)
  const blue = Math.round(stops.from[2] + (stops.to[2] - stops.from[2]) * stops.localRatio)

  return [red, green, blue]
}

function closestFieldFrame(metric: FieldMetric, currentTime: number) {
  return metric.frames.reduce((closest, frame) =>
    Math.abs(frame.t - currentTime) < Math.abs(closest.t - currentTime) ? frame : closest,
  )
}

function sampleFieldValue(
  points: FieldPoint[],
  sample: { x: number; y: number; z: number },
  fallback: number,
) {
  let weightedValue = 0
  let totalWeight = 0

  for (const point of points) {
    const dx = point.x - sample.x
    const dy = (point.y - sample.y) * 2.2
    const dz = point.z - sample.z
    const distanceSquared = dx * dx + dy * dy + dz * dz
    const weight = 1 / Math.max(0.000_001, distanceSquared)
    weightedValue += point.value * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedValue / totalWeight : fallback
}

function MiniChart({
  data,
  currentTime,
  unit,
}: {
  data: TimeSeriesMetric['data']
  currentTime: number
  unit: string
}) {
  const values = data.map((item) => item.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = 220
  const height = 82
  const points = data
    .map((item) => {
      const x = (item.t / SIMULATION_DURATION) * width
      const y = height - ((item.value - min) / Math.max(0.001, max - min)) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const playheadX = (currentTime / SIMULATION_DURATION) * width
  const value = data.reduce((closest, item) =>
    Math.abs(item.t - currentTime) < Math.abs(closest.t - currentTime) ? item : closest,
  )

  return (
    <div className="rounded-lg border border-white/10 bg-black/24 p-2">
      <svg
        aria-hidden
        className="h-[82px] w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="simulation-chart-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          points={points}
          stroke="url(#simulation-chart-line)"
          strokeWidth="2.2"
        />
        <line
          stroke="#ffffff55"
          strokeDasharray="3 4"
          strokeWidth="1"
          x1={playheadX}
          x2={playheadX}
          y1="0"
          y2={height}
        />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{currentTime.toFixed(0)} s</span>
        <span className="font-semibold text-foreground">
          {value.value.toFixed(2)} {unit}
        </span>
      </div>
    </div>
  )
}

export function CellSimulationButton({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'flex h-11 items-center gap-2 rounded-lg border px-3 font-medium text-xs shadow-2xl backdrop-blur-md transition-colors',
        active
          ? 'border-[#facc15]/45 bg-[#2d2611]/92 text-[#fde68a]'
          : 'border-border/60 bg-background/92 text-muted-foreground hover:bg-white/8 hover:text-foreground',
      )}
      onClick={onClick}
      title="Simulation results"
      type="button"
    >
      <Zap className="h-4.5 w-4.5" />
      <span>Results</span>
    </button>
  )
}

export function CellSimulationResultsPanel({
  embedded = false,
  onBack,
  resultState,
  state,
  onCellDesignPreview,
  onChange,
  onClose,
}: {
  embedded?: boolean
  onBack?: () => void
  resultState: SimulationResultState
  state: SimulationPreviewState
  onCellDesignPreview?: (cellDesign: unknown) => void
  onChange: (patch: SimulationPreviewPatch) => void
  onClose: () => void
}) {
  const { error: resultError, loading: resultLoading, result } = resultState
  const resultJob = useMemo(
    () => predictionResultToJob(result?.simulationResult),
    [result?.simulationResult],
  )
  const jobs = resultJob ? [resultJob] : state.activePredictionId ? [] : SIMULATION_JOBS
  const active =
    jobs.length > 0 ? resolveActive(state.activeJobId, state.activeMetricId, jobs) : null
  const job = active?.job
  const metric = active?.metric

  useEffect(() => {
    if (result?.data?.cell_design) onCellDesignPreview?.(result.data.cell_design)
  }, [onCellDesignPreview, result?.data?.cell_design])

  useEffect(() => {
    if (!state.playing || !job) return
    const timer = window.setInterval(() => {
      onChange({
        currentTime:
          state.currentTime >= job.duration ? 0 : Math.min(job.duration, state.currentTime + 1),
      })
    }, 180)
    return () => window.clearInterval(timer)
  }, [job, onChange, state.currentTime, state.playing])

  return (
    <section
      className={cn(
        'pointer-events-auto flex flex-col overflow-hidden bg-background/95 text-foreground',
        embedded
          ? 'h-full border-border/60 border-l'
          : 'max-h-[calc(100dvh-5rem)] w-[min(410px,calc(100vw-2rem))] rounded-xl border border-border/60 shadow-2xl backdrop-blur-xl',
      )}
    >
      <header className="flex h-13 shrink-0 items-center justify-between border-border/60 border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          {onBack ? (
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2C2C2E] text-muted-foreground transition-colors hover:bg-[#3e3e3e] hover:text-foreground"
              onClick={onBack}
              title="Back to jobs"
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#facc15]/15 text-[#fde68a]">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-sm">Simulation Preview</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              Jobs, metrics, and synchronized time playback
            </p>
          </div>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2C2C2E] text-muted-foreground transition-colors hover:bg-[#3e3e3e] hover:text-foreground"
          onClick={onClose}
          title="Close simulation preview"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {!job || !metric ? (
          <div className="rounded-lg border border-border/50 bg-white/[0.03] p-3 text-muted-foreground text-xs">
            {resultError ??
              result?.data?.error_message ??
              result?.resultError ??
              (resultLoading
                ? 'Loading simulation result JSON...'
                : 'No simulation result JSON loaded.')}
          </div>
        ) : (
          <>
            <div className="mb-3 grid gap-2">
              {jobs.map((item) => {
                const active = item.id === job.id
                return (
                  <button
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      active
                        ? 'border-[#818cf8]/45 bg-[#818cf8]/12'
                        : 'border-border/50 bg-white/[0.03] hover:bg-white/[0.06]',
                    )}
                    key={item.id}
                    onClick={() =>
                      onChange({
                        activeJobId: item.id,
                        activeMetricId: item.metrics[0]?.id ?? state.activeMetricId,
                        currentTime: 0,
                        playing: false,
                      })
                    }
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-sm">{item.label}</span>
                      <span className="rounded-full bg-[#86efac]/12 px-2 py-0.5 text-[#86efac] text-[10px]">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.condition}</p>
                  </button>
                )
              })}
            </div>

            <div className="rounded-lg border border-border/50 bg-black/18">
              <div className="flex h-9 items-center gap-2 border-border/50 border-b px-3 text-muted-foreground text-xs">
                <ChevronDown className="h-3.5 w-3.5" />
                Metrics
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2">
                {job.metrics.map((item) => {
                  const active = item.id === metric.id
                  return (
                    <button
                      aria-pressed={active}
                      className={cn(
                        'flex h-9 items-center gap-2 rounded-md px-2.5 font-medium text-[11px] transition-colors',
                        active
                          ? 'bg-[#818cf8] text-white'
                          : 'bg-white/[0.04] text-muted-foreground hover:bg-white/8 hover:text-foreground',
                      )}
                      key={item.id}
                      onClick={() => onChange({ activeMetricId: item.id, playing: false })}
                      type="button"
                    >
                      {metricIcon(item)}
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border/50 bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm">{metric.label}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {metric.kind === 'time-series' ? 'Panel-only 2D chart' : 'X slice field map'}
                  </p>
                </div>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2C2C2E] text-foreground transition-colors hover:bg-[#3e3e3e]"
                  onClick={() => onChange({ playing: !state.playing })}
                  type="button"
                >
                  {state.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
              </div>

              {metric.kind === 'time-series' ? (
                <MiniChart currentTime={state.currentTime} data={metric.data} unit={metric.unit} />
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                  <div className="mb-3 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Color range</span>
                    <span className="font-semibold">
                      {metric.range[0]} - {metric.range[1]} {metric.unit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gradient-to-r from-[#60a5fa] via-[#34d399] to-[#f97316]" />
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    The 3D canvas renders one Y-Z section at the selected X depth. Time controls the
                    field values on that section.
                  </p>
                </div>
              )}

              {metric.kind === 'field' ? (
                <div className="mt-3 grid gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">X slice depth</span>
                    <span className="font-semibold">{Math.round(state.sliceRatio * 100)}%</span>
                  </div>
                  <input
                    aria-label="X slice depth"
                    className="accent-[#facc15]"
                    max={1}
                    min={0}
                    onChange={(event) =>
                      onChange({ sliceRatio: Number.parseFloat(event.target.value) })
                    }
                    step={0.01}
                    type="range"
                    value={state.sliceRatio}
                  />
                </div>
              ) : null}

              <div className="mt-3 grid gap-1">
                <input
                  aria-label="Simulation time"
                  className="accent-[#818cf8]"
                  max={job.duration}
                  min={0}
                  onChange={(event) =>
                    onChange({ currentTime: Number.parseFloat(event.target.value), playing: false })
                  }
                  step={1}
                  type="range"
                  value={state.currentTime}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 s</span>
                  <span>{state.currentTime.toFixed(0)} s</span>
                  <span>{job.duration} s</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function useCellDimensions() {
  const nodes = useScene((s) => s.nodes)
  return useMemo(() => {
    const sceneNodes = nodes as unknown as Record<string, CellStructureNode>
    const structure = resolveCellStructure(sceneNodes)
    const stackNode = structure.stackId ? sceneNodes[structure.stackId] : null
    if (stackNode?.type !== 'stack') {
      return {
        centerX: 0,
        centerY: 0.21,
        lengthM: 0.8,
        maxX: 0.06,
        minX: -0.06,
        stackM: 0.12,
        widthM: 0.42,
      }
    }

    const context = resolveCellStackContext(nodes as Record<string, unknown>, stackNode as never)
    if (!context) {
      return {
        centerX: 0,
        centerY: 0.21,
        lengthM: 0.8,
        maxX: 0.06,
        minX: -0.06,
        stackM: 0.12,
        widthM: 0.42,
      }
    }
    const layers = buildStackLayout(
      {
        cathode: context.templates.cathode.id,
        separator: context.templates.separator.id,
        anode: context.templates.anode.id,
        'cathode-current-collector': context.templates['cathode-current-collector'].id,
        'anode-current-collector': context.templates['anode-current-collector'].id,
      },
      context.thicknessInput,
    )
    const stackSpan = computePresentationStackSpanMm(layers, 1, 0)
    const stackM = Math.max(mmToMeters(stackSpan.spanMm), 0.02)
    const centerX = mmToMeters(stackSpan.centerMm)
    const minX = centerX - stackM / 2
    const maxX = centerX + stackM / 2
    const widthM = mmToMeters(context.cell.electrode_width)

    return {
      centerX,
      centerY: widthM / 2,
      lengthM: mmToMeters(context.cell.electrode_length),
      maxX,
      minX,
      stackM,
      widthM,
    }
  }, [nodes])
}

type MaterialSnapshot = {
  depthWrite: boolean
  opacity: number
  transparent: boolean
}

function materialList(material: Material | Material[]) {
  return Array.isArray(material) ? material : [material]
}

function hasSimulationOverlayAncestor(mesh: Mesh) {
  let current = mesh.parent

  while (current) {
    if (current.userData.simulationOverlay === true) return true
    current = current.parent
  }

  return false
}

function SimulationCellTransparency() {
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const snapshots = new Map<Material, MaterialSnapshot>()

    scene.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh || !mesh.material) return
      if (mesh.userData.simulationOverlay === true || hasSimulationOverlayAncestor(mesh)) return

      for (const material of materialList(mesh.material)) {
        if (snapshots.has(material)) continue

        snapshots.set(material, {
          depthWrite: material.depthWrite,
          opacity: material.opacity,
          transparent: material.transparent,
        })
        material.transparent = true
        material.opacity = Math.min(material.opacity, 0.045)
        material.depthWrite = false
        material.needsUpdate = true
      }
    })

    return () => {
      for (const [material, snapshot] of snapshots) {
        material.transparent = snapshot.transparent
        material.opacity = snapshot.opacity
        material.depthWrite = snapshot.depthWrite
        material.needsUpdate = true
      }
    }
  }, [scene])

  return null
}

type CameraControlsImpl = {
  setLookAt?: (
    positionX: number,
    positionY: number,
    positionZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    enableTransition?: boolean,
  ) => Promise<unknown>
  zoomTo?: (zoom: number, enableTransition?: boolean) => Promise<unknown>
}

function SimulationSliceCameraFrame() {
  const dimensions = useCellDimensions()
  const controls = useThree((state) => state.controls) as CameraControlsImpl | null
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const center = new Vector3(dimensions.centerX, dimensions.centerY, 0)
    const direction = new Vector3(1, 0.7, 1).normalize()
    const distance = Math.max(dimensions.lengthM, dimensions.widthM, 1) * 2.2
    const position = center.clone().addScaledVector(direction, distance)

    camera.position.copy(position)
    camera.up.set(0, 1, 0)
    camera.lookAt(center)
    void controls?.setLookAt?.(
      position.x,
      position.y,
      position.z,
      center.x,
      center.y,
      center.z,
      true,
    )

    if (camera instanceof OrthographicCamera) {
      const viewWidth = camera.right - camera.left
      const viewHeight = camera.top - camera.bottom
      const targetWidth = Math.max(dimensions.lengthM * 1.45, 0.001)
      const targetHeight = Math.max(dimensions.widthM * 1.45, dimensions.stackM * 8, 0.001)
      const nextZoom = Math.max(1, Math.min(viewWidth / targetWidth, viewHeight / targetHeight))
      camera.zoom = nextZoom
      camera.updateProjectionMatrix()
      void controls?.zoomTo?.(nextZoom, true)
    }

    invalidate()
  }, [camera, controls, dimensions, invalidate])

  return null
}

function SimulationField({
  metric,
  currentTime,
  sliceRatio,
}: {
  metric: FieldMetric
  currentTime: number
  sliceRatio: number
}) {
  const dimensions = useCellDimensions()
  const sliceX = dimensions.minX + dimensions.stackM * sliceRatio
  const frame = closestFieldFrame(metric, currentTime)
  const geometry = useMemo(() => {
    const ySegments = 48
    const zSegments = 48
    const nextGeometry = new PlaneGeometry(
      dimensions.lengthM,
      dimensions.widthM,
      zSegments,
      ySegments,
    )
    const [min, max] = metric.range
    const scaleY = dimensions.widthM / 0.52
    const scaleZ = dimensions.lengthM / 0.96
    const sampleX = -0.44 + sliceRatio * 0.88
    const colors: number[] = []

    for (let y = 0; y <= ySegments; y += 1) {
      for (let z = 0; z <= zSegments; z += 1) {
        const yRatio = y / ySegments
        const zRatio = z / zSegments
        const worldY = yRatio * dimensions.widthM
        const worldZ = (zRatio - 0.5) * dimensions.lengthM
        const value = sampleFieldValue(
          frame.points,
          {
            x: sampleX,
            y: worldY / scaleY,
            z: worldZ / scaleZ,
          },
          min,
        )
        const [red, green, blue] = colorChannelsForValue(
          Math.min(max, Math.max(min, value)),
          metric.range,
        )
        colors.push(red / 255, green / 255, blue / 255)
      }
    }

    nextGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return nextGeometry
  }, [dimensions.lengthM, dimensions.widthM, frame.points, metric.range, sliceRatio])

  return (
    <group userData={{ simulationOverlay: true }}>
      <mesh position={[dimensions.centerX, dimensions.centerY, 0]}>
        <boxGeometry
          args={[dimensions.stackM * 1.5, dimensions.widthM * 1.04, dimensions.lengthM * 1.04]}
        />
        <meshBasicMaterial
          color="#a5b4fc"
          depthTest={false}
          depthWrite={false}
          opacity={0.08}
          transparent
        />
      </mesh>
      <mesh
        position={[sliceX, dimensions.centerY, 0]}
        renderOrder={999}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[dimensions.lengthM * 1.04, dimensions.widthM * 1.04]} />
        <meshBasicMaterial
          color="#facc15"
          depthTest={false}
          depthWrite={false}
          opacity={0.12}
          transparent
        />
      </mesh>
      <mesh
        position={[sliceX, dimensions.centerY, 0]}
        renderOrder={1000}
        rotation={[0, Math.PI / 2, 0]}
      >
        <primitive attach="geometry" object={geometry} />
        <meshBasicMaterial
          depthTest={false}
          depthWrite={false}
          opacity={0.58}
          side={DoubleSide}
          transparent
          vertexColors
        />
      </mesh>
    </group>
  )
}

export function CellSimulationFieldOverlay({
  resultState,
  state,
}: {
  resultState: SimulationResultState
  state: SimulationPreviewState
}) {
  const { result } = resultState
  const resultJob = useMemo(
    () => predictionResultToJob(result?.simulationResult),
    [result?.simulationResult],
  )
  if (state.activePredictionId && !resultJob) return null

  const jobs = resultJob ? [resultJob] : SIMULATION_JOBS
  const { metric } = resolveActive(state.activeJobId, state.activeMetricId, jobs)

  if (metric.kind === 'time-series') {
    return null
  }

  return (
    <>
      <SimulationSliceCameraFrame />
      <SimulationCellTransparency />
      <SimulationField
        currentTime={state.currentTime}
        metric={metric}
        sliceRatio={state.sliceRatio}
      />
    </>
  )
}
