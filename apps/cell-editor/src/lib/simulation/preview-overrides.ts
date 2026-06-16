import { useSyncExternalStore } from 'react'

type Listener = () => void

const listeners = new Set<Listener>()
const overrides = new Map<string, number>()

function emit() {
  for (const listener of listeners) listener()
}

export function setSimulationPreviewOverride(sceneKey: string, value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    if (!overrides.delete(sceneKey)) return
    emit()
    return
  }

  if (overrides.get(sceneKey) === value) return
  overrides.set(sceneKey, value)
  emit()
}

export function getSimulationPreviewOverride(sceneKey: string): number | undefined {
  return overrides.get(sceneKey)
}

export function clearSimulationPreviewOverrides() {
  if (overrides.size === 0) return
  overrides.clear()
  emit()
}

export function useSimulationPreviewOverride(sceneKey: string): number | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => overrides.get(sceneKey),
    () => undefined,
  )
}
