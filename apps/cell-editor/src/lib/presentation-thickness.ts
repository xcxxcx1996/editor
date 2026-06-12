import { useSyncExternalStore } from 'react'

export const REAL_THICKNESS_SCALE = 1
export const EXAGGERATED_THICKNESS_SCALE = 20

type Listener = () => void

let thicknessScale = EXAGGERATED_THICKNESS_SCALE
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

export function getPresentationThicknessScale() {
  return thicknessScale
}

export function setPresentationThicknessScale(scale: number) {
  const nextScale =
    scale === EXAGGERATED_THICKNESS_SCALE ? EXAGGERATED_THICKNESS_SCALE : REAL_THICKNESS_SCALE
  if (thicknessScale === nextScale) return
  thicknessScale = nextScale
  emit()
}

export function togglePresentationThicknessScale() {
  setPresentationThicknessScale(
    thicknessScale === EXAGGERATED_THICKNESS_SCALE
      ? REAL_THICKNESS_SCALE
      : EXAGGERATED_THICKNESS_SCALE,
  )
}

export function subscribePresentationThicknessScale(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePresentationThicknessScale() {
  return useSyncExternalStore(
    subscribePresentationThicknessScale,
    getPresentationThicknessScale,
    getPresentationThicknessScale,
  )
}

export function isPresentationThicknessExaggerated(scale: number) {
  return scale === EXAGGERATED_THICKNESS_SCALE
}
