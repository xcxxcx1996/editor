import type { DesignGoal } from './design-goal-schema'

export type DesignGoalsState = {
  error: string | null
  goals: DesignGoal[]
  loading: boolean
}

export type DesignGoalsAction =
  | { type: 'load_start' }
  | { type: 'load_success'; goals: DesignGoal[] }
  | { type: 'load_error'; error: string }
  | { type: 'merge_created'; goal: DesignGoal }
  | { type: 'merge_created_many'; goals: DesignGoal[] }
  | { type: 'merge_updated'; goal: DesignGoal }
  | { type: 'merge_deleted'; goalId: string }

export const initialDesignGoalsState: DesignGoalsState = {
  error: null,
  goals: [],
  loading: true,
}

export function sortGoals(goals: DesignGoal[]): DesignGoal[] {
  return [...goals].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at),
  )
}

export function designGoalsReducer(
  state: DesignGoalsState,
  action: DesignGoalsAction,
): DesignGoalsState {
  switch (action.type) {
    case 'load_start':
      return { ...state, error: null, loading: true }
    case 'load_success':
      return { error: null, goals: sortGoals(action.goals), loading: false }
    case 'load_error':
      return { error: action.error, goals: [], loading: false }
    case 'merge_created':
      return { ...state, error: null, goals: sortGoals([...state.goals, action.goal]) }
    case 'merge_created_many':
      return { ...state, error: null, goals: sortGoals([...state.goals, ...action.goals]) }
    case 'merge_updated':
      return {
        ...state,
        error: null,
        goals: sortGoals(
          state.goals.map((goal) => (goal.id === action.goal.id ? action.goal : goal)),
        ),
      }
    case 'merge_deleted':
      return {
        ...state,
        error: null,
        goals: state.goals.filter((goal) => goal.id !== action.goalId),
      }
    default:
      return state
  }
}
