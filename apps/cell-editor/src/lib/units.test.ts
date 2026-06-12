import { describe, expect, test } from 'bun:test'
import { mmToMeters } from './units'

describe('mmToMeters', () => {
  test('converts millimetres to metres', () => {
    expect(mmToMeters(1000)).toBe(1)
    expect(mmToMeters(0.013)).toBeCloseTo(0.000013)
  })
})
