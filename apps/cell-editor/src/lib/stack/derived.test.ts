import { describe, expect, test } from 'bun:test'
import { anodeCoatingThickness, cathodeCoatingThickness, totalStackHeight } from './derived'

describe('derived thickness', () => {
  test('cathode coating thickness from mass loading and density (mm)', () => {
    expect(cathodeCoatingThickness(500, 2.1)).toBeCloseTo((500 / 2_100_000) * 1000)
  })

  test('anode coating thickness matches cathode formula', () => {
    expect(anodeCoatingThickness(200, 1.3)).toBeCloseTo((200 / 1_300_000) * 1000)
  })

  test('total stack height scales with N', () => {
    const base = {
      numberOfLayers: 1,
      cathodeMassLoading: 200,
      cathodeDensity: 2.1,
      anodeMassLoading: 200,
      anodeDensity: 1.3,
      separatorThickness: 0.0078,
      ccPThickness: 0.013,
      ccNThickness: 0.006,
    }

    const oneLayer = totalStackHeight(base)
    const twoLayers = totalStackHeight({ ...base, numberOfLayers: 2 })

    expect(twoLayers).toBeCloseTo(oneLayer * 2 - base.ccNThickness, 6)
  })
})
