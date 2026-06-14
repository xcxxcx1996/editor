import { describe, expect, test } from 'bun:test'
import {
  EXAGGERATED_THICKNESS_SCALE,
  getExplodedPresentation,
  getPresentationThicknessScale,
  REAL_THICKNESS_SCALE,
  setExplodedPresentation,
  setPresentationThicknessScale,
  toggleExplodedPresentation,
  togglePresentationThicknessScale,
} from './presentation-thickness'
import { buildStackLayout, buildStackPresentationLayout } from './stack-layout'

const templateIds = {
  cathode: 'cathode_1',
  separator: 'separator_1',
  anode: 'anode_1',
  'cathode-current-collector': 'cc_p_1',
  'anode-current-collector': 'cc_n_1',
}

const input = {
  numberOfLayers: 1,
  cathodeMassLoading: 200,
  cathodeDensity: 2.1,
  anodeMassLoading: 200,
  anodeDensity: 1.3,
  separatorThickness: 0.0078,
  ccPThickness: 0.013,
  ccNThickness: 0.006,
}

describe('presentation thickness', () => {
  test('toggles between real thickness and X x 20', () => {
    setPresentationThicknessScale(EXAGGERATED_THICKNESS_SCALE)
    expect(getPresentationThicknessScale()).toBe(EXAGGERATED_THICKNESS_SCALE)
    togglePresentationThicknessScale()
    expect(getPresentationThicknessScale()).toBe(REAL_THICKNESS_SCALE)
  })

  test('leaves physical stack layout unchanged while scaling presentation layout', () => {
    const physical = buildStackLayout(templateIds, input)
    const presented = buildStackPresentationLayout(physical, EXAGGERATED_THICKNESS_SCALE)

    expect(presented[0]?.thicknessMm).toBe(
      (physical[0]?.thicknessMm ?? 0) * EXAGGERATED_THICKNESS_SCALE,
    )
    expect(physical[0]?.centerXMm).not.toBe(presented[0]?.centerXMm)
  })

  test('toggles exploded presentation independently of thickness scale', () => {
    setPresentationThicknessScale(EXAGGERATED_THICKNESS_SCALE)
    setExplodedPresentation(false)

    toggleExplodedPresentation()

    expect(getExplodedPresentation()).toBe(true)
    expect(getPresentationThicknessScale()).toBe(EXAGGERATED_THICKNESS_SCALE)
  })
})
