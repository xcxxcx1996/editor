import { describe, expect, test } from 'bun:test'
import { STACK_UNIT_ORDER } from './layer-order'
import {
  buildStackLayout,
  buildStackPresentationLayout,
  computePresentationStackSpanMm,
} from './stack-layout'

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

  test('layers are centered around X=0', () => {
    const layout = buildStackLayout(templateIds, input)
    const minX = Math.min(...layout.map((layer) => layer.centerXMm - layer.thicknessMm / 2)) ?? 0
    const maxX = Math.max(...layout.map((layer) => layer.centerXMm + layer.thicknessMm / 2)) ?? 0
    expect(minX).toBeLessThan(0)
    expect(maxX).toBeGreaterThan(0)
    expect(minX).toBeCloseTo(-maxX, 6)
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
    expect(layout[0]?.centerXMm).not.toBe(presented[0]?.centerXMm)
  })

  test('exploded presentation adds gap by global layer order', () => {
    const layout = buildStackLayout(templateIds, { ...input, numberOfLayers: 1 })
    const presented = buildStackPresentationLayout(layout, 1, 2)

    const explosionCenterOffsetMm = ((layout.length - 1) * 2) / 2

    expect(presented[0]?.centerXMm).toBeCloseTo(
      (layout[0]?.centerXMm ?? 0) - explosionCenterOffsetMm,
      6,
    )
    expect(presented[1]?.centerXMm).toBeCloseTo(
      (layout[1]?.centerXMm ?? 0) + 2 - explosionCenterOffsetMm,
      6,
    )
    expect(presented[2]?.centerXMm).toBeCloseTo(
      (layout[2]?.centerXMm ?? 0) + 4 - explosionCenterOffsetMm,
      6,
    )
  })

  test('exploded presentation uses global layer count for grouped template subsets', () => {
    const layout = buildStackLayout(templateIds, { ...input, numberOfLayers: 2 })
    const groupedCathodes = layout.filter((layer) => layer.kind === 'cathode')
    const presented = buildStackPresentationLayout(groupedCathodes, 1, 2, layout.length)
    const explosionCenterOffsetMm = ((layout.length - 1) * 2) / 2

    for (const [index, layer] of groupedCathodes.entries()) {
      expect(presented[index]?.centerXMm).toBeCloseTo(
        layer.centerXMm + layer.orderIndex * 2 - explosionCenterOffsetMm,
        6,
      )
    }
  })

  test('presentation span includes X thickness scaling and exploded gaps', () => {
    const layout = buildStackLayout(templateIds, { ...input, numberOfLayers: 1 })
    const physicalSpan = computePresentationStackSpanMm(layout, 1, 0)
    const presentedSpan = computePresentationStackSpanMm(layout, 20, 2)
    const expectedExplodedGap = (layout.length - 1) * 2

    expect(presentedSpan.spanMm).toBeCloseTo(physicalSpan.spanMm * 20 + expectedExplodedGap, 6)
    expect(physicalSpan.centerMm).toBeCloseTo(0, 6)
    expect(presentedSpan.centerMm).toBeCloseTo(0, 6)
  })
})
