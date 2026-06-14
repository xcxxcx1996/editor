'use client'

import { type AnyNodeId, useRegistry, useScene } from '@pascal-app/core'
import { NodeRenderer, useNodeEvents } from '@pascal-app/viewer'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, DoubleSide, type Group, PlaneGeometry } from 'three'
import { totalStackHeight } from '@/src/lib/derived'
import {
  isPresentationThicknessExaggerated,
  usePresentationThicknessScale,
} from '@/src/lib/presentation-thickness'
import { resolveCellStackContext } from '@/src/lib/resolve-templates'
import { mmToMeters } from '@/src/lib/units'
import type { StackNode } from '@/src/plugin/stack/schema'
import type { CellNode } from './schema'

const ELECTROLYTE_LOW_CONCENTRATION = new Color('#80e5ff')
const ELECTROLYTE_HIGH_CONCENTRATION = new Color('#146bdc')
const ELECTROLYTE_BOTTOM_OFFSET_MM = 0.02
const ELECTROLYTE_IN_LENGTH_OFFSET_MM = 10
const ELECTROLYTE_IN_WIDTH_OFFSET_MM = 10

function electrolyteColor(concentration: number) {
  const strength = Math.min(Math.max(concentration / 5, 0), 1)
  return ELECTROLYTE_LOW_CONCENTRATION.clone().lerp(ELECTROLYTE_HIGH_CONCENTRATION, strength)
}

function electrolyteStrength(concentration: number) {
  return Math.min(Math.max(concentration / 5, 0), 1)
}

function createRippleSurfaceGeometry(lengthM: number, widthM: number) {
  const geometry = new PlaneGeometry(Math.max(lengthM, 1e-4), Math.max(widthM, 1e-4), 96, 48)
  updateRippleSurfaceGeometry(geometry, lengthM, widthM, 0)
  return geometry
}

function updateRippleSurfaceGeometry(
  geometry: PlaneGeometry,
  lengthM: number,
  widthM: number,
  time: number,
) {
  const position = geometry.attributes.position
  if (!position) return

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const edgeDistance = Math.max(Math.abs(x) / (lengthM / 2), Math.abs(y) / (widthM / 2))
    const edgeFade = Math.max(0, Math.min(1, (1 - edgeDistance) * 4))
    const longWave = Math.sin(x * 95 + y * 18 + time * 1.2) * 0.0026
    const widthWave = Math.sin(y * 180 + x * 22 - time * 1.05) * 0.0026
    const crossWave = Math.sin(x * 37 - y * 92 - time * 0.85) * 0.0014
    position.setZ(index, (longWave + widthWave + crossWave) * edgeFade)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}

function ElectrolyteBody({ heightMm, node }: { heightMm: number; node: CellNode }) {
  const thicknessScale = usePresentationThicknessScale()
  const handlers = useNodeEvents(node as never, 'cell' as never)
  const color = useMemo(
    () => electrolyteColor(node.electrolyte_concentration),
    [node.electrolyte_concentration],
  )
  const opacity = useMemo(() => {
    const strength = electrolyteStrength(node.electrolyte_concentration)
    return {
      surface: 0.38 + strength * 0.36,
      volume: 0.08 + strength * 0.16,
    }
  }, [node.electrolyte_concentration])

  const levelRatio = Math.min(Math.max(node.electrolyte_level_ratio, 0), 1)
  const bottomY = mmToMeters(-ELECTROLYTE_BOTTOM_OFFSET_MM * thicknessScale)
  const surfaceY = mmToMeters(heightMm * thicknessScale * levelRatio)
  const lengthM = mmToMeters(node.electrode_length + ELECTROLYTE_IN_LENGTH_OFFSET_MM)
  const widthM = mmToMeters(node.electrode_width + ELECTROLYTE_IN_WIDTH_OFFSET_MM)
  const volumeHeightM = Math.max(surfaceY - bottomY, 1e-4)
  const volumeCenterY = bottomY + volumeHeightM / 2
  const surfaceGeometry = useMemo(
    () => createRippleSurfaceGeometry(lengthM, widthM),
    [lengthM, widthM],
  )

  useFrame(({ clock }) => {
    if (!isPresentationThicknessExaggerated(thicknessScale) || heightMm <= 0 || levelRatio <= 0) {
      return
    }
    updateRippleSurfaceGeometry(surfaceGeometry, lengthM, widthM, clock.elapsedTime)
  })

  if (!isPresentationThicknessExaggerated(thicknessScale) || heightMm <= 0 || levelRatio <= 0) {
    return null
  }

  return (
    <group>
      <mesh position={[0, volumeCenterY, 0]} renderOrder={4} {...handlers}>
        <boxGeometry args={[Math.max(lengthM, 1e-4), volumeHeightM, Math.max(widthM, 1e-4)]} />
        <meshBasicMaterial
          color={color}
          depthTest
          depthWrite={false}
          opacity={opacity.volume}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <group position={[0, surfaceY + 1e-5, 0]} renderOrder={5} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh {...handlers}>
          <primitive attach="geometry" object={surfaceGeometry} />
          <meshBasicMaterial
            color={color}
            depthTest
            depthWrite={false}
            opacity={opacity.surface}
            side={DoubleSide}
            transparent
          />
        </mesh>
      </group>
    </group>
  )
}

const CellRenderer = ({ node }: { node: CellNode }) => {
  const ref = useRef<Group>(null!)
  const nodes = useScene((s) => s.nodes)
  useRegistry(node.id, 'cell', ref)

  const stackId = node.children?.[0]
  const stackNode = stackId ? (nodes[stackId as AnyNodeId] as StackNode | undefined) : undefined
  const stackContext = useMemo(
    () => (stackNode ? resolveCellStackContext(nodes as Record<string, unknown>, stackNode) : null),
    [nodes, stackNode],
  )
  const stackHeightMm = stackContext ? totalStackHeight(stackContext.thicknessInput) : 0

  return (
    <group ref={ref}>
      {stackId ? <NodeRenderer nodeId={stackId as AnyNodeId} /> : null}
      <ElectrolyteBody heightMm={stackHeightMm} node={node} />
    </group>
  )
}

export default CellRenderer
