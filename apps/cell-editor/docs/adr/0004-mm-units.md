# ADR-0004 — Storage units: mm for geometry, panel units for materials

**Status:** Accepted · 2026-06-11

## Context

`@pascal-app/viewer` is calibrated for metres. `CellDesign` (the user's
source-of-truth model) uses heterogeneous units via the `pint` library:
μm for thicknesses, mm for lengths, g/cm³ for densities, mol/m³ for
concentrations, S/m for conductivity, mA·h/g for capacity, dimensionless
for porosity.

We need to decide:

1. What units does each schema field **store**?
2. What does the panel **display**?

## Decision

**Geometric fields stored in mm (float).**

- `electrode_length` mm
- `electrode_width` mm
- `separator_thickness` mm (e.g. `7.8 μm → 0.0078`)
- `cc_p_thickness` mm (e.g. `13 μm → 0.013`)
- `cc_n_thickness` mm (e.g. `6 μm → 0.006`)
- `cathode_coating_thickness` (derived, mm)
- `anode_coating_thickness` (derived, mm)

**Material fields stored in panel-friendly units.**

- Areal mass loadings stay as **g/m²** (not converted).
- Densities stored as **g/cm³** (e.g. `2.1`, not `2_100_000`).
- Concentrations stay **mol/m³**.
- Conductivity stays **S/m**.
- Capacity stays **mA·h/g**.
- Porosity dimensionless.

**The renderer converts mm → metres at the boundary** — single
`mmToMeters()` helper. Density values are converted to g/m³ only inside
derived-thickness calculations.

**The panel shows unit labels beside values.** The user reads density as
`2.1 g/cm^3`, avoiding large raw SI values like `2_100_000`.

## Alternatives Considered

**Schema each field with explicit unit (e.g. `{value, unit}`).** This is
exactly what `pint` does in the user's `CellDesign`. We considered
mirroring it. Rejected for v0.1 because:

- Every consumer (renderer, panel, export) needs to handle the unit
  tag, switch on the unit, and convert. Branching everywhere.
- Zod schema loses its clean `z.number()` ergonomics.
- Three.js geometry only cares about metres; we still need to do the
  conversion, just at more sites.

We accept the trade-off: the user is a battery expert and reads field
names fluently. Unit labels can be added in v0.2 without schema
changes — they're a UI concern, not a data concern.

**All dimensions in metres (match viewer).** Rejected: `0.0000065 m`
floats with rounding noise; panel needs scientific notation.

**All dimensions in μm (integers).** Rejected: 400 mm becomes `400_000`
— visually indistinguishable from 4 m, easy to mistype.

**Mixed units per field (some mm, some μm).** Rejected: storage
inconsistency, conversion logic scattered.

## Consequences

- One conversion point for geometry (renderer). One pass-through for
  materials. Easy to audit.
- Panel input validation is plain positive-number validators.
- Trade-off accepted: a user reading the panel sees raw numbers
  without unit context. They must rely on field names. This is
  documented in `CONTEXT.md` under "Properties".
- v0.2 may add unit suffixes (`1000 mm`, `13 μm`) as a UI overlay.
  Schema doesn't need to change.
- v0.3 (PyBaMM integration) must convert SI material values back to
  pint-compatible strings before passing to the simulator. Single
  `toPintString(value, unit)` helper at the export boundary.
