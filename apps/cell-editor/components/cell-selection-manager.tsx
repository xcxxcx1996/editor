'use client'

import {
  type AnyNodeId,
  emitter,
  getSelectableKinds,
  type NodeEvent,
  sceneRegistry,
  useScene,
} from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import {
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  type Material,
  type Mesh,
  type Object3D,
} from 'three'
import { type CellStructureNode, resolveCellStructure } from '@/src/lib/cell-structure'

const CELL_KINDS = [
  'cell',
  'stack',
  'cathode',
  'anode',
  'separator',
  'cathode-current-collector',
  'anode-current-collector',
] as const

const EDGE_OVERLAY_NAME = 'cell-selection-edge-overlay'
const SELECTION_FILL = new Color('#864fff')
const DIMMED_OPACITY = 0.18

type EditableMaterial = Material & {
  color?: Color
  emissive?: Color
  emissiveIntensity?: number
  opacity?: number
  transparent?: boolean
  needsUpdate?: boolean
}

function isHighlightableMesh(object: Object3D): object is Mesh {
  return Boolean((object as Mesh).isMesh && (object as Mesh).material && object.visible)
}

function cloneSelectedMaterial(material: Material): Material {
  const highlightedMaterial = material.clone() as EditableMaterial

  if (highlightedMaterial.color instanceof Color) {
    highlightedMaterial.color = highlightedMaterial.color.clone().lerp(SELECTION_FILL, 0.72)
  }

  if (highlightedMaterial.emissive instanceof Color) {
    highlightedMaterial.emissive = highlightedMaterial.emissive.clone().lerp(SELECTION_FILL, 0.85)
    highlightedMaterial.emissiveIntensity = Math.max(
      highlightedMaterial.emissiveIntensity ?? 0,
      0.42,
    )
  }

  highlightedMaterial.needsUpdate = true
  return highlightedMaterial
}

function cloneDimmedMaterial(material: Material): Material {
  const dimmedMaterial = material.clone() as EditableMaterial
  dimmedMaterial.transparent = true
  dimmedMaterial.opacity = Math.min(dimmedMaterial.opacity ?? 1, DIMMED_OPACITY)
  dimmedMaterial.needsUpdate = true
  return dimmedMaterial
}

function disposeMaterialSet(material: Material | Material[]) {
  if (Array.isArray(material)) {
    for (const entry of material) entry.dispose()
    return
  }
  material.dispose()
}

function mapMaterials(
  material: Material | Material[],
  mapper: (material: Material) => Material,
): Material | Material[] {
  if (Array.isArray(material)) return material.map(mapper)
  return mapper(material)
}

function OutlinerSync() {
  const selection = useViewer((s) => s.selection)
  const hoveredId = useViewer((s) => s.hoveredId)
  const outliner = useViewer((s) => s.outliner)
  const nodes = useScene((s) => s.nodes)

  useEffect(() => {
    outliner.selectedObjects.length = 0
    for (const id of selection.selectedIds) {
      const obj = sceneRegistry.nodes.get(id)
      if (obj) outliner.selectedObjects.push(obj)
    }

    outliner.hoveredObjects.length = 0
    if (hoveredId) {
      const obj = sceneRegistry.nodes.get(hoveredId)
      if (obj) outliner.hoveredObjects.push(obj)
    }
  }, [selection, hoveredId, outliner, nodes])

  return null
}

