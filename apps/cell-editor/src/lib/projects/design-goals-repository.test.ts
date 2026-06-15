import { describe, expect, test } from 'bun:test'
import { createSupabaseGoalsRepository } from './design-goals-repository'

const PROJECT_ID = '22222222-2222-4222-8222-222222222222'
const GOAL_ID = '11111111-1111-4111-8111-111111111111'
const CREATED_GOAL_ID = '33333333-3333-4333-8333-333333333333'
const USER_ID = '44444444-4444-4444-8444-444444444444'

type Row = Record<string, unknown>

function createMockSupabase(options?: {
  rows?: Row[]
  userId?: string | null
}) {
  const rows = [...(options?.rows ?? [])]
  const userId = options?.userId === undefined ? USER_ID : options.userId

  const supabase = {
    auth: {
      async getUser() {
        if (!userId) {
          return { data: { user: null }, error: { message: 'unauthorized' } }
        }
        return { data: { user: { id: userId } }, error: null }
      },
    },
    from(table: string) {
      if (table !== 'design_goal') {
        throw new Error(`Unexpected table: ${table}`)
      }

      const filters: Record<string, string> = {}
      let mutation: 'delete' | 'insert' | 'select' | 'update' = 'select'
      let insertPayload: Row | null = null
      let updatePayload: Row | null = null

      const builder = {
        delete() {
          mutation = 'delete'
          return builder
        },
        eq(column: string, value: string) {
          filters[column] = value
          return builder
        },
        insert(payload: Row) {
          mutation = 'insert'
          insertPayload = payload
          return builder
        },
        order(column: string, { ascending }: { ascending: boolean }) {
          rows.sort((left, right) => {
            const leftValue = String(left[column] ?? '')
            const rightValue = String(right[column] ?? '')
            return ascending
              ? leftValue.localeCompare(rightValue)
              : rightValue.localeCompare(leftValue)
          })
          return builder
        },
        select() {
          return builder
        },
        async single() {
          if (mutation === 'insert' && insertPayload) {
            const created = {
              ...insertPayload,
              created_at: '2026-01-01T00:00:00.000Z',
              id: CREATED_GOAL_ID,
              updated_at: '2026-01-01T00:00:00.000Z',
            }
            rows.push(created)
            return { data: created, error: null }
          }

          if (mutation === 'update' && updatePayload) {
            const index = rows.findIndex((row) => row.id === filters.id)
            if (index < 0) return { data: null, error: { message: 'not found' } }
            rows[index] = {
              ...rows[index],
              ...updatePayload,
              updated_at: '2026-01-02T00:00:00.000Z',
            }
            return { data: rows[index], error: null }
          }

          return { data: null, error: { message: 'unsupported single call' } }
        },
        update(payload: Row) {
          mutation = 'update'
          updatePayload = payload
          return builder
        },
        then(
          resolve: (value: { data: Row[] | null; error: { message: string } | null }) => void,
          reject?: (reason?: unknown) => void,
        ) {
          try {
            if (mutation === 'select') {
              const data = rows.filter((row) =>
                Object.entries(filters).every(([column, value]) => String(row[column]) === value),
              )
              resolve({ data, error: null })
              return
            }

            if (mutation === 'delete') {
              const remaining = rows.filter(
                (row) =>
                  !Object.entries(filters).every(([column, value]) => String(row[column]) === value),
              )
              rows.splice(0, rows.length, ...remaining)
              resolve({ data: null, error: null })
              return
            }

            resolve({ data: null, error: { message: 'unsupported mutation' } })
          } catch (error) {
            reject?.(error)
          }
        },
      }

      return builder
    },
  }

  return supabase
}

describe('createSupabaseGoalsRepository', () => {
  test('lists goals for a project', async () => {
    const repository = createSupabaseGoalsRepository(
      createMockSupabase({
        rows: [
          {
            constraints: { metric: 'dcir', operator: 'lt', value: 1.5 },
            created_at: '2026-01-01T00:00:00.000Z',
            id: GOAL_ID,
            label: 'Goal 1',
            project_id: PROJECT_ID,
            sort_order: 0,
            updated_at: '2026-01-01T00:00:00.000Z',
            user_id: USER_ID,
            work_condition: {},
          },
        ],
      }) as never,
    )

    const goals = await repository.list(PROJECT_ID)
    expect(goals).toHaveLength(1)
    expect(goals[0]?.label).toBe('Goal 1')
  })

  test('creates a validated goal row', async () => {
    const supabase = createMockSupabase({ rows: [] })
    const repository = createSupabaseGoalsRepository(supabase as never)

    const goal = await repository.create(PROJECT_ID, {
      constraints: { metric: 'dcir', operator: 'lt', value: 1.5 },
      label: 'New goal',
      work_condition: { temperature_c: 25 },
    })

    expect(goal.id).toBe(CREATED_GOAL_ID)
    expect(goal.project_id).toBe(PROJECT_ID)
  })

  test('requires authentication before mutations', async () => {
    const repository = createSupabaseGoalsRepository(
      createMockSupabase({ rows: [], userId: null }) as never,
    )

    await expect(
      repository.create(PROJECT_ID, {
        constraints: { metric: 'dcir', operator: 'lt', value: 1 },
        label: 'Unauthorized',
        work_condition: {},
      }),
    ).rejects.toThrow('Sign in before managing design goals.')
  })
})
