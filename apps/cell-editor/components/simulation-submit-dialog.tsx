'use client'

import { cn } from '@pascal-app/editor'
import { Loader2, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDesignGoalsContext } from '@/src/lib/projects/design-goals-context'
import type { DesignGoal, WorkCondition } from '@/src/lib/projects/types'
import {
  formatSearchRangeBounds,
  inferSimulationTaskType,
  normalizeSearchRangeBounds,
  type SimulationSearchRange,
  validEnabledSearchRanges,
} from '@/src/lib/simulation/search-ranges'

function conditionSummary(condition: WorkCondition) {
  return [
    condition.temperature_c === undefined ? null : `${condition.temperature_c} C`,
    condition.soc_pct === undefined ? null : `${condition.soc_pct}% SOC`,
    condition.rate,
    condition.mode,
    condition.cutoff_voltage_v === undefined ? null : `${condition.cutoff_voltage_v} V cutoff`,
    condition.protocol,
  ]
    .filter(Boolean)
    .join(' - ')
}

export function SimulationSubmitDialog({
  busy,
  onClose,
  onSubmit,
  open,
  searchRanges,
}: {
  busy: boolean
  onClose: () => void
  onSubmit: (input: { goals: DesignGoal[]; searchRanges: SimulationSearchRange[] }) => Promise<void>
  open: boolean
  searchRanges: SimulationSearchRange[]
}) {
  const { goals, loading } = useDesignGoalsContext()
  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const enabledRanges = useMemo(
    () => validEnabledSearchRanges(searchRanges).map(normalizeSearchRangeBounds),
    [searchRanges],
  )
  const taskType = inferSimulationTaskType(enabledRanges)

  useEffect(() => {
    if (!open) return
    setSelectedGoalIds(new Set(goals.map((goal) => goal.id)))
    setError(null)
  }, [goals, open])

  if (!open) return null

  const selectedGoals = goals.filter((goal) => selectedGoalIds.has(goal.id))
  const canSubmit = !busy && !loading && selectedGoals.length > 0

  async function submit() {
    if (!canSubmit) return
    setError(null)
    try {
      await onSubmit({ goals: selectedGoals, searchRanges: enabledRanges })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit simulation.')
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        aria-label="Close simulation submit dialog"
        className="absolute inset-0 bg-[#111113]/78 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div
        className="relative flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border/60 bg-[#1a1a1c] text-foreground shadow-2xl"
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-border/60 border-b px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#facc15]/14 text-[#fde68a]">
                <Zap className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="font-semibold text-sm">Submit simulation</h3>
                <p className="text-[11px] text-muted-foreground">
                  Review goals and parameter sweep.
                </p>
              </div>
            </div>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/8 hover:text-foreground"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-white/[0.035] px-3 py-2">
            <span className="text-muted-foreground text-xs">Task type</span>
            <span
              className={cn(
                'rounded-full px-2 py-1 font-semibold text-[11px]',
                taskType === 'spatial_search'
                  ? 'bg-[#facc15]/14 text-[#fde68a]'
                  : 'bg-[#86efac]/12 text-[#bbf7d0]',
              )}
            >
              {taskType === 'spatial_search' ? 'Spatial search' : 'Single point'}
            </span>
          </div>

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs">Design goals</h4>
              {goals.length > 0 ? (
                <button
                  className="text-[#fde68a] text-[11px] hover:underline"
                  onClick={() =>
                    setSelectedGoalIds(
                      selectedGoalIds.size === goals.length
                        ? new Set()
                        : new Set(goals.map((goal) => goal.id)),
                    )
                  }
                  type="button"
                >
                  {selectedGoalIds.size === goals.length ? 'Clear' : 'Select all'}
                </button>
              ) : null}
            </div>
            {loading ? (
              <div className="rounded-lg border border-border/50 bg-white/[0.03] p-3 text-muted-foreground text-xs">
                Loading design goals...
              </div>
            ) : null}
            {!loading && goals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-white/[0.025] p-4 text-center text-muted-foreground text-xs">
                Add at least one Design Goal before submitting a simulation.
              </div>
            ) : null}
            {goals.map((goal) => (
              <label
                className="flex cursor-pointer gap-3 rounded-lg border border-border/50 bg-white/[0.035] p-3 text-xs hover:bg-white/[0.055]"
                key={goal.id}
              >
                <input
                  checked={selectedGoalIds.has(goal.id)}
                  className="mt-1 accent-[#facc15]"
                  onChange={(event) => {
                    setSelectedGoalIds((current) => {
                      const next = new Set(current)
                      if (event.target.checked) next.add(goal.id)
                      else next.delete(goal.id)
                      return next
                    })
                  }}
                  type="checkbox"
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">{goal.label}</span>
                  <span className="mt-1 block text-muted-foreground">
                    {conditionSummary(goal.work_condition) || 'No work condition'}
                  </span>
                </span>
              </label>
            ))}
          </section>

          <section className="mt-4 grid gap-2">
            <h4 className="font-semibold text-xs">Parameters</h4>
            {enabledRanges.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-white/[0.03] p-3 text-muted-foreground text-xs">
                No enabled ranges. The current scene will run as a single-point simulation.
              </div>
            ) : (
              <div className="grid gap-2">
                {enabledRanges.map((range) => (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border border-[#facc15]/20 bg-[#facc15]/[0.04] p-3 text-xs"
                    key={`${range.nodeKind}:${range.sceneKey}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#fde68a]">{range.designKey}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {range.nodeKind}.{range.sceneKey}
                      </p>
                    </div>
                    <p className="font-mono text-foreground tabular-nums">
                      {formatSearchRangeBounds(range)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error ? (
            <div className="mt-4 rounded-lg border border-[#fca5a5]/25 bg-[#fca5a5]/10 p-3 text-[#fecaca] text-xs">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-border/60 border-t p-3">
          <button
            className="h-8 rounded-md px-3 font-medium text-muted-foreground text-xs hover:bg-white/8 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#facc15] px-3 font-semibold text-[#1c1917] text-xs disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit}
            onClick={() => void submit()}
            type="button"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Submit
          </button>
        </footer>
      </div>
    </div>
  )
}
