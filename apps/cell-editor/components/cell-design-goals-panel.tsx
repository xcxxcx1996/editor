'use client'

import { cn } from '@pascal-app/editor'
import { Loader2, Plus, Sparkles, Goal, Trash2, X } from 'lucide-react'
import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import { useDesignGoalsContext } from '@/src/lib/projects/design-goals-context'
import { draftFromForm } from '@/src/lib/projects/design-goal-schema'
import type {
  DesignConstraint,
  DesignGoal,
  GoalDraft,
  WorkCondition,
} from '@/src/lib/projects/types'

type GoalFormState = {
  baseline: string
  cutoff_voltage_v: string
  label: string
  metric: string
  mode: 'charge' | 'discharge'
  operator: DesignConstraint['operator']
  protocol: string
  rate: string
  soc_pct: string
  temperature_c: string
  unit: string
  value: string
}

const EMPTY_FORM: GoalFormState = {
  baseline: '',
  cutoff_voltage_v: '',
  label: '',
  metric: 'dcir',
  mode: 'discharge',
  operator: 'lt',
  protocol: '',
  rate: '1C',
  soc_pct: '50',
  temperature_c: '25',
  unit: '',
  value: '',
}

const FIELD_CLASS =
  'min-w-0 w-full rounded-md border border-border/60 bg-[#1f1f21] px-2 outline-none focus:border-[#facc15]/70'

function goalToForm(goal: DesignGoal): GoalFormState {
  return {
    baseline: goal.constraints.baseline ?? '',
    cutoff_voltage_v: goal.work_condition.cutoff_voltage_v?.toString() ?? '',
    label: goal.label,
    metric: goal.constraints.metric,
    mode: goal.work_condition.mode ?? 'discharge',
    operator: goal.constraints.operator,
    protocol: goal.work_condition.protocol ?? '',
    rate: goal.work_condition.rate ?? '',
    soc_pct: goal.work_condition.soc_pct?.toString() ?? '',
    temperature_c: goal.work_condition.temperature_c?.toString() ?? '',
    unit: goal.constraints.unit ?? '',
    value: goal.constraints.value.toString(),
  }
}

function conditionSummary(condition: WorkCondition) {
  return [
    condition.temperature_c === undefined ? null : `${condition.temperature_c} C`,
    condition.soc_pct === undefined ? null : `${condition.soc_pct}% SOC`,
    condition.rate,
    condition.mode,
    condition.cutoff_voltage_v === undefined ? null : `${condition.cutoff_voltage_v} V cutoff`,
    condition.protocol,
  ]
    .filter(Boolean)
    .join(' - ')
}

function constraintSummary(constraint: DesignConstraint) {
  const operator = { eq: '=', gt: '>', gte: '>=', lt: '<', lte: '<=' }[constraint.operator]
  return `${constraint.metric} ${operator} ${constraint.value}${constraint.unit ? ` ${constraint.unit}` : ''}`
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="grid gap-2">
      <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  )
}

