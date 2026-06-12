# ADR-0002 — One template node per kind; in-plane dims shared from Cell

**Status:** Accepted · 2026-06-11

## Context

A layered cell with N=1 stack repeat contains 5 physical layers (cathode,
anode, separator, cathode-collector, anode-collector). With N repeats
the count is 5N (plus outer wrap).

The user's source-of-truth model `CellDesign` (a `BaseCompositeModel`
class) defines `electrode_length` and `electrode_width` as a **shared
in-plane size** for both electrodes — there is no separate cathode-length
and anode-length. The same dimension applies to all electrode layers.

For v0.1 we need to pick a software model:

1. How to organise nodes (one node per physical layer vs one per kind).
2. Where to store the shared electrode dimensions.

## Decision

**Coarse-grained templates.** One template node per kind, stored as
children of `Stack`. There are exactly 5 template nodes regardless of N.
Template parameters are shared by all instances of that kind.

**In-plane dimensions live on Cell, not on Cathode/Anode.** The Cell
node carries `electrode_length` and `electrode_width`. The renderer
reads these from Cell when sizing any electrode instance. The cathode
and anode nodes do **not** carry length/width — they only carry their
material parameters (mass loading, density, conductivity, etc.).

**Separator and collectors may carry their own in-plane dimensions in a
later iteration** if real-world designs need them to differ from the
electrodes. v0.1 inherits length/width from Cell.

## Alternatives Considered

**Fine-grained (one node per physical layer).** Rejected: scene-graph
balloon (5N nodes). Real manufacturing doesn't vary per-layer
parameters — same coating, same width, same recipe applied N times.

**Cathode and anode carry their own length/width.** Rejected: this
diverges from `CellDesign`. Two of the same thing means two
sources of truth and sync risk. The user's domain model says
"electrode_length" is one number.

**Treat Cathode and Anode as one kind "Electrode" with a role flag.**
Rejected: hides the fact that they have different material parameters.
The right-hand panel would need to show different mass-loading fields
per role, which is exactly what separate nodes gives us for free.

**Stack carries length/width instead of Cell.** Rejected: misaligns with
`CellDesign` (where `electrode_length` is a Cell-level concept). If we
ever export the cell for PyBaMM simulation, the field path must match.

## Consequences

- Scene graph nodes: `Cell (1) → Stack (1) → 5 kind templates (5)`.
  Total **7 nodes per cell**, independent of N.
- When the user clicks a cathode instance and edits its
  `cathode_mass_loading`, the change updates every cathode instance.
- When the user wants to change the in-plane size, they select **Cell**
  in the outliner (not Cathode) — the panel shows length/width fields.
- Renderer complexity: when materialising each instance, read in-plane
  dims from Cell, in-stack dims from each kind template. Single
  `getLayerSize(layerKind)` helper.
- v0.2 may introduce a "per-layer override" affordance if user feedback
  demands it. ADR-0005 lists this as deferred.