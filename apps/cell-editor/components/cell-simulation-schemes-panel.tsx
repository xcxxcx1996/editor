'use client'

import { cn } from '@pascal-app/editor'
import { CheckCircle2, CircleDashed, ListChecks } from 'lucide-react'
import type { SimulationScheme } from '@/src/lib/predictions/use-predictions'

function formatParameterValue(value: number) {
  return Number.parseFloat(value.toFixed(4)).toString()
}

function formatParameters(parameters: SimulationScheme['parameters']) {
  if (!parameters || Object.keys(parameters).length === 0) return null

  return Object.entries(parameters)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${formatParameterValue(value)}`)
    .join(' · ')
}

function constraintSummary(scheme: SimulationScheme) {
  if (scheme.goals_met !== undefined) return scheme.goals_met ? 'Goals met' : 'Goals missed'
  if (!scheme.constraint_scores || scheme.constraint_scores.length === 0) return null

  const satisfied = scheme.constraint_scores.filter((score) => score.satisfied).length
  return `${satisfied}/${scheme.constraint_scores.length} constraints`
}

export function CellSimulationSchemesPanel({
  activeSchemeId,
  onSelectScheme,
  schemes,
}: {
  activeSchemeId: string | null
  onSelectScheme: (schemeId: string) => void
  schemes: SimulationScheme[]
}) {
  if (schemes.length <= 1) return null

  return (
    <section className="pointer-events-auto absolute top-20 right-4 z-40 flex max-h-[calc(100dvh-7rem)] w-[min(320px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 text-foreground shadow-2xl backdrop-blur-xl">
      <header className="flex h-13 shrink-0 items-center justify-between border-border/60 border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#67e8f9]/12 text-[#a5f3fc]">
            <ListChecks className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-sm">Schemes</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {schemes.length} spatial search candidates
            </p>
          </div>
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid gap-2">
          {schemes.map((scheme, index) => {
            const active = scheme.id === activeSchemeId
            const parameters = formatParameters(scheme.parameters)
            const summary = constraintSummary(scheme)

            return (
              <button
                aria-pressed={active}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-[#67e8f9]/50 bg-[#67e8f9]/12 shadow-[0_0_0_1px_rgba(103,232,249,0.08)_inset]'
                    : 'border-border/50 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]',
                )}
                key={scheme.id}
                onClick={() => onSelectScheme(scheme.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-sm">{scheme.label}</span>
                      {scheme.rank !== undefined ? (
                        <span className="shrink-0 rounded-full bg-[#facc15]/12 px-1.5 py-0.5 text-[#fde68a] text-[10px]">
                          #{scheme.rank}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {parameters ?? scheme.condition ?? `Candidate ${index + 1}`}
                    </p>
                  </div>
                  {summary ? (
                    <span
                      className={cn(
                        'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px]',
                        scheme.goals_met === false
                          ? 'bg-[#fca5a5]/12 text-[#fecaca]'
                          : 'bg-[#86efac]/12 text-[#bbf7d0]',
                      )}
                    >
                      {scheme.goals_met === false ? (
                        <CircleDashed className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {summary}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
