'use client'

import { type AnyNodeId, useRegistry, useScene } from '@pascal-app/core'
import { NodeRenderer, useNodeEvents } from '@pascal-app/viewer'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, type Group } from 'three'
import { totalStackHeight } from '@/src/lib/derived'
import {
  EXPLODED_LAYER_GAP_MM,
  useExplodedPresentation,
  usePresentationThicknessScale,
} from '@/src/lib/presentation/thickness'
import {
  resolveCellGraphFromStack,
  templateIdsFromGraph,
} from '@/src/lib/cell-graph/resolve'
import { buildStackLayout, computePresentationStackSpanMm } from '@/src/lib/stack-layout'
import { mmToMeters } from '@/src/lib/units'
import type { StackNode } from '@/src/plugin/stack/schema'
import type { CellNode } from './schema'

const ELECTROLYTE_LOW_CONCENTRATION = new Color('#80e5ff')
const ELECTROLYTE_HIGH_CONCENTRATION = new Color('#146bdc')
const ELECTROLYTE_IN_LENGTH_OFFSET_MM = 4
const ELECTROLYTE_REAL_STACK_OVERHANG_MM = 2
const ELECTROLYTE_EXAGGERATED_STACK_OVERHANG_MM = 10
const ELECTROLYTE_VOLUME_X_SEGMENTS = 48
const ELECTROLYTE_VOLUME_Z_SEGMENTS = 48
const OUTER_SOLID_HEIGHT_RATIO = 0.2
const OUTER_SOLID_OVERHANG_MM = 3
const OUTER_SOLID_BOTTOM_OFFSET_MM = 0.5
const OUTER_SOLID_WAVE_AMPLITUDE_MM = 2
const OUTER_SOLID_WAVE_SEGMENTS = 48
const OUTER_SOLID_COLOR = '#2f80ed'

type RippleProfile = {
  longAmplitude: number
  longFrequency: number
  longSpeed: number
  widthAmplitude: number
  widthFrequency: number
  widthSpeed: number
  crossAmplitude: number
  crossFrequency: number
  crossSpeed: number
}

const REAL_THICKNESS_RIPPLE: RippleProfile = {
  longAmplitude: 0.0015,
  longFrequency: 22,
  longSpeed: 1.2,
  widthAmplitude: 0.0015,
  widthFrequency: 34,
  widthSpeed: 1.2,
  crossAmplitude: 0.00018,
  crossFrequency: 14,
  crossSpeed: 0.35,
}

const EXAGGERATED_THICKNESS_RIPPLE: RippleProfile = {
  longAmplitude: 0.008,
  longFrequency: 34,
  longSpeed: 1.2,
  widthAmplitude: 0.008,
  widthFrequency: 48,
  widthSpeed: 1.2,
  crossAmplitude: 0.001,
  crossFrequency: 20,
  crossSpeed: 0.5,
}

function electrolyteColor(concentration: number) {
  const strength = Math.min(Math.max(concentration / 3.5, 0), 1)
  return ELECTROLYTE_LOW_CONCENTRATION.clone().lerp(ELECTROLYTE_HIGH_CONCENTRATION, strength)
}

function electrolyteStrength(concentration: number) {
  return Math.min(Math.max(concentration / 3.5, 0), 1)
}

function outerSolidTopY(baseHeightM: number, amplitudeM: number, ratio: number) {
  return Math.max(1e-4, baseHeightM + Math.sin(ratio * Math.PI * 2) * amplitudeM)
}