function SelectionMaterialSync() {
  const nodes = useScene((s) => s.nodes)
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const materialMapRef = useRef(
    new Map<
      Mesh,
      {
        edgeOverlay?: LineSegments
        originalMaterial: Material | Material[]
        replacementMaterial: Material | Material[]
      }
    >(),
  )

  const restoreMaterials = useCallback(() => {
    for (const [mesh, entry] of materialMapRef.current.entries()) {
      if (mesh.material === entry.replacementMaterial) {
        mesh.material = entry.originalMaterial
      }
      if (entry.edgeOverlay) {
        mesh.remove(entry.edgeOverlay)
        entry.edgeOverlay.geometry.dispose()
        ;(entry.edgeOverlay.material as LineBasicMaterial).dispose()
      }
      disposeMaterialSet(entry.replacementMaterial)
    }
    materialMapRef.current.clear()
  }, [])

  const syncMaterials = useCallback(() => {
    restoreMaterials()

    const structure = resolveCellStructure(nodes as unknown as Record<string, CellStructureNode>)
    const componentIds = Object.values(structure.components).filter((value): value is string =>
      Boolean(value),
    )
    if (!selectedId || !componentIds.includes(selectedId)) return

    for (const componentId of componentIds) {
      const rootObject = sceneRegistry.nodes.get(componentId)
      if (!rootObject) continue

      const mode = componentId === selectedId ? 'selected' : 'dimmed'
      rootObject.traverse((child) => {
        if (!isHighlightableMesh(child)) return
        const originalMaterial = child.material
        const replacementMaterial = mapMaterials(
          originalMaterial,
          mode === 'selected' ? cloneSelectedMaterial : cloneDimmedMaterial,
        )
        child.material = replacementMaterial
        const edgeOverlay = mode === 'selected' ? createEdgeOverlay(child) : undefined
        if (edgeOverlay) {
          child.add(edgeOverlay)
        }
        materialMapRef.current.set(child, {
          edgeOverlay,
          originalMaterial,
          replacementMaterial,
        })
      })
    }
  }, [nodes, restoreMaterials, selectedId])

  useEffect(() => {
    syncMaterials()
    return restoreMaterials
  }, [restoreMaterials, syncMaterials])

  return null
}

function createEdgeOverlay(mesh: Mesh) {
  const geometry = mesh.geometry
  if (!geometry) return undefined

  const overlay = new LineSegments(
    new EdgesGeometry(geometry, 20),
    new LineBasicMaterial({
      color: '#111111',
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.82,
    }),
  )

  overlay.name = EDGE_OVERLAY_NAME
  overlay.renderOrder = 3
  overlay.scale.setScalar(1.0005)
  overlay.raycast = () => null
  return overlay
}

export function CellSelectionManager() {
  const { gl } = useThree()
  const clickHandledRef = useRef(false)
  const dragSuppressClickRef = useRef(false)
  const pointerStateRef = useRef({ active: false, x: 0, y: 0 })

  useEffect(() => {
    const subscribedKinds = [
      ...CELL_KINDS,
      ...getSelectableKinds().filter((kind) => !(CELL_KINDS as readonly string[]).includes(kind)),
    ]

    const onEnter = (event: NodeEvent) => {
      event.stopPropagation()
      useViewer.setState({ hoveredId: event.node.id as AnyNodeId })
    }

    const onLeave = (event: NodeEvent) => {
      event.stopPropagation()
      useViewer.setState({ hoveredId: null })
    }

    const onClick = (event: NodeEvent) => {
      event.stopPropagation()
      clickHandledRef.current = true
      useViewer.getState().setSelection({ selectedIds: [event.node.id as AnyNodeId] })
      useViewer.setState({ hoveredId: null })
    }

    for (const type of subscribedKinds) {
      emitter.on(`${type}:enter` as never, onEnter as never)
      emitter.on(`${type}:leave` as never, onLeave as never)
      emitter.on(`${type}:click` as never, onClick as never)
    }

    return () => {
      for (const type of subscribedKinds) {
        emitter.off(`${type}:enter` as never, onEnter as never)
        emitter.off(`${type}:leave` as never, onLeave as never)
        emitter.off(`${type}:click` as never, onClick as never)
      }
      useViewer.setState({ hoveredId: null })
    }
  }, [])

  useEffect(() => {
    const DRAG_THRESHOLD_PX = 3

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      pointerStateRef.current = { active: true, x: event.clientX, y: event.clientY }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerStateRef.current.active) return
      const dx = event.clientX - pointerStateRef.current.x
      const dy = event.clientY - pointerStateRef.current.y
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        dragSuppressClickRef.current = true
      }
    }

    const handlePointerUp = () => {
      pointerStateRef.current.active = false
    }

    const handleCanvasClick = (event: MouseEvent) => {
      const viewerState = useViewer.getState()
      if (viewerState.cameraDragging || viewerState.inputDragging) return
      if (event.button !== 0) return

      requestAnimationFrame(() => {
        if (dragSuppressClickRef.current) {
          dragSuppressClickRef.current = false
          clickHandledRef.current = false
          return
        }
        if (clickHandledRef.current) {
          clickHandledRef.current = false
          return
        }
        useViewer.getState().resetSelection()
        useViewer.setState({ hoveredId: null })
      })
    }

    const canvas = gl.domElement
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)
    canvas.addEventListener('click', handleCanvasClick)
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      canvas.removeEventListener('click', handleCanvasClick)
    }
  }, [gl])

  return (
    <>
      <OutlinerSync />
      <SelectionMaterialSync />
    </>
  )
}
