import { describe, expect, test } from 'bun:test'
import {
  designGoalsReducer,
  initialDesignGoalsState,
  sortGoals,
} from './design-goals-state'
import type { DesignGoal } from './design-goal-schema'

const baseGoal = {
  constraints: {
    metric: 'dcir' as const,
    operator: 'lt' as const,
    value: 1.5,
    unit: 'mOhm',
  },
  created_at: '2026-01-02T00:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  label: 'Low-temp DCIR',
  project_id: '22222222-2222-4222-8222-222222222222',
  sort_order: 1,
  updated_at: '2026-01-02T00:00:00.000Z',
  user_id: '33333333-3333-4333-8333-333333333333',
  work_condition: { mode: 'discharge' as const, temperature_c: 25 },
}

const secondGoal: DesignGoal = {
  ...baseGoal,
  created_at: '2026-01-01T00:00:00.000Z',
  id: '44444444-4444-4444-8444-444444444444',
  label: 'Capacity retention',
  sort_order: 0,
  constraints: {
    metric: 'capacity_retention_pct',
    operator: 'gte',
    value: 80,
    unit: '%',
  },
}

describe('sortGoals', () => {
  test('orders by sort_order then created_at', () => {
    expect(sortGoals([baseGoal, secondGoal]).map((goal) => goal.id)).toEqual([
      secondGoal.id,
      baseGoal.id,
    ])
  })
})

describe('designGoalsReducer', () => {
  test('load lifecycle replaces goals and clears loading', () => {
    let state = designGoalsReducer(initialDesignGoalsState, { type: 'load_start' })
    expect(state.loading).toBe(true)

    state = designGoalsReducer(state, { type: 'load_success', goals: [baseGoal] })
    expect(state.loading).toBe(false)
    expect(state.goals).toHaveLength(1)
    expect(state.error).toBeNull()
  })

  test('merge_created appends without entering loading', () => {
    const ready = { error: null, goals: [secondGoal], loading: false }
    const state = designGoalsReducer(ready, { type: 'merge_created', goal: baseGoal })

    expect(state.loading).toBe(false)
    expect(state.goals.map((goal) => goal.id)).toEqual([secondGoal.id, baseGoal.id])
  })

  test('merge_updated replaces a single row', () => {
    const ready = { error: null, goals: [baseGoal], loading: false }
    const updated = { ...baseGoal, label: 'Renamed goal' }
    const state = designGoalsReducer(ready, { type: 'merge_updated', goal: updated })

    expect(state.goals[0]?.label).toBe('Renamed goal')
  })

  test('merge_deleted removes the row locally', () => {
    const ready = { error: null, goals: [secondGoal, baseGoal], loading: false }
    const state = designGoalsReducer(ready, { type: 'merge_deleted', goalId: baseGoal.id })

    expect(state.goals).toEqual([secondGoal])
  })

  test('merge_created_many appends all rows in one pass', () => {
    const ready = { error: null, goals: [], loading: false }
    const state = designGoalsReducer(ready, {
      type: 'merge_created_many',
      goals: [secondGoal, baseGoal],
    })

    expect(state.goals.map((goal) => goal.id)).toEqual([secondGoal.id, baseGoal.id])
  })
})