function createOuterSolidGeometry(
  stackSpanM: number,
  lengthM: number,
  bottomY: number,
  heightM: number,
) {
  const halfX = stackSpanM / 2
  const halfZ = lengthM / 2
  const amplitudeM = mmToMeters(OUTER_SOLID_WAVE_AMPLITUDE_MM)
  const positions: number[] = []
  const indices: number[] = []
  const segments = OUTER_SOLID_WAVE_SEGMENTS

  function addVertex(x: number, y: number, z: number) {
    const index = positions.length / 3
    positions.push(x, y, z)
    return index
  }

  const bottomLeft: number[] = []
  const bottomRight: number[] = []
  const topLeft: number[] = []
  const topRight: number[] = []

  for (let index = 0; index <= segments; index += 1) {
    const ratio = index / segments
    const z = -halfZ + ratio * lengthM
    const topY = outerSolidTopY(heightM, amplitudeM, ratio)
    bottomLeft.push(addVertex(-halfX, bottomY, z))
    bottomRight.push(addVertex(halfX, bottomY, z))
    topLeft.push(addVertex(-halfX, topY, z))
    topRight.push(addVertex(halfX, topY, z))
  }

  for (let index = 0; index < segments; index += 1) {
    indices.push(bottomLeft[index]!, bottomLeft[index + 1]!, bottomRight[index]!)
    indices.push(bottomRight[index]!, bottomLeft[index + 1]!, bottomRight[index + 1]!)

    indices.push(topLeft[index]!, topRight[index]!, topLeft[index + 1]!)
    indices.push(topRight[index]!, topRight[index + 1]!, topLeft[index + 1]!)

    indices.push(bottomLeft[index]!, topLeft[index]!, bottomLeft[index + 1]!)
    indices.push(topLeft[index]!, topLeft[index + 1]!, bottomLeft[index + 1]!)

    indices.push(bottomRight[index]!, bottomRight[index + 1]!, topRight[index]!)
    indices.push(topRight[index]!, bottomRight[index + 1]!, topRight[index + 1]!)
  }

  const frontBottomLeft = bottomLeft[0]!
  const frontBottomRight = bottomRight[0]!
  const frontTopLeft = topLeft[0]!
  const frontTopRight = topRight[0]!
  const backBottomLeft = bottomLeft[segments]!
  const backBottomRight = bottomRight[segments]!
  const backTopLeft = topLeft[segments]!
  const backTopRight = topRight[segments]!

  indices.push(frontBottomLeft, frontBottomRight, frontTopLeft)
  indices.push(frontTopLeft, frontBottomRight, frontTopRight)
  indices.push(backBottomLeft, backTopLeft, backBottomRight)
  indices.push(backTopLeft, backTopRight, backBottomRight)

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function electrolyteSurfaceY(
  x: number,
  z: number,
  stackSpanM: number,
  lengthM: number,
  baseY: number,
  profile: RippleProfile,
  time: number,
) {
  const edgeDistance = Math.max(Math.abs(x) / (stackSpanM / 2), Math.abs(z) / (lengthM / 2))
  const edgeFade = Math.max(0, Math.min(1, (1 - edgeDistance) * 4))
  const longWave =
    Math.sin(x * profile.longFrequency + z * 6 + time * profile.longSpeed) * profile.longAmplitude
  const widthWave =
    Math.sin(z * profile.widthFrequency + x * 8 - time * profile.widthSpeed) *
    profile.widthAmplitude
  const crossWave =
    Math.sin(
      x * profile.crossFrequency - z * profile.crossFrequency * 1.7 - time * profile.crossSpeed,
    ) * profile.crossAmplitude

  return Math.max(1e-4, baseY + (longWave + widthWave + crossWave) * edgeFade)
}

function createElectrolyteVolumeGeometry(
  stackSpanM: number,
  lengthM: number,
  surfaceY: number,
  profile: RippleProfile,
) {
  const xSegments = ELECTROLYTE_VOLUME_X_SEGMENTS
  const zSegments = ELECTROLYTE_VOLUME_Z_SEGMENTS
  const positions: number[] = []
  const indices: number[] = []

  const topIndex = (xIndex: number, zIndex: number) => zIndex * (xSegments + 1) + xIndex
  const bottomOffset = (xSegments + 1) * (zSegments + 1)
  const bottomIndex = (xIndex: number, zIndex: number) => bottomOffset + topIndex(xIndex, zIndex)

  for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
    const zRatio = zIndex / zSegments
    const z = (zRatio - 0.5) * lengthM
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xRatio = xIndex / xSegments
      const x = (xRatio - 0.5) * stackSpanM
      positions.push(x, electrolyteSurfaceY(x, z, stackSpanM, lengthM, surfaceY, profile, 0), z)
    }
  }

  for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
    const zRatio = zIndex / zSegments
    const z = (zRatio - 0.5) * lengthM
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xRatio = xIndex / xSegments
      const x = (xRatio - 0.5) * stackSpanM
      positions.push(x, 0, z)
    }
  }

  for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      const topA = topIndex(xIndex, zIndex)
      const topB = topIndex(xIndex + 1, zIndex)
      const topC = topIndex(xIndex, zIndex + 1)
      const topD = topIndex(xIndex + 1, zIndex + 1)
      const bottomA = bottomIndex(xIndex, zIndex)
      const bottomB = bottomIndex(xIndex + 1, zIndex)
      const bottomC = bottomIndex(xIndex, zIndex + 1)
      const bottomD = bottomIndex(xIndex + 1, zIndex + 1)

      indices.push(topA, topB, topC, topC, topB, topD)
      indices.push(bottomA, bottomC, bottomB, bottomB, bottomC, bottomD)
    }
  }

  for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
    indices.push(
      bottomIndex(0, zIndex),
      topIndex(0, zIndex),
      bottomIndex(0, zIndex + 1),
      topIndex(0, zIndex),
      topIndex(0, zIndex + 1),
      bottomIndex(0, zIndex + 1),
      bottomIndex(xSegments, zIndex),
      bottomIndex(xSegments, zIndex + 1),
      topIndex(xSegments, zIndex),
      topIndex(xSegments, zIndex),
      bottomIndex(xSegments, zIndex + 1),
      topIndex(xSegments, zIndex + 1),
    )
  }

  for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
    indices.push(
      bottomIndex(xIndex, 0),
      bottomIndex(xIndex + 1, 0),
      topIndex(xIndex, 0),
      topIndex(xIndex, 0),
      bottomIndex(xIndex + 1, 0),
      topIndex(xIndex + 1, 0),
      bottomIndex(xIndex, zSegments),
      topIndex(xIndex, zSegments),
      bottomIndex(xIndex + 1, zSegments),
      topIndex(xIndex, zSegments),
      topIndex(xIndex + 1, zSegments),
      bottomIndex(xIndex + 1, zSegments),
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function updateElectrolyteVolumeGeometry(
  geometry: BufferGeometry,
  stackSpanM: number,
  lengthM: number,
  surfaceY: number,
  profile: RippleProfile,
  time: number,
) {
  const position = geometry.attributes.position
  if (!position) return

  for (let zIndex = 0; zIndex <= ELECTROLYTE_VOLUME_Z_SEGMENTS; zIndex += 1) {
    const zRatio = zIndex / ELECTROLYTE_VOLUME_Z_SEGMENTS
    const z = (zRatio - 0.5) * lengthM
    for (let xIndex = 0; xIndex <= ELECTROLYTE_VOLUME_X_SEGMENTS; xIndex += 1) {
      const xRatio = xIndex / ELECTROLYTE_VOLUME_X_SEGMENTS
      const x = (xRatio - 0.5) * stackSpanM
      const index = zIndex * (ELECTROLYTE_VOLUME_X_SEGMENTS + 1) + xIndex
      position.setY(index, electrolyteSurfaceY(x, z, stackSpanM, lengthM, surfaceY, profile, time))
    }
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}

function OuterSolidBody({
  node,
  stackSpanMm,
  stackCenterMm,
}: {
  node: CellNode
  stackSpanMm: number
  stackCenterMm: number
}) {
  const handlers = useNodeEvents(node as never, 'cell' as never)
  const stackSpanM = mmToMeters(stackSpanMm + OUTER_SOLID_OVERHANG_MM * 2)
  const stackCenterM = mmToMeters(stackCenterMm)
  const lengthM = mmToMeters(
    node.electrode_length + ELECTROLYTE_IN_LENGTH_OFFSET_MM + OUTER_SOLID_OVERHANG_MM * 2,
  )
  const bottomY = mmToMeters(-OUTER_SOLID_BOTTOM_OFFSET_MM)
  const heightM = mmToMeters(node.electrode_width * OUTER_SOLID_HEIGHT_RATIO)
  const geometry = useMemo(
    () => createOuterSolidGeometry(stackSpanM, lengthM, bottomY, heightM),
    [bottomY, heightM, lengthM, stackSpanM],
  )

  if (node.electrode_width <= 0 || stackSpanMm <= 0) return null

  return (
    <mesh position={[stackCenterM, 0, 0]} renderOrder={6} {...handlers}>
      <primitive attach="geometry" object={geometry} />
      <meshBasicMaterial color={OUTER_SOLID_COLOR} depthTest depthWrite side={DoubleSide} />
    </mesh>
  )
}

function ElectrolyteBody({
  node,
  stackSpanMm,
  stackCenterMm,
  rippleProfile,
}: {
  node: CellNode
  stackSpanMm: number
  stackCenterMm: number
  rippleProfile: RippleProfile
}) {
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
  const surfaceY = mmToMeters(node.electrode_width * levelRatio)
  const lengthM = mmToMeters(node.electrode_length + ELECTROLYTE_IN_LENGTH_OFFSET_MM)
  const stackSpanM = mmToMeters(stackSpanMm)
  const stackCenterM = mmToMeters(stackCenterMm)
  const volumeGeometry = useMemo(
    () => createElectrolyteVolumeGeometry(stackSpanM, lengthM, surfaceY, rippleProfile),
    [lengthM, rippleProfile, stackSpanM, surfaceY],
  )

  useFrame(({ clock }) => {
    if (node.electrode_width <= 0 || levelRatio <= 0) return
    updateElectrolyteVolumeGeometry(
      volumeGeometry,
      stackSpanM,
      lengthM,
      surfaceY,
      rippleProfile,
      clock.elapsedTime,
    )
  })

  if (node.electrode_width <= 0 || levelRatio <= 0) return null

  return (
    <mesh position={[stackCenterM, 0, 0]} renderOrder={4}>
      <primitive attach="geometry" object={volumeGeometry} />
      <meshBasicMaterial
        color={color}
        depthTest
        depthWrite={false}
        opacity={opacity.surface}
        side={DoubleSide}
        transparent
      />
    </mesh>
  )
}

const CellRenderer = ({ node }: { node: CellNode }) => {
  const ref = useRef<Group>(null!)
  const nodes = useScene((s) => s.nodes)
  useRegistry(node.id, 'cell', ref)

  const stackId = node.children?.[0]
  const stackNode = stackId ? (nodes[stackId as AnyNodeId] as StackNode | undefined) : undefined
  const stackContext = useMemo(
    () => (stackNode ? resolveCellGraphFromStack(nodes as Record<string, unknown>, stackNode) : null),
    [nodes, stackNode],
  )
  const stackHeightMm = stackContext ? totalStackHeight(stackContext.thicknessInput) : 0
  const thicknessScale = usePresentationThicknessScale()
  const exploded = useExplodedPresentation()
  const stackSpan = useMemo(() => {
    if (!stackContext) return { centerMm: 0, spanMm: stackHeightMm }
    const layers = buildStackLayout(
      templateIdsFromGraph(stackContext),
      stackContext.thicknessInput,
    )
    return computePresentationStackSpanMm(
      layers,
      thicknessScale,
      exploded ? EXPLODED_LAYER_GAP_MM : 0,
    )
  }, [exploded, stackContext, stackHeightMm, thicknessScale])
  const stackOverhangMm =
    thicknessScale > 1
      ? ELECTROLYTE_EXAGGERATED_STACK_OVERHANG_MM
      : ELECTROLYTE_REAL_STACK_OVERHANG_MM
  const electrolyteStackSpanMm = stackSpan.spanMm + stackOverhangMm * 2
  const rippleProfile = thicknessScale > 1 ? EXAGGERATED_THICKNESS_RIPPLE : REAL_THICKNESS_RIPPLE

  return (
    <group ref={ref}>
      {stackId ? <NodeRenderer nodeId={stackId as AnyNodeId} /> : null}
      <OuterSolidBody
        node={node}
        stackCenterMm={stackSpan.centerMm}
        stackSpanMm={electrolyteStackSpanMm}
      />
      <ElectrolyteBody
        node={node}
        rippleProfile={rippleProfile}
        stackCenterMm={stackSpan.centerMm}
        stackSpanMm={electrolyteStackSpanMm}
      />
    </group>
  )
}

export default CellRenderer