function FormField({
  children,
  hint,
  label,
  labelPosition = 'top',
}: {
  children: ReactNode
  hint?: string
  label: string
  labelPosition?: 'left' | 'top'
}) {
  if (labelPosition === 'left') {
    return (
      <div className="grid min-w-0 grid-cols-[92px_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5">
        <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
        <div className="min-w-0">{children}</div>
        {hint ? (
          <span className="col-start-2 text-[10px] text-muted-foreground/70">{hint}</span>
        ) : null}
      </div>
    )
  }

  return (
    <label className="grid min-w-0 gap-1">
      <span className="font-medium text-[11px] text-foreground">{label}</span>
      {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      {children}
    </label>
  )
}

function GoalForm({
  busy,
  initial,
  mode,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  initial: GoalFormState
  mode: 'create' | 'edit'
  onCancel?: () => void
  onSubmit: (draft: GoalDraft) => Promise<void>
}) {
  const [form, setForm] = useState(initial)
  const labelPosition = mode === 'edit' ? 'left' : 'top'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.label.trim() || !form.metric.trim() || !form.value.trim()) return
    await onSubmit(draftFromForm(form))
    if (mode === 'create') setForm(EMPTY_FORM)
  }

  return (
    <form
      className={cn(
        'grid min-w-0 max-w-full gap-3',
        mode === 'edit' && 'rounded-lg border border-white/10 bg-white/[0.035] p-3',
      )}
      onSubmit={submit}
    >
      <FormField label="Goal name" labelPosition={labelPosition}>
        <input
          className={cn(FIELD_CLASS, mode === 'create' ? 'h-9 text-sm' : 'h-8 text-xs')}
          onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
          placeholder="e.g. Low-temp DCIR"
          required
          value={form.label}
        />
      </FormField>

      <FormSection title="Work condition">
        <div className="grid min-w-0 gap-2">
          <FormField
            hint={mode === 'create' ? 'Ambient temperature during the test' : undefined}
            label="Temperature (°C)"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({ ...current, temperature_c: event.target.value }))
              }
              placeholder="25"
              value={form.temperature_c}
            />
          </FormField>
          <FormField
            hint={mode === 'create' ? 'Initial state of charge before cycling' : undefined}
            label="SOC (%)"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({ ...current, soc_pct: event.target.value }))
              }
              placeholder="50"
              value={form.soc_pct}
            />
          </FormField>
          <FormField
            hint={mode === 'create' ? 'Charge or discharge C-rate' : undefined}
            label="C-rate"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))}
              placeholder="1C"
              value={form.rate}
            />
          </FormField>
          <FormField label="Mode" labelPosition={labelPosition}>
            <select
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  mode: event.target.value as GoalFormState['mode'],
                }))
              }
              value={form.mode}
            >
              <option value="charge">Charge</option>
              <option value="discharge">Discharge</option>
            </select>
          </FormField>
          <FormField
            hint={mode === 'create' ? 'Voltage limit for charge or discharge' : undefined}
            label="Cutoff voltage (V)"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({ ...current, cutoff_voltage_v: event.target.value }))
              }
              placeholder="2.5"
              value={form.cutoff_voltage_v}
            />
          </FormField>
          <FormField
            hint={mode === 'create' ? 'e.g. CC-CV, HPPC, GITT' : undefined}
            label="Test protocol"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({ ...current, protocol: event.target.value }))
              }
              placeholder="CC-CV"
              value={form.protocol}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Performance constraint">
        <div className="grid min-w-0 gap-2">
          <FormField
            hint={mode === 'create' ? 'Metric to evaluate, e.g. dcir, capacity, energy' : undefined}
            label="Metric"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({ ...current, metric: event.target.value }))
              }
              placeholder="dcir"
              required
              value={form.metric}
            />
          </FormField>
          <FormField label="Operator" labelPosition={labelPosition}>
            <select
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  operator: event.target.value as DesignConstraint['operator'],
                }))
              }
              value={form.operator}
            >
              <option value="lt">&lt; less than</option>
              <option value="lte">&lt;= at most</option>
              <option value="gt">&gt; greater than</option>
              <option value="gte">&gt;= at least</option>
              <option value="eq">= equal to</option>
            </select>
          </FormField>
          <FormField
            hint={mode === 'create' ? 'Numeric threshold the simulation must meet' : undefined}
            label="Target value"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({ ...current, value: event.target.value }))
              }
              placeholder="1.5"
              required
              value={form.value}
            />
          </FormField>
          <FormField label="Unit" labelPosition={labelPosition}>
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
              placeholder="mOhm"
              value={form.unit}
            />
          </FormField>
          <FormField
            hint={mode === 'create' ? 'Reference design or batch for comparison' : undefined}
            label="Baseline"
            labelPosition={labelPosition}
          >
            <input
              className={cn(FIELD_CLASS, 'h-8 text-xs')}
              onChange={(event) =>
                setForm((current) => ({ ...current, baseline: event.target.value }))
              }
              placeholder="Optional"
              value={form.baseline}
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? (
          <button
            className="h-8 rounded-md px-3 font-medium text-muted-foreground text-xs hover:bg-white/8 hover:text-foreground"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
        <button
          className="flex h-8 items-center gap-1.5 rounded-md bg-[#facc15] px-3 font-semibold text-[#1c1917] text-xs disabled:opacity-70"
          disabled={busy || !form.label.trim() || !form.value.trim()}
          type="submit"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {mode === 'create' ? 'Add goal' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function CreateGoalDialog({
  busy,
  formKey,
  onClose,
  onSubmit,
  open,
}: {
  busy: boolean
  formKey: number
  onClose: () => void
  onSubmit: (draft: GoalDraft) => Promise<void>
  open: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#111113]/78 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div
        className="relative flex max-h-[min(90dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border/60 bg-[#1a1a1c] shadow-2xl"
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between border-border/60 border-b px-4 py-3">
          <div>
            <h3 className="font-semibold text-sm">New design goal</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Define the work condition and performance constraint for simulation.
            </p>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <GoalForm
            busy={busy}
            initial={EMPTY_FORM}
            key={formKey}
            mode="create"
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  )
}

export function CellDesignGoalsPanel({
  embedded = false,
  onClose,
  projectId,
}: {
  embedded?: boolean
  onClose?: () => void
  projectId: string
}) {
  const {
    createGoal,
    createGoals,
    deleteGoal,
    error,
    goals,
    loading,
    parseNaturalLanguage,
    updateGoal,
  } = useDesignGoalsContext()
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createFormKey, setCreateFormKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [magicText, setMagicText] = useState('')
  const [magicStatus, setMagicStatus] = useState<string | null>(null)

  const editingGoal = useMemo(
    () => goals.find((goal) => goal.id === editingId) ?? null,
    [editingId, goals],
  )

  function openCreateDialog() {
    setCreateFormKey((key) => key + 1)
    setCreateOpen(true)
  }

  async function saveNewGoal(draft: GoalDraft) {
    setBusy(true)
    try {
      await createGoal({ ...draft, sort_order: goals.length })
      setCreateOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function saveExistingGoal(draft: GoalDraft) {
    if (!editingId) return
    setBusy(true)
    try {
      await updateGoal(editingId, draft)
      setEditingId(null)
    } finally {
      setBusy(false)
    }
  }

  async function parseMagic() {
    if (!magicText.trim()) return
    setBusy(true)
    setMagicStatus(null)
    try {
      const payload = await parseNaturalLanguage(magicText)
      if (payload.goals?.length) {
        await createGoals(payload.goals)
        setMagicStatus(`Added ${payload.goals.length} parsed goal(s).`)
        setMagicText('')
      } else {
        setMagicStatus(
          payload.error === 'goals_nlp_not_configured' ? '后端尚未接入。' : 'No goals parsed.',
        )
      }
    } catch (parseError) {
      setMagicStatus(parseError instanceof Error ? parseError.message : '后端尚未接入。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section
        className={cn(
          'pointer-events-auto flex min-w-0 flex-col overflow-hidden bg-background/95 text-foreground',
          embedded
            ? 'h-full border-border/60 border-l'
            : 'max-h-[calc(100dvh-5rem)] w-[min(410px,calc(100vw-2rem))] rounded-lg border border-border/60 shadow-2xl backdrop-blur-xl',
        )}
      >
        <header className="flex h-13 shrink-0 items-center justify-between border-border/60 border-b px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#86efac]/14 text-[#bbf7d0]">
              <Goal className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-sm">Design Goals</h2>
              <p className="truncate text-[11px] text-muted-foreground">
                Project-scoped constraints
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="flex h-7 items-center gap-1 rounded-md border border-[#facc15]/25 bg-[#facc15]/10 px-2 font-medium text-[#fde68a] text-[11px] transition-colors hover:bg-[#facc15]/18"
              onClick={openCreateDialog}
              title="Add design goal"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2C2C2E] text-muted-foreground transition-colors hover:bg-[#3e3e3e] hover:text-foreground"
              onClick={onClose}
              title="Close goals"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
          {error ? (
            <div className="mb-3 rounded-lg border border-[#fca5a5]/25 bg-[#fca5a5]/10 p-3 text-[#fecaca] text-xs">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="mb-3 rounded-lg border border-border/50 bg-white/[0.03] p-3 text-muted-foreground text-xs">
              Loading design goals...
            </div>
          ) : null}

          <div className="grid gap-2">
            {goals.map((goal) => (
              <div
                className="rounded-lg border border-border/50 bg-white/[0.035] p-3"
                key={goal.id}
              >
                {editingId === goal.id && editingGoal ? (
                  <GoalForm
                    busy={busy}
                    initial={goalToForm(editingGoal)}
                    key={goal.id}
                    mode="edit"
                    onCancel={() => setEditingId(null)}
                    onSubmit={saveExistingGoal}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setEditingId(goal.id)}
                      type="button"
                    >
                      <h3 className="truncate font-semibold text-sm">{goal.label}</h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {conditionSummary(goal.work_condition) || 'No work condition'}
                      </p>
                      <p className="mt-1 text-[#fde68a] text-[11px]">
                        {constraintSummary(goal.constraints)}
                      </p>
                    </button>
                    <button
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-[#fca5a5]/10 hover:text-[#fecaca]"
                      onClick={() => void deleteGoal(goal.id)}
                      title="Delete goal"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!loading && goals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-white/[0.025] p-4 text-center text-muted-foreground text-xs">
              <p>No design goals yet.</p>
              <button
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#facc15]/30 bg-[#facc15]/12 px-3 font-semibold text-[#fde68a] text-xs hover:bg-[#facc15]/18"
                onClick={openCreateDialog}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Add first goal
              </button>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-border/60 border-t p-3">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#fde68a]" />
            Magic input
          </div>
          <textarea
            className="min-h-18 w-full resize-none rounded-lg border border-border/60 bg-[#1f1f21] px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-[#facc15]/70"
            onChange={(event) => setMagicText(event.target.value)}
            placeholder="25度50SOC 1C放电 DCIR<1.5"
            value={magicText}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="min-w-0 text-[11px] text-muted-foreground">{magicStatus}</p>
            <button
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#facc15]/30 bg-[#facc15]/12 px-3 font-semibold text-[#fde68a] text-xs hover:bg-[#facc15]/18 disabled:opacity-60"
              disabled={busy || !magicText.trim()}
              onClick={parseMagic}
              type="button"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Parse
            </button>
          </div>
        </div>
      </section>

      <CreateGoalDialog
        busy={busy}
        formKey={createFormKey}
        onClose={() => setCreateOpen(false)}
        onSubmit={saveNewGoal}
        open={createOpen}
      />
    </>
  )
}
