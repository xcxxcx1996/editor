import { describe, expect, test } from 'bun:test'
import {
  draftFromForm,
  goalCreateSchema,
  goalPatchSchema,
} from './design-goal-schema'

describe('goalCreateSchema', () => {
  test('accepts a valid draft', () => {
    const parsed = goalCreateSchema.parse({
      constraints: {
        metric: 'dcir',
        operator: 'lt',
        value: 1.5,
        unit: 'mOhm',
      },
      label: 'Low-temp DCIR',
      work_condition: {
        mode: 'discharge',
        rate: '1C',
        soc_pct: 50,
        temperature_c: 25,
      },
    })

    expect(parsed.constraints.metric).toBe('dcir')
    expect(parsed.work_condition.temperature_c).toBe(25)
  })

  test('rejects unknown metrics', () => {
    const result = goalCreateSchema.safeParse({
      constraints: {
        metric: 'flubber_index',
        operator: 'lt',
        value: 1,
      },
      label: 'Bad metric',
      work_condition: {},
    })

    expect(result.success).toBe(false)
  })

  test('rejects passthrough keys on nested objects', () => {
    const result = goalCreateSchema.safeParse({
      constraints: {
        metric: 'dcir',
        operator: 'lt',
        value: 1,
        extra: true,
      },
      label: 'Extra field',
      work_condition: {},
    })

    expect(result.success).toBe(false)
  })
})

describe('goalPatchSchema', () => {
  test('requires at least one field', () => {
    const result = goalPatchSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('accepts a partial label patch', () => {
    const result = goalPatchSchema.safeParse({ label: 'Renamed goal' })
    expect(result.success).toBe(true)
  })
})

describe('draftFromForm', () => {
  test('normalizes metric casing and trims strings', () => {
    const draft = draftFromForm({
      baseline: '',
      cutoff_voltage_v: '',
      label: '  Room-temp DCIR  ',
      metric: ' DCIR ',
      mode: 'discharge',
      operator: 'lt',
      protocol: '',
      rate: '1C',
      soc_pct: '50',
      temperature_c: '25',
      unit: ' mOhm ',
      value: '1.5',
    })

    expect(draft.label).toBe('Room-temp DCIR')
    expect(draft.constraints.metric).toBe('dcir')
    expect(draft.constraints.unit).toBe('mOhm')
    expect(draft.work_condition.temperature_c).toBe(25)
  })

  test('throws for unsupported metrics', () => {
    expect(() =>
      draftFromForm({
        baseline: '',
        cutoff_voltage_v: '',
        label: 'Bad metric',
        metric: 'flubber_index',
        mode: 'discharge',
        operator: 'lt',
        protocol: '',
        rate: '1C',
        soc_pct: '50',
        temperature_c: '25',
        unit: '',
        value: '1',
      }),
    ).toThrow('Unknown metric')
  })
})
