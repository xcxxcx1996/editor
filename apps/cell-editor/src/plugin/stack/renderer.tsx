'use client'

import { useRegistry, useScene } from '@pascal-app/core'
import { createDefaultMaterial, glassMaterial, useNodeEvents, useViewer } from '@pascal-app/viewer'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { LAYER_COLORS } from '@/src/lib/colors'
import {
  EXPLODED_LAYER_GAP_MM,
  useExplodedPresentation,
  usePresentationThicknessScale,
} from '@/src/lib/presentation-thickness'
import { resolveCellStackContext } from '@/src/lib/resolve-templates'
import {
  buildStackLayout,
  buildStackPresentationLayout,
  type PhysicalLayer,
} from '@/src/lib/stack-layout'
import { mmToMeters } from '@/src/lib/units'
import type { StackNode } from './schema'

const SEPARATOR_LENGTH_OVERHANG_MM = 5

type TemplateNode = {
  id: string
  type: string
  node: unknown
}

type CollectorTabGeometry = {
  lengthMm: number
  widthMm: number
  yCoordinateMm: number
  xSign: 1 | -1
}

function resolveCollectorTabGeometry(
  template: TemplateNode,
  defaultYCoordinateMm: number,
): CollectorTabGeometry | null {
  const node = template.node as Record<string, unknown>
  if (template.type === 'cathode-current-collector') {
    return {
      lengthMm: typeof node.cc_p_tab_length === 'number' ? node.cc_p_tab_length : 30,
      widthMm: typeof node.cc_p_tab_width === 'number' ? node.cc_p_tab_width : 80,
      yCoordinateMm:
        typeof node.cc_p_tab_y_coordinate === 'number'
          ? node.cc_p_tab_y_coordinate
          : defaultYCoordinateMm,
      xSign: 1,
    }
  }

  if (template.type === 'anode-current-collector') {
    return {
      lengthMm: typeof node.cc_n_tab_length === 'number' ? node.cc_n_tab_length : 30,
      widthMm: typeof node.cc_n_tab_width === 'number' ? node.cc_n_tab_width : 80,
      yCoordinateMm:
        typeof node.cc_n_tab_y_coordinate === 'number'
          ? node.cc_n_tab_y_coordinate
          : defaultYCoordinateMm,
      xSign: -1,
    }
  }

  return null
}

function TemplateLayerGroup({
  template,
  layers,
  lengthM,
  cellWidthMm,
  widthM,
}: {
  template: TemplateNode
  layers: PhysicalLayer[]
  lengthM: number
  cellWidthMm: number
  widthM: number
}) {
  const ref = useRef<Group>(null!)
  const shading = useViewer((s) => s.shading)
  const thicknessScale = usePresentationThicknessScale()
  const exploded = useExplodedPresentation()
  useRegistry(template.id, template.type, ref)
  const handlers = useNodeEvents(template as never, template.type as never)
  const presentationLayers = useMemo(
    () =>
      buildStackPresentationLayout(layers, thicknessScale, exploded ? EXPLODED_LAYER_GAP_MM : 0),
    [exploded, layers, thicknessScale],
  )
  const tabGeometry = useMemo(
    () => resolveCollectorTabGeometry(template, cellWidthMm / 2),
    [cellWidthMm, template],
  )

  const material = useMemo(
    () =>
      layers[0]?.kind === 'separator'
        ? glassMaterial
        : createDefaultMaterial(LAYER_COLORS[layers[0]?.kind ?? 'cathode'], 0.55, shading),
    [layers, shading],
  )

  return (
    <group ref={ref}>
      {presentationLayers.map((layer, index) => {
        const thicknessM = mmToMeters(layer.thicknessMm)
        const centerY = mmToMeters(layer.centerYMm)
        const layerLengthM =
          layer.kind === 'separator' ? lengthM + mmToMeters(SEPARATOR_LENGTH_OVERHANG_MM) : lengthM
        const tabLengthM = tabGeometry ? mmToMeters(tabGeometry.lengthMm) : 0
        const tabWidthM = tabGeometry ? mmToMeters(tabGeometry.widthMm) : 0
        const tabCenterX = tabGeometry ? tabGeometry.xSign * (lengthM / 2 + tabLengthM / 2) : 0
        const tabCenterZ = tabGeometry ? mmToMeters(tabGeometry.yCoordinateMm - cellWidthMm / 2) : 0
        return (
          <group key={`${layer.kind}-${index}`}>
            <mesh position={[0, centerY, 0]} {...handlers}>
              <boxGeometry
                args={[
                  Math.max(layerLengthM, 1e-4),
                  Math.max(thicknessM, 1e-4),
                  Math.max(widthM, 1e-4),
                ]}
              />
              <primitive attach="material" object={material} />
            </mesh>
            {tabGeometry && tabGeometry.lengthMm >= 1 && (
              <mesh position={[tabCenterX, centerY, tabCenterZ]} {...handlers}>
                <boxGeometry
                  args={[
                    Math.max(tabLengthM, 1e-4),
                    Math.max(thicknessM, 1e-4),
                    Math.max(tabWidthM, 1e-4),
                  ]}
                />
                <primitive attach="material" object={material} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

const StackRenderer = ({ node }: { node: StackNode }) => {
  const nodes = useScene((s) => s.nodes)
  const context = useMemo(
    () => resolveCellStackContext(nodes as Record<string, unknown>, node),
    [nodes, node],
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
          template: { id: templateEntry.id, node: templateEntry.node, type: layer.kind },
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
          cellWidthMm={context.cell.electrode_width}
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
