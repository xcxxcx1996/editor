# PRD — v0.2 Tab Geometry & cc_position

## Problem Statement

In v0.1 the editor renders a flat current collector foil with no terminal.
The cell looks geometrically complete for PyBaMM export but visually
misleading for any real battery cell, which always has two tabs carrying
current to external terminals. v0.2 unlocks the tab protrusion on each
collector and exposes the cell-level `cc_position` enum so the rendered
cell looks like a recognizable Li-ion cell.

## Solution

v0.2 adds three new domain concepts and the panels/3D renderer to edit
and visualise them:

1. **Tab protrusion** — a rectangular box that extends outward from each
   collector's long edge along the Z axis. Rendered for every physical
   collector instance, controlled by template-level tab parameters.
2. **Tab parameters** — six new fields (length / width / y_coordinate,
   one set per collector template) editable from a new "Tab" section in
   each collector's panel.
3. **Tab position** (`cc_position`) — a Cell-level enum controlling
   whether the two collectors' tabs extend to opposite sides
   (`"opposite"`, the default) or to the same side (`"same"`, reserved
   for v0.3).

## User Stories

1. As a cell designer, I want to see a tab protrusion on each current
   collector, so that the 3D view matches a real Li-ion cell.
2. As a cell designer, I want to edit the cathode tab length, so that I
   can size the tab to match my PyBaMM model parameters.
3. As a cell designer, I want to edit the anode tab length, so that I
   can size the tab independently of the cathode tab.
4. As a cell designer, I want to edit the tab width along the cell width
   direction, so that the tab footprint matches the collector width axis.
5. As a cell designer, I want to edit the tab's Y position, so that I
   can offset the tab from the collector's centre along the short edge.
6. As a cell designer, I want the tab to update in real time as I drag
   its parameters in the panel, so that I can iterate visually.
7. As a cell designer, I want to switch between "Opposite" and "Same"
   tab position, so that I can model either wiring arrangement.
8. As a cell designer, I want tabs to default to sensible values
   (length 30 mm, width 80 mm, centred), so that a fresh scene shows
   visible tabs without configuration.
9. As a cell designer, I want a v0.1 scene saved before this version to
   load cleanly with all tabs visible, so that I don't lose work.
10. As a cell designer, I want the schema to reject nonsensical values
    (tab longer than the collector, tab off the short edge), so that I
    don't accidentally produce an invalid cell.
11. As a cell designer, I want clicking a tab to select the same
    collector template as clicking the collector body, so that the
    interaction model stays consistent.
12. As a cell designer, I want the panel to clearly separate "Tab
    Position" (cell-level) from "Tab" (collector-level), so that I can
    find each parameter without confusion.
13. As a future contributor, I want the ADR-0005 deferred list to mark
    tab items as superseded, so that I know they are no longer deferred.
14. As a future contributor, I want CONTEXT.md to define Tab and Tab
    position as first-class domain objects, so that I have a vocabulary
    reference for the implementation.
15. As a cell designer, I want the tab to share the collector's colour
    and material, so that the visual hierarchy reads as "collector with
    a tab attached", not "two different objects".

## Implementation Decisions

### Field ownership

Tab geometric parameters live on the **collector templates**, matching
the v0.1 convention that each layer template owns its geometric
parameters:

- `cc_p_tab_length`, `cc_p_tab_width`, `cc_p_tab_y_coordinate` →
  `CathodeCurrentCollectorNode` schema
- `cc_n_tab_length`, `cc_n_tab_width`, `cc_n_tab_y_coordinate` →
  `AnodeCurrentCollectorNode` schema

`cc_position` lives on the **Cell** node because the Cell already owns
in-plane collector layout. v0.1 ADR-0005 originally said "stack-level"
but the Cell is the better home since Stack is about layer count, not
collector placement.

### Coordinate frame

The cell uses Three.js's standard frame:

- X — stacking axis (perpendicular to layers), centred on `X=0`
- Y — cell height / short in-plane axis (along `electrode_width`, from 0 to
  `electrode_width`)
- Z — long in-plane axis (along `electrode_length`)

Tab parameters follow PyBaMM's convention:

- `tab_length` — extent along Z (outward from the collector edge)
- `tab_width` — extent along Y (the cell width direction)
- `tab_y_coordinate` — tab centre along the cell width direction, measured
  from one width edge; centred is `electrode_width / 2`

### Tab mesh geometry

For each physical collector instance, when `tab_length ≥ 1` mm the
renderer adds a single box mesh:

- size: `tab_length × collector thickness × tab_width` — the tab shares the
  collector's X thickness and its width runs along the cell width axis
- centre X: the collector instance's X centre (tab is centred on the
  instance, not at the top of the stack)
- centre Y: `tab_y_coordinate`, measured in the cell's 0-to-`electrode_width`
  height frame
