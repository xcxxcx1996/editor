'use client'

import { useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Camera, OrthographicCamera, Vector3 } from 'three'
import { type CellStructureNode, resolveCellStructure } from '@/src/lib/cell-structure'
import { totalStackHeight } from '@/src/lib/derived'
import { resolveCellStackContext } from '@/src/lib/resolve-templates'
import { mmToMeters } from '@/src/lib/units'

const ISO_DIRECTION = new Vector3(1, 0.58, 0.82).normalize()
const ENTRY_CAMERA_DISTANCE_MULTIPLIER = 1.9
const INITIAL_FRAME_PADDING = 1.35
const CELL_ORTHOGRAPHIC_NEAR = 0.01
const CELL_ORTHOGRAPHIC_FAR = 50
const MIN_VISIBLE_CELL_HEIGHT_M = 0.035
const MIN_VISIBLE_FRAME_WIDTH_M = 0.52
const MIN_VISIBLE_FRAME_HEIGHT_M = 0.24
const DEFAULT_CELL_FRAME_SIZE = new Vector3(0.46, MIN_VISIBLE_CELL_HEIGHT_M, 0.12)

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

export function CellCameraController({
  entryKey,
  fitTrigger,
  onEntryFramed,
  onFitFramed,
}: {
  entryKey: number
  fitTrigger: number
  onEntryFramed?: () => void
  onFitFramed?: () => void
}) {
  const nodes = useScene((s) => s.nodes)
  const controls = useThree((s) => s.controls) as CameraControlsImpl | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const lastEntryRef = useRef(-1)
  const lastFitRef = useRef(-1)
  const cellFrame = useMemo(() => computeCellFrame(nodes as Record<string, unknown>), [nodes])

  useEffect(() => {
    useViewer.getState().setCameraMode('orthographic')
    if (camera instanceof OrthographicCamera) {
      camera.near = CELL_ORTHOGRAPHIC_NEAR
      camera.far = CELL_ORTHOGRAPHIC_FAR
      camera.updateProjectionMatrix()
    }
    const unsubscribe = useViewer.subscribe((state) => {
      if (state.cameraMode !== 'orthographic') {
        useViewer.getState().setCameraMode('orthographic')
      }
    })
    return unsubscribe
  }, [camera])

  useEffect(() => {
    if (!(controls && cellFrame) || lastEntryRef.current === entryKey) return
    lastEntryRef.current = entryKey
    let cancelled = false

    let innerId = 0
    const outerId = requestAnimationFrame(() => {
      if (cancelled) return
      innerId = requestAnimationFrame(() => {
        if (cancelled) return
        frameInitialView(cellFrame, controls, camera, false)
        invalidate()
        onEntryFramed?.()
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(outerId)
      cancelAnimationFrame(innerId)
    }
  }, [camera, cellFrame, controls, entryKey, invalidate, onEntryFramed])

  useEffect(() => {
    if (!(controls && cellFrame) || fitTrigger === lastFitRef.current) return
    lastFitRef.current = fitTrigger

    let cancelled = false
    let innerId = 0
    const outerId = requestAnimationFrame(() => {
      if (cancelled) return
      innerId = requestAnimationFrame(() => {
        if (cancelled) return
        frameInitialView(cellFrame, controls, camera, true)
        invalidate()
        onFitFramed?.()
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(outerId)
      cancelAnimationFrame(innerId)
    }
  }, [camera, cellFrame, fitTrigger, invalidate, controls, onFitFramed])

  return null
}

type CellFrame = {
  center: Vector3
  size: Vector3
}

function computeCellFrame(nodes: Record<string, unknown>): CellFrame {
  const sceneNodes = nodes as Record<string, CellStructureNode>
  const structure = resolveCellStructure(sceneNodes)
  const stackNode = structure.stackId ? sceneNodes[structure.stackId] : null
  if (stackNode?.type !== 'stack') return createDefaultCellFrame()

  const context = resolveCellStackContext(nodes, stackNode as never)
  if (!context) return createDefaultCellFrame()

  const cathodeCollector = context.templates['cathode-current-collector'].node as {
    cc_p_tab_length?: number
    cc_p_tab_width?: number
  }
  const anodeCollector = context.templates['anode-current-collector'].node as {
    cc_n_tab_length?: number
    cc_n_tab_width?: number
  }
  const tabLengthM =
    mmToMeters(Math.max(cathodeCollector.cc_p_tab_length ?? 0, 0)) +
    mmToMeters(Math.max(anodeCollector.cc_n_tab_length ?? 0, 0))
  const widestTabM = mmToMeters(
    Math.max(cathodeCollector.cc_p_tab_width ?? 0, anodeCollector.cc_n_tab_width ?? 0, 0),
  )
  const lengthM = mmToMeters(context.cell.electrode_length) + tabLengthM
  const widthM = Math.max(mmToMeters(context.cell.electrode_width), widestTabM)
  const heightM = Math.max(
    mmToMeters(totalStackHeight(context.thicknessInput)),
    MIN_VISIBLE_CELL_HEIGHT_M,
  )

  return {
    center: new Vector3(0, heightM / 2, 0),
    size: new Vector3(Math.max(lengthM, 1e-4), heightM, Math.max(widthM, 1e-4)),
  }
}

function createDefaultCellFrame(): CellFrame {
  return {
    center: new Vector3(0, MIN_VISIBLE_CELL_HEIGHT_M / 2, 0),
    size: DEFAULT_CELL_FRAME_SIZE.clone(),
  }
}

function frameInitialView(
  frame: CellFrame,
  controls: CameraControlsImpl,
  camera: Camera,
  enableTransition: boolean,
) {
  const { center, size } = frame
  const radius = Math.max(size.x, size.z, size.y * 8, 0.35)
  const nextPosition = center
    .clone()
    .addScaledVector(ISO_DIRECTION, radius * ENTRY_CAMERA_DISTANCE_MULTIPLIER)

  camera.position.copy(nextPosition)
  camera.up.set(0, 1, 0)
  camera.lookAt(center)

  void controls.setLookAt?.(
    nextPosition.x,
    nextPosition.y,
    nextPosition.z,
    center.x,
    center.y,
    center.z,
    enableTransition,
  )

  if (camera instanceof OrthographicCamera) {
    camera.near = CELL_ORTHOGRAPHIC_NEAR
    camera.far = CELL_ORTHOGRAPHIC_FAR
    const paddedWidth = Math.max(size.x * INITIAL_FRAME_PADDING, MIN_VISIBLE_FRAME_WIDTH_M)
    const paddedHeight = Math.max(size.z * INITIAL_FRAME_PADDING, MIN_VISIBLE_FRAME_HEIGHT_M)
    const baseWidth = camera.right - camera.left
    const baseHeight = camera.top - camera.bottom
    const zoomForWidth = baseWidth / paddedWidth
    const zoomForHeight = baseHeight / paddedHeight
    const nextZoom = Math.min(zoomForWidth, zoomForHeight)

    camera.zoom = Math.max(nextZoom, 1)
    camera.updateProjectionMatrix()
    void controls.zoomTo?.(camera.zoom, enableTransition)
  }
}
