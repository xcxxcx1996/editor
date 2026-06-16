import type { CellComponentKind } from '../cell-graph/structure-types'
import { STACK_UNIT_ORDER, type StackLayerKind } from '../cell-graph/layer-order'
import { layerThicknessMm, type StackThicknessInput } from './derived'

export type PhysicalLayer = {
  kind: StackLayerKind
  templateId: string
  thicknessMm: number
  centerXMm: number
  orderIndex: number
}

export function buildStackLayout(
  templateIds: Record<CellComponentKind, string>,
  input: StackThicknessInput,
): PhysicalLayer[] {
  const layers: Omit<PhysicalLayer, 'centerXMm' | 'orderIndex'>[] = []
  const n = Math.max(1, Math.floor(input.numberOfLayers))

  for (let repeat = 0; repeat < n; repeat += 1) {
    const unitOrder = repeat === 0 ? STACK_UNIT_ORDER : STACK_UNIT_ORDER.slice(1)
    for (const kind of unitOrder) {
      layers.push({
        kind,
        templateId: templateIds[kind],
        thicknessMm: layerThicknessMm(kind, input),
      })
    }
  }

  const totalThicknessMm = layers.reduce((sum, layer) => sum + layer.thicknessMm, 0)
  let cursor = -totalThicknessMm / 2

  return layers.map((layer, orderIndex) => {
    const centerXMm = cursor + layer.thicknessMm / 2
    cursor += layer.thicknessMm
    return { ...layer, centerXMm, orderIndex }
  })
}

export function buildStackPresentationLayout(
  layers: PhysicalLayer[],
  thicknessScale: number,
  explodedGapMm = 0,
  totalLayerCount = layers.length,
): PhysicalLayer[] {
  const explosionCenterOffsetMm = ((totalLayerCount - 1) * explodedGapMm) / 2
  return layers.map((layer) => ({
    ...layer,
    thicknessMm: layer.thicknessMm * thicknessScale,
    centerXMm:
      layer.centerXMm * thicknessScale + layer.orderIndex * explodedGapMm - explosionCenterOffsetMm,
  }))
}

export function computePresentationStackSpanMm(
  layers: PhysicalLayer[],
  thicknessScale: number,
  explodedGapMm = 0,
): { spanMm: number; centerMm: number } {
  const presentationLayers = buildStackPresentationLayout(layers, thicknessScale, explodedGapMm)
  if (presentationLayers.length === 0) return { centerMm: 0, spanMm: 0 }

  const minX = Math.min(
    ...presentationLayers.map((layer) => layer.centerXMm - layer.thicknessMm / 2),
  )
  const maxX = Math.max(
    ...presentationLayers.map((layer) => layer.centerXMm + layer.thicknessMm / 2),
  )

  return {
    centerMm: (minX + maxX) / 2,
    spanMm: Math.max(0, maxX - minX),
  }
}
