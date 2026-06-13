import { describe, expect, test } from 'bun:test'
import { LAYER_COLORS } from './colors'

describe('LAYER_COLORS', () => {
  test('uses the cell component color palette', () => {
    expect(LAYER_COLORS).toEqual({
      cathode: '#f5e7c6',
      anode: '#222222',
      separator: '#e0f2fe',
      'cathode-current-collector': '#757575',
      'anode-current-collector': '#fa8112',
    })
  })
})
