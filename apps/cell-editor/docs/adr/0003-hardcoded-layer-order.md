# ADR-0003 — Layer order is hardcoded in code, not user-editable

**Status:** Accepted · 2026-06-11

## Context

A layered cell's interior follows a fixed electrochemical order. The
canonical repeating unit is:

```
anode-collector → anode → separator → cathode → cathode-collector → cathode → separator → anode → anode-collector
```

The order is dictated by chemistry, not design choice — putting the
anode between two cathodes, or skipping a separator, produces a
short-circuit or a dead cell. Real-world manufacturers do not vary it.

## Decision

The layer order is a **code constant** exported from the cell-schema
package. It is not a property on the `Stack` node, not in the scene
state, not editable from the UI.

```ts
// apps/cell-editor/src/schema/layer-order.ts
export const STACK_UNIT_ORDER = [
  'anode-current-collector',
  'anode',
  'separator',
  'cathode',
  'cathode-current-collector',
  'cathode',
  'separator',
  'anode',
  'anode-current-collector',
] as const
```

The renderer reads this constant and the Stack's `N` to materialise the
physical instances.

## Alternatives Considered

**User-editable layer order (explicit array on Stack)** — exposed in the
right-hand panel. Rejected: the order is physically constrained.
Exposing it invites invalid configurations and adds UI surface area
that will never have a valid use.

**Hidden but parametrised** — store as a non-schema field on Stack,
editable only via JSON file import. Rejected: same end-user risk with
no UI benefit.

**Schema-enforced constraints** (Zod refinement that rejects bad
orders) — over-engineered for a property that should never vary.

## Consequences

- One source of truth for the layer order. Changing it (e.g. adding a
  third separator layer for a future solid-state cell design) is a
  code change with PR review.
- `Stack` schema has fewer fields → smaller surface, fewer validation
  paths, easier migration.
- v0.1: if a future use case requires a different order, we'll need to
  promote `STACK_UNIT_ORDER` to a per-Stack property. ADR-0005 lists
  this as deferred.
