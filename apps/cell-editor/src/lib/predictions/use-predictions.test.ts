import { describe, expect, test } from 'bun:test'
import { getDefaultSimulationScheme, parseSimulationResult } from './use-predictions'

const metrics = [
  {
    data: [{ t: 0, value: 3.7 }],
    id: 'voltage',
    kind: 'time-series' as const,
    label: 'Voltage',
    unit: 'V',
  },
]

describe('parseSimulationResult', () => {
  test('wraps the legacy flat result as a single-point scheme', () => {
    const fallbackCellDesign = { cell: { electrode_length: 120 } }
    const parsed = parseSimulationResult(
      {
        condition: '25 C',
        duration: 60,
        id: 'legacy-job',
        label: 'Legacy result',
        metrics,
      },
      fallbackCellDesign,
    )

    expect(parsed.task_type).toBe('single_point')
    expect(parsed.schemes).toHaveLength(1)
    expect(parsed.schemes[0]?.id).toBe('legacy-job')
    expect(parsed.schemes[0]?.cell_design).toBe(fallbackCellDesign)
  })

  test('accepts a multi-scheme spatial search result', () => {
    const parsed = parseSimulationResult({
      duration: 90,
      schemes: [
        {
          cell_design: { id: 'b' },
          id: 'scheme-b',
          label: 'Higher loading',
          metrics,
          parameters: { cathode_mass_loading: 12.5 },
          rank: 2,
        },
        {
          cell_design: { id: 'a' },
          id: 'scheme-a',
          label: 'Balanced',
          metrics,
          parameters: { cathode_mass_loading: 10.2 },
          rank: 1,
        },
      ],
      task_type: 'spatial_search',
      version: 1,
    })

    expect(parsed.task_type).toBe('spatial_search')
    expect(parsed.schemes).toHaveLength(2)
    expect(getDefaultSimulationScheme(parsed)?.id).toBe('scheme-a')
  })

  test('rejects spatial search results without schemes', () => {
    expect(() =>
      parseSimulationResult({
        schemes: [],
        task_type: 'spatial_search',
      }),
    ).toThrow('Spatial search result JSON has no schemes.')
  })
})
