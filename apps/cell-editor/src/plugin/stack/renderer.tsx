'use client'

import { useRegistry, useScene } from '@pascal-app/core'
import { createDefaultMaterial, useNodeEvents, useViewer } from '@pascal-app/viewer'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { LAYER_COLORS } from '@/src/lib/colors'
import { usePresentationThicknessScale } from '@/src/lib/presentation-thickness'
import { resolveCellStackContext } from '@/src/lib/resolve-templates'
import {
  buildStackLayout,
  buildStackPresentationLayout,
  type PhysicalLayer,
} from '@/src/lib/stack-layout'
import { mmToMeters } from '@/src/lib/units'
import type { StackNode } from './schema'

type TemplateNode = {
  id: string
  type: string
}

function TemplateLayerGroup({
  template,
  layers,
  lengthM,
  widthM,
}: {
  template: TemplateNode
  layers: PhysicalLayer[]
  lengthM: number
  widthM: number
}) {
  const ref = useRef<Group>(null!)
  const shading = useViewer((s) => s.shading)
  const thicknessScale = usePresentationThicknessScale()
  useRegistry(template.id, template.type, ref)
  const handlers = useNodeEvents(template as never, template.type as never)
  const presentationLayers = useMemo(
    () => buildStackPresentationLayout(layers, thicknessScale),
    [layers, thicknessScale],
  )

  const material = useMemo(
    () => createDefaultMaterial(LAYER_COLORS[layers[0]?.kind ?? 'cathode'], 0.55, shading),
    [layers, shading],
  )

  return (
    <group ref={ref}>
      {presentationLayers.map((layer, index) => {
        const thicknessM = mmToMeters(layer.thicknessMm)
        const centerY = mmToMeters(layer.centerYMm)
        return (
          <mesh key={`${layer.kind}-${index}`} position={[0, centerY, 0]} {...handlers}>
            <boxGeometry
              args={[Math.max(lengthM, 1e-4), Math.max(thicknessM, 1e-4), Math.max(widthM, 1e-4)]}
            />
            <primitive attach="material" object={material} />
          </mesh>
        )
      })}
    </group>
  )
}

const StackRenderer = ({ node }: { node: StackNode }) => {
  const nodes = useScene((s) => s.nodes)
  const cellLength = useScene((s) => {
    const cellId = node.parentId
    if (!cellId) return 0
    const cell = s.nodes[cellId as keyof typeof s.nodes] as
      | { electrode_length?: number }
      | undefined
    return cell?.electrode_length ?? 0
  })
  const cellWidth = useScene((s) => {
    const cellId = node.parentId
    if (!cellId) return 0
    const cell = s.nodes[cellId as keyof typeof s.nodes] as { electrode_width?: number } | undefined
    return cell?.electrode_width ?? 0
  })
  const stackLayers = useScene((s) => {
    const n = s.nodes[node.id as keyof typeof s.nodes] as StackNode | undefined
    return n?.number_of_layers ?? 1
  })
  const templateFingerprint = useScene((s) => {
    const childIds = node.children ?? []
    return childIds
      .map((id) => {
        const child = s.nodes[id as keyof typeof s.nodes]
        return child ? JSON.stringify(child) : ''
      })
      .join('|')
  })

  const context = useMemo(
    () => resolveCellStackContext(nodes as Record<string, unknown>, node),
    [nodes, node, cellLength, cellWidth, stackLayers, templateFingerprint],
  )

  const layout = useMemo(() => {
    if (!context) return []
    return buildStackLayout(
      {
        cathode: context.templates.cathode.id,
        separator: context.templates.separator.id,
        anode: context.templates.anode.id,
        'cathode-current-collector': context.templates['cathode-current-collector'].id,
        'anode-current-collector': context.templates['anode-current-collector'].id,
      },
      context.thicknessInput,
    )
  }, [context])

  const layersByTemplate = useMemo(() => {
    const grouped = new Map<string, { template: TemplateNode; layers: PhysicalLayer[] }>()
    if (!context) return grouped

    for (const layer of layout) {
      const templateEntry = context.templates[layer.kind]
      const existing = grouped.get(templateEntry.id)
      if (existing) {
        existing.layers.push(layer)
      } else {
        grouped.set(templateEntry.id, {
          template: { id: templateEntry.id, type: layer.kind },
          layers: [layer],
        })
      }
    }
    return grouped
  }, [context, layout])

  if (!context) return null

  const lengthM = mmToMeters(context.cell.electrode_length)
  const widthM = mmToMeters(context.cell.electrode_width)

  return (
    <group name={`stack-${node.id}`}>
      {Array.from(layersByTemplate.values()).map(({ template, layers }) => (
        <TemplateLayerGroup
          key={template.id}
          layers={layers}
          lengthM={lengthM}
          template={template}
          widthM={widthM}
        />
      ))}
    </group>
  )
}

export default StackRenderer
