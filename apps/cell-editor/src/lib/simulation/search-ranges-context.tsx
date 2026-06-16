'use client'

import { createContext, type ReactNode, useContext } from 'react'
import {
  type SimulationSearchRange,
  useSimulationSearchRanges,
} from '@/src/lib/simulation/search-ranges'

type SimulationSearchRangesContextValue = ReturnType<typeof useSimulationSearchRanges>

const SimulationSearchRangesContext = createContext<SimulationSearchRangesContextValue | null>(null)

export function SimulationSearchRangesProvider({
  children,
  projectId,
}: {
  children: ReactNode
  projectId: string
}) {
  const value = useSimulationSearchRanges(projectId)
  return (
    <SimulationSearchRangesContext.Provider value={value}>
      {children}
    </SimulationSearchRangesContext.Provider>
  )
}

export function useSimulationSearchRangesContext() {
  const value = useContext(SimulationSearchRangesContext)
  if (!value) throw new Error('SimulationSearchRangesProvider is missing.')
  return value
}

export function useSimulationSearchRange(nodeKind: string, sceneKey: string) {
  const context = useSimulationSearchRangesContext()
  const range =
    context.ranges.find((item) => item.nodeKind === nodeKind && item.sceneKey === sceneKey) ?? null

  function updateRange(next: SimulationSearchRange) {
    context.updateRange(next)
  }

  return { ...context, range, updateRange }
}
