# ADR-0006 — v0.2 scope: tab geometry + cc_position

**Status:** Accepted · 2026-06-12

## Context

ADR-0005 deferred tab geometry (`cc_p_tab_*`, `cc_n_tab_*`) and `cc_position`
from v0.1. v0.1 ships a flat current collector with no terminal — geometrically
complete for PyBaMM export but visually wrong for a real cell. v0.2 unlocks
these two deferred items so the editor renders a recognizable tab protrusion
on each collector and the user can edit its parameters.

## Decision

### Field ownership

Tab geometry fields live on the **collector templates** (the same node that
already owns `cc_p_thickness` / `cc_n_thickness`):

- `cc_p_tab_length`, `cc_p_tab_width`, `cc_p_tab_y_coordinate` →
  `CathodeCurrentCollectorNode`
- `cc_n_tab_length`, `cc_n_tab_width`, `cc_n_tab_y_coordinate` →
  `AnodeCurrentCollectorNode`

This matches the v0.1 convention that a layer template owns its geometric
parameters; editing a tab in the collector panel updates every physical
collector instance simultaneously.

`cc_position` lives on the **Cell** node. The Cell owns in-plane collector
layout (the `electrode_length` / `electrode_width` pair) and the tab-arrangement
policy sits naturally with it.

### Geometry

The cell uses a fixed coordinate frame:

- X — stacking axis (perpendicular to layers), centred on `X=0`
- Y — cell height / short in-plane axis (along `electrode_width`, from 0 to
  `electrode_width`)
- Z — long in-plane axis (along `electrode_length`)

For each physical collector instance, when its `tab_length >= 1` mm the
renderer adds a single box mesh per instance with:

- size: `tab_length` × collector thickness × `tab_width` — the tab shares the
  collector's X thickness and its width runs along the cell width axis
- centre X: the collector instance's X centre
- centre Y: `tab_y_coordinate`, measured in the cell's 0-to-`electrode_width`
  height frame; a centred tab stores `tab_y_coordinate = electrode_width/2`
- centre Z: `±(electrode_length/2 + tab_length/2)` where `+` is cathode,
  `-` is anode (per `cc_position = "opposite"`)

`cc_position = "same"` would shift both tabs to the same Z side; deferred
to v0.3. v0.2 hardcodes `"opposite"` in the rendering logic.

### Default values

Tab fields default so that a fresh scene already shows visible tabs:

| Field | Default |
|---|---|
| `cc_p_tab_length` / `cc_n_tab_length` | 30 mm |
| `cc_p_tab_width` / `cc_n_tab_width` | 80 mm |
| `cc_p_tab_y_coordinate` / `cc_n_tab_y_coordinate` | `electrode_width / 2` |
| `cc_position` | `"opposite"` |

Schema constraints: `tab_length` ≥ 1 (every collector must render a tab —
no "length = 0 means hidden" escape hatch), `tab_width` ≥ 0.1, and
`tab_y_coordinate` is any number. The panel slider clamps
`tab_y_coordinate` to `[0, electrode_width]`.

### Panel layout

- `CellPanel`: a new `PanelSection` titled **"Tab Position"** contains the
  `cc_position` field rendered as a button group ("Opposite" / "Same"). v0.2
  shows the "Same" button disabled with a "(v0.3)" suffix; selecting it is
  a no-op.
- `CathodeCurrentCollectorPanel` and `AnodeCurrentCollectorPanel`: a new
  `PanelSection` titled **"Tab"** contains the three `cc_*_tab_*` fields
  in order `length`, `width`, `y_coordinate`.

### Interaction

Tab meshes are clickable and share the collector template's selection
highlight — clicking either a collector box or its tab selects the same
collector template, which shows the collector panel with both Geometry
and Tab sections.

## Alternatives Considered

**A. Put tab fields on Stack.** Rejected — breaks the v0.1 convention that
each collector template owns its geometric parameters. Editing one
collector's tab in Stack would be confusing.

**B. Put `cc_position` on Stack.** Rejected — Cell already owns in-plane
collector layout. Stack would gain a second axis of layout responsibility.

**C. Length = 0 means "no tab rendered".** Rejected — every real cell has
two tabs, so making it possible to hide one is a footgun. Schema constraint
forces `length ≥ 1`.

**D. Render tab as part of the collector box (single L-shaped mesh).**
Rejected — every parameter change rebuilds the geometry, and an L-shape
makes hit-testing less predictable. Separate tab box inherits the
collector group's hit volume.

## Consequences

- `CellNode` gains a `cc_position` enum field (default `"opposite"`).
- `CathodeCurrentCollectorNode` gains three tab fields.
- `AnodeCurrentCollectorNode` gains three tab fields.
- `resolveCellStackContext` propagates the new tab fields so the renderer
  can read them.
- `buildStackLayout` (or a small sibling helper) computes the tab mesh
  geometry per collector instance from the cell's `electrode_length` /
  `electrode_width` and the template's tab fields.
- `StackRenderer`'s `TemplateLayerGroup` adds a tab-box render per instance
  when `kind` is a collector and `tab_length >= 1`.
- `CellPanel`, `CathodeCurrentCollectorPanel`, `AnodeCurrentCollectorPanel`
  each gain one new `PanelSection`.
- ADR-0005's "Tab geometry" and "`cc_position`" deferral paragraphs are
  superseded by this ADR.
- `CONTEXT.md` "Out of Scope (v0.1)" loses the two tab-related bullets;
  "Tab" and "Tab position" become first-class domain objects.
