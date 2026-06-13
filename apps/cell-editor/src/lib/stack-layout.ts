import { layerThicknessMm, type StackThicknessInput } from './derived'
import { STACK_UNIT_ORDER, type StackLayerKind } from './layer-order'

export type PhysicalLayer = {
  kind: StackLayerKind
  templateId: string
  thicknessMm: number
  centerYMm: number
  orderIndex: number
}

export function buildStackLayout(
  templateIds: Record<StackLayerKind, string>,
  input: StackThicknessInput,
): PhysicalLayer[] {
  const layers: Omit<PhysicalLayer, 'centerYMm' | 'orderIndex'>[] = []
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

  let cursor = 0

  return layers.map((layer, orderIndex) => {
    const centerYMm = cursor + layer.thicknessMm / 2
    cursor += layer.thicknessMm
    return { ...layer, centerYMm, orderIndex }
  })
}

export function buildStackPresentationLayout(
  layers: PhysicalLayer[],
  thicknessScale: number,
  explodedGapMm = 0,
): PhysicalLayer[] {
  return layers.map((layer) => ({
    ...layer,
    thicknessMm: layer.thicknessMm * thicknessScale,
    centerYMm: layer.centerYMm * thicknessScale + layer.orderIndex * explodedGapMm,
  }))
}
