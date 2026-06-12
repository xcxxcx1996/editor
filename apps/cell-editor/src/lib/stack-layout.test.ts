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
  cathodeDensity: 2_100_000,
  anodeMassLoading: 100,
  anodeDensity: 1_500_000,
  separatorThickness: 0.0078,
  ccPThickness: 0.013,
  ccNThickness: 0.006,
}

describe('buildStackLayout', () => {
  test('repeats the full electrochemical stack unit N times', () => {
    const layout = buildStackLayout(templateIds, input)
    const unitCount = STACK_UNIT_ORDER.length * input.numberOfLayers
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

  test('presentation scaling does not mutate physical thickness values', () => {
    const layout = buildStackLayout(templateIds, input)
    const presented = buildStackPresentationLayout(layout, 20)

    expect(presented[0]?.thicknessMm).toBe((layout[0]?.thicknessMm ?? 0) * 20)
    expect(layout[0]?.centerYMm).not.toBe(presented[0]?.centerYMm)
  })
})
