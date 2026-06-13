import { describe, expect, test } from 'bun:test'
import { STACK_UNIT_ORDER } from './layer-order'
import { buildStackLayout, buildStackPresentationLayout } from './stack-layout'

const templateIds = {
  cathode: 'cathode_1',
  separator: 'separator_1',
  anode: 'anode_1',
  'cathode-current-collector': 'cc_p_1',
  'anode-current-collector': 'cc_n_1',
}

const input = {
  numberOfLayers: 2,
  cathodeMassLoading: 200,
  cathodeDensity: 2.1,
  anodeMassLoading: 200,
  anodeDensity: 1.3,
  separatorThickness: 0.0078,
  ccPThickness: 0.013,
  ccNThickness: 0.006,
}

describe('buildStackLayout', () => {
  test('shares the anode collector between repeated electrochemical units', () => {
    const layout = buildStackLayout(templateIds, input)
    const unitCount =
      STACK_UNIT_ORDER.length + (STACK_UNIT_ORDER.length - 1) * (input.numberOfLayers - 1)
    expect(layout).toHaveLength(unitCount)
  })

  test('layer order matches ADR-0003 within one repeat', () => {
    const layout = buildStackLayout(templateIds, { ...input, numberOfLayers: 1 })
    const kinds = layout.map((layer) => layer.kind)
    expect(kinds).toEqual([...STACK_UNIT_ORDER])
  })

  test('layers grow upward from Y=0', () => {
    const layout = buildStackLayout(templateIds, input)
    const minY = Math.min(...layout.map((layer) => layer.centerYMm - layer.thicknessMm / 2)) ?? 0
    const maxY = Math.max(...layout.map((layer) => layer.centerYMm + layer.thicknessMm / 2)) ?? 0
    expect(minY).toBeCloseTo(0, 6)
    expect(maxY).toBeGreaterThan(0)
  })

  test('does not create adjacent duplicate anode current collectors at repeat boundaries', () => {
    const layout = buildStackLayout(templateIds, { ...input, numberOfLayers: 3 })
    const kinds = layout.map((layer) => layer.kind)

    for (let index = 1; index < kinds.length; index += 1) {
      expect([kinds[index - 1], kinds[index]]).not.toEqual([
        'anode-current-collector',
        'anode-current-collector',
      ])
    }
  })

  test('presentation scaling does not mutate physical thickness values', () => {
    const layout = buildStackLayout(templateIds, input)
    const presented = buildStackPresentationLayout(layout, 20)

    expect(presented[0]?.thicknessMm).toBe((layout[0]?.thicknessMm ?? 0) * 20)
    expect(layout[0]?.centerYMm).not.toBe(presented[0]?.centerYMm)
  })

  test('exploded presentation adds gap by global layer order', () => {
    const layout = buildStackLayout(templateIds, { ...input, numberOfLayers: 1 })
    const presented = buildStackPresentationLayout(layout, 1, 2)

    expect(presented[0]?.centerYMm).toBeCloseTo(layout[0]?.centerYMm ?? 0, 6)
    expect(presented[1]?.centerYMm).toBeCloseTo((layout[1]?.centerYMm ?? 0) + 2, 6)
    expect(presented[2]?.centerYMm).toBeCloseTo((layout[2]?.centerYMm ?? 0) + 4, 6)
  })
})
