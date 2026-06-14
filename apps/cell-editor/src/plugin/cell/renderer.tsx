'use client'

import { type AnyNodeId, useRegistry, useScene } from '@pascal-app/core'
import { NodeRenderer, useNodeEvents } from '@pascal-app/viewer'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, DoubleSide, type Group, PlaneGeometry } from 'three'
import { totalStackHeight } from '@/src/lib/derived'
import {
  EXPLODED_LAYER_GAP_MM,
  useExplodedPresentation,
  usePresentationThicknessScale,
} from '@/src/lib/presentation-thickness'
import { resolveCellStackContext } from '@/src/lib/resolve-templates'
import { buildStackLayout, computePresentationStackSpanMm } from '@/src/lib/stack-layout'
import { mmToMeters } from '@/src/lib/units'
import type { StackNode } from '@/src/plugin/stack/schema'
import type { CellNode } from './schema'

const ELECTROLYTE_LOW_CONCENTRATION = new Color('#80e5ff')
const ELECTROLYTE_HIGH_CONCENTRATION = new Color('#146bdc')
const ELECTROLYTE_IN_LENGTH_OFFSET_MM = 10
const ELECTROLYTE_REAL_STACK_OVERHANG_MM = 2
const ELECTROLYTE_EXAGGERATED_STACK_OVERHANG_MM = 10
const ELECTROLYTE_SURFACE_CLEARANCE_M = 0.0006

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
  longAmplitude: 0.001,
  longFrequency: 22,
  longSpeed: 0.65,
  widthAmplitude: 0.001,
  widthFrequency: 34,
  widthSpeed: 0.65,
  crossAmplitude: 0.00018,
  crossFrequency: 14,
  crossSpeed: 0.35,
}

const EXAGGERATED_THICKNESS_RIPPLE: RippleProfile = {
  longAmplitude: 0.004,
  longFrequency: 34,
  longSpeed: 0.8,
  widthAmplitude: 0.004,
  widthFrequency: 48,
  widthSpeed: 0.65,
  crossAmplitude: 0.001,
  crossFrequency: 20,
  crossSpeed: 0.5,
}

function electrolyteColor(concentration: number) {
  const strength = Math.min(Math.max(concentration / 5, 0), 1)
  return ELECTROLYTE_LOW_CONCENTRATION.clone().lerp(ELECTROLYTE_HIGH_CONCENTRATION, strength)
}

function electrolyteStrength(concentration: number) {
  return Math.min(Math.max(concentration / 5, 0), 1)
}

function createRippleSurfaceGeometry(stackSpanM: number, lengthM: number, profile: RippleProfile) {
  const geometry = new PlaneGeometry(Math.max(stackSpanM, 1e-4), Math.max(lengthM, 1e-4), 192, 96)
  updateRippleSurfaceGeometry(geometry, stackSpanM, lengthM, profile, 0)
  return geometry
}

function updateRippleSurfaceGeometry(
  geometry: PlaneGeometry,
  stackSpanM: number,
  lengthM: number,
  profile: RippleProfile,
  time: number,
) {
  const position = geometry.attributes.position
  if (!position) return

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const edgeDistance = Math.max(Math.abs(x) / (stackSpanM / 2), Math.abs(y) / (lengthM / 2))
    const edgeFade = Math.max(0, Math.min(1, (1 - edgeDistance) * 4))
    const longWave =
      Math.sin(x * profile.longFrequency + y * 6 + time * profile.longSpeed) * profile.longAmplitude
    const widthWave =
      Math.sin(y * profile.widthFrequency + x * 8 - time * profile.widthSpeed) *
      profile.widthAmplitude
    const crossWave =
      Math.sin(
        x * profile.crossFrequency - y * profile.crossFrequency * 1.7 - time * profile.crossSpeed,
      ) * profile.crossAmplitude
    position.setZ(index, (longWave + widthWave + crossWave) * edgeFade)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
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
  const surfaceY = mmToMeters(node.electrode_width * levelRatio)
  const lengthM = mmToMeters(node.electrode_length + ELECTROLYTE_IN_LENGTH_OFFSET_MM)
  const stackSpanM = mmToMeters(stackSpanMm)
  const stackCenterM = mmToMeters(stackCenterMm)
  const volumeHeightM = Math.max(surfaceY - ELECTROLYTE_SURFACE_CLEARANCE_M, 1e-4)
  const volumeCenterY = volumeHeightM / 2
  const surfaceGeometry = useMemo(
    () => createRippleSurfaceGeometry(stackSpanM, lengthM, rippleProfile),
    [lengthM, rippleProfile, stackSpanM],
  )

  useFrame(({ clock }) => {
    if (node.electrode_width <= 0 || levelRatio <= 0) return
    updateRippleSurfaceGeometry(
      surfaceGeometry,
      stackSpanM,
      lengthM,
      rippleProfile,
      clock.elapsedTime,
    )
  })

  if (node.electrode_width <= 0 || levelRatio <= 0) return null

  return (
    <group>
      <mesh position={[stackCenterM, volumeCenterY, 0]} renderOrder={4} {...handlers}>
        <boxGeometry args={[Math.max(stackSpanM, 1e-4), volumeHeightM, Math.max(lengthM, 1e-4)]} />
        <meshBasicMaterial
          color={color}
          depthTest
          depthWrite={false}
          opacity={opacity.volume}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <group
        position={[stackCenterM, surfaceY + 1e-5, 0]}
        renderOrder={5}
        rotation={[-Math.PI / 2, 0, 0]}
      >
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
  const thicknessScale = usePresentationThicknessScale()
  const exploded = useExplodedPresentation()
  const stackSpan = useMemo(() => {
    if (!stackContext) return { centerMm: 0, spanMm: stackHeightMm }
    const layers = buildStackLayout(
      {
        cathode: stackContext.templates.cathode.id,
        separator: stackContext.templates.separator.id,
        anode: stackContext.templates.anode.id,
        'cathode-current-collector': stackContext.templates['cathode-current-collector'].id,
        'anode-current-collector': stackContext.templates['anode-current-collector'].id,
      },
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