- centre Z: `±(electrode_length/2 + tab_length/2)` — `+` for cathode,
  `-` for anode (per `cc_position = "opposite"`)

Tab mesh inherits the collector group's material and selection
behaviour. Clicking either the collector box or the tab selects the
same collector template.

### `cc_position`

v0.2 hardcodes `"opposite"` in the rendering logic. The schema still
accepts `"same"` (otherwise the v0.3 enum extension requires a
migration). The Cell panel renders `cc_position` as a button group
("Opposite" / "Same") with "Same" disabled and labelled "(v0.3)".

### Schema constraints

Tab parameters use zod constraints in the schema:

- `tab_length`: `z.number().min(1)` — every collector must have a tab
  (no `length = 0` escape hatch — this is a footgun)
- `tab_width`: `z.number().min(0.1)` — must be positive
- `tab_y_coordinate`: `z.number()` — panel slider clamps to
  `[0, electrode_width]`, but schema accepts any value to allow free
  positioning
- `cc_position`: `z.enum(['opposite', 'same']).default('opposite')`

### Defaults

A fresh scene (and any v0.1 scene loaded into v0.2) shows visible tabs:

- `tab_length` → 30 mm
- `tab_width` → 80 mm
- `tab_y_coordinate` → `electrode_width / 2`
- `cc_position` → "opposite"

`createDefaultCellScene` and `loadCellSceneFromLocalStorage` must
produce scenes with these defaults applied to any missing tab fields,
so old v0.1 scenes don't show collector-only cells.

### Panel layout

- `CellPanel` — add `PanelSection title="Tab Position"` containing a
  button group control bound to `cc_position`
- `CathodeCurrentCollectorPanel` — add `PanelSection title="Tab"`
  containing three SliderControls: `cc_p_tab_length`,
  `cc_p_tab_width`, `cc_p_tab_y_coordinate`
- `AnodeCurrentCollectorPanel` — add `PanelSection title="Tab"`
  containing three SliderControls: `cc_n_tab_length`,
  `cc_n_tab_width`, `cc_n_tab_y_coordinate`

Each collector's existing `Geometry` section (with `*_thickness`) is
unchanged.

### Renderer changes

`StackRenderer.TemplateLayerGroup` is the only renderer component that
changes:

- For each `PhysicalLayer` whose `kind` is `cathode-current-collector`
  or `anode-current-collector`, after rendering the collector box
  conditionally render a tab box using the template's tab fields and
  the cell's `electrode_length` / `electrode_width`.
- The tab box shares the collector instance's X centre (so it follows
  the instance in the stack), shares the collector's X thickness, and has
  its own Y and Z position.
- The tab box is a child of the same `<group ref={ref}>` that holds the
  collector boxes, so the collector's hover / selection behaviour
  covers the tab too.
- Tab box uses the same material as the collector (no separate colour
  / shading).

`resolveCellStackContext` propagates the six tab fields and `cc_position`
so the renderer can read them. `buildStackLayout` is unchanged; the
tab box positions are computed inline in the renderer (or in a small
helper, depending on what reads cleaner).

### Documentation

- ADR-0006 created, capturing the design decisions above.
- ADR-0005 updated: `Status` line adds "Partially superseded by
  ADR-0006"; the "Tab geometry" and "`cc_position`" deferral paragraphs
  are replaced with "Superseded by ADR-0006" notes.
- `CONTEXT.md`: Tab and Tab position become first-class domain objects
  with property tables and prose definitions; the "Out of Scope" list
  drops the two tab-related bullets.

## Testing Decisions

No automated tests added in v0.2. The change is geometry-only and
heavily visual — manual verification against a v0.1 reference scene
covers correctness adequately. Follow-up test work (stack-layout tab
geometry, resolve-templates propagation, schema defaults) can land in
a later PR.

## Out of Scope

- `cc_position = "same"` rendering — the button is shown disabled in
  the panel but the renderer does not implement it
- Tab on the "outer wrap" collector (the additional anode collector at
  the top of the stack per the layer-order sequence) being visually
  distinguished from the inner one — both render with the same logic
- Multi-tab collectors (a single physical instance carrying more than
  one tab) — v0.2 is strictly one tab per collector instance
- Per-instance tab variation (ADR-0002 mentioned this as a possible
  evolution) — tab is still a template-level parameter; every physical
  instance of a given collector template shares the same tab
- Animation / interactive tab placement (drag-to-position in 3D) — v0.2
  is panel-driven only

## Further Notes

The PyBaMM export path (not in this app yet) will need to consume
`cc_p_tab_*`, `cc_n_tab_*`, and `cc_position` from `CellDesign`. v0.2
makes those fields available; the export is the next consumer.

Tab mesh sizing assumes `tab_width ≤ electrode_width` would be a typical
constraint for a tab to stay within the cell width footprint, but the
schema does not enforce this. v0.3 may revisit this constraint once the
Cell shell arrives and the stack envelope is more constrained.
