import { describe, expect, test } from 'bun:test'
import { anodeCoatingThickness, cathodeCoatingThickness, totalStackHeight } from './derived'

describe('derived thickness', () => {
  test('cathode coating thickness from mass loading and density (mm)', () => {
    expect(cathodeCoatingThickness(200, 2_100_000)).toBeCloseTo((200 / 2_100_000) * 1000)
  })

  test('anode coating thickness matches cathode formula', () => {
    expect(anodeCoatingThickness(100, 1_500_000)).toBeCloseTo((100 / 1_500_000) * 1000)
  })

  test('total stack height scales with N', () => {
    const base = {
      numberOfLayers: 1,
      cathodeMassLoading: 200,
      cathodeDensity: 2_100_000,
      anodeMassLoading: 100,
      anodeDensity: 1_500_000,
      separatorThickness: 0.0078,
      ccPThickness: 0.013,
      ccNThickness: 0.006,
    }

    const oneLayer = totalStackHeight(base)
    const twoLayers = totalStackHeight({ ...base, numberOfLayers: 2 })

    expect(twoLayers).toBeCloseTo(oneLayer * 2, 6)
  })
})
