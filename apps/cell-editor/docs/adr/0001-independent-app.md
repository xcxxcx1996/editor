# ADR-0001 — apps/cell-editor is a standalone app, pascalorg upstream untouched

**Status:** Accepted · 2026-06-11

## Context

`pascalorg/editor` is a public, open-source 3D editor foundation library.
It ships `@pascal-app/{core,viewer,editor,mcp}` plus `apps/editor` as a
sample application (interior design: walls, doors, furniture, slabs).

We need to build an editor for **battery cells** — a fundamentally different
domain (layered electrochemical structures). The new product needs:

- 3D viewer with the same rendering pipeline (SSGI, TRAA, layers,
  post-processing).
- The same scene-graph architecture (Zod schemas, `useScene` store, event
  bus).
- The same editor-tool framework (tool registry, selection managers).

But the **node vocabulary** is completely different. There are no walls,
no slabs, no furniture. Adding cell nodes to `apps/editor` (or worse,
modifying `packages/core/src/schema/nodes/wall.ts`) would:

- Pollute a public, reusable library with domain-specific types.
- Make merging future upstream changes conflict-prone.
- Couple two unrelated products in the same workspace.

## Decision

Create a new app `apps/cell-editor/` that depends on `@pascal-app/core`,
`@pascal-app/viewer`, `@pascal-app/editor` as workspace packages — but
introduces its own node schemas and renderers without modifying any
upstream package.

The boundary is enforced by file ownership:

- `packages/core/src/schema/nodes/` — we **add** new files (`cell.ts`,
  `stack.ts`, `cathode.ts`, etc.). We never edit existing files there.
- `packages/viewer/` — we **add** new renderer files. We never edit
  existing renderer or pass code.
- `packages/editor/` — we never edit.
- `apps/editor/` — we never edit.

The dependency direction is one-way: cell-editor reads the foundation,
never writes to it.

## Alternatives Considered

**A. Modify `apps/editor` in place** — replace its furniture vocabulary
with cell vocabulary. Rejected: pollutes a public reusable sample,
breaks the README's mental model of "this is an interior design editor."

**B. Fork the repo entirely** — start a fresh git repo with cell-editor
as the only consumer. Rejected: loses the ability to consume upstream
fixes (post-processing, materials, layer system) by pulling. We'd
maintain a fork forever.

**C. Publish the foundation to npm, consume as versioned dep** —
rejected for v0.1 because the foundation is consumed as a git submodule
in `pascalorg/private-editor`, so in-repo consumption is the path of
least friction during development.

## Consequences

- New node types live in `apps/cell-editor/src/schema/` mirroring
  upstream's pattern, or in `packages/core/src/schema/nodes/` as
  additive files. (The latter chosen — see ADR-0004.)
- Renderers live in `apps/cell-editor/src/renderers/` or
  `packages/viewer/src/renderers/` additively. (Chosen location decided
  in implementation phase.)
- The cell editor cannot break upstream tests; upstream CI doesn't run
  our code, and our CI is added separately.
- Future: if we want to ship cell schemas as a reusable package, we can
  split `apps/cell-editor/src/schema/` into `packages/cell-schema/` with
  no upstream changes.