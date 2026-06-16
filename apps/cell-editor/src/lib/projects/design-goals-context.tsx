'use client'

import { createContext, type ReactNode, useContext } from 'react'
import { useDesignGoals } from '@/src/lib/projects/use-design-goals'

type DesignGoalsContextValue = ReturnType<typeof useDesignGoals>

const DesignGoalsContext = createContext<DesignGoalsContextValue | null>(null)

export function DesignGoalsProvider({
  children,
  projectId,
}: {
  children: ReactNode
  projectId: string
}) {
  const value = useDesignGoals(projectId)
  return <DesignGoalsContext.Provider value={value}>{children}</DesignGoalsContext.Provider>
}

export function useDesignGoalsContext() {
  const value = useContext(DesignGoalsContext)
  if (!value) throw new Error('DesignGoalsProvider is missing.')
  return value
}
