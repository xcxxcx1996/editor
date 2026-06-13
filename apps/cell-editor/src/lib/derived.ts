/** mass_loading (g/m^2) / density (g/cm^3 -> g/m^3) -> metres; x1000 -> mm. */
export function cathodeCoatingThickness(massLoadingGm2: number, densityGcm3: number): number {
  if (densityGcm3 <= 0) return 0
  return (massLoadingGm2 / (densityGcm3 * 1_000_000)) * 1000
}

export function anodeCoatingThickness(massLoadingGm2: number, densityGcm3: number): number {
  return cathodeCoatingThickness(massLoadingGm2, densityGcm3)
}

export type StackThicknessInput = {
  numberOfLayers: number
  cathodeMassLoading: number
  cathodeDensity: number
  anodeMassLoading: number
  anodeDensity: number
  separatorThickness: number
  ccPThickness: number
  ccNThickness: number
}

export function layerThicknessMm(kind: string, input: StackThicknessInput): number {
  switch (kind) {
    case 'cathode':
      return cathodeCoatingThickness(input.cathodeMassLoading, input.cathodeDensity)
    case 'anode':
      return anodeCoatingThickness(input.anodeMassLoading, input.anodeDensity)
    case 'separator':
      return input.separatorThickness
    case 'cathode-current-collector':
      return input.ccPThickness
    case 'anode-current-collector':
      return input.ccNThickness
    default:
      return 0
  }
}

export function totalStackHeight(input: StackThicknessInput): number {
  let height = 0
  const n = Math.max(1, Math.floor(input.numberOfLayers))

  for (let repeat = 0; repeat < n; repeat += 1) {
    const unitOrder = [
      'anode-current-collector',
      'anode',
      'separator',
      'cathode',
      'cathode-current-collector',
      'cathode',
      'separator',
      'anode',
      'anode-current-collector',
    ] as const
    for (const kind of repeat === 0 ? unitOrder : unitOrder.slice(1)) {
      height += layerThicknessMm(kind, input)
    }
  }
  return height
}
