# apps/cell-editor — Vocabulary

Glossary for the cell (battery cell) editor. Implementation-free — defines
the domain terms the code uses. Pure semantic reference, no file paths,
schemas, or rendering details.

## Domain Objects

### Cell
A complete electrochemical cell — the root object the user edits. Owns
the **overall geometry** that applies to every layer inside it:
`electrode_length`, `electrode_width` (in mm), and the **stack count** N
via its child Stack.

### Stack
A **layered (Z-stacked) cell structure**. The repeating unit of a
layered cell. Records the **layer count N**. The layer order inside one
stack unit is **fixed in code** — see ADR-0003.

A Stack owns five kind-template children.

### Layer template
A parametric shape + material definition shared by every physical layer
of the same kind inside a Stack. There are five kinds:

| Kind | Role |
|---|---|
| `Cathode` | Positive electrode (coating + cathode-collector beneath it) |
| `Anode` | Negative electrode (coating + anode-collector beneath it) |
| `Separator` | Porous insulator between cathode and anode |
| `CathodeCurrentCollector` | Metal foil that carries current out of the cathode side |
| `AnodeCurrentCollector` | Metal foil that carries current out of the anode side |

A layer template is **not** a physical layer — it is the parameter set
shared by N physical layers. Changing a template's property updates
every instance of that kind in real time. See ADR-0002.

`Cathode` and `Anode` share the **in-plane dimensions** (`length`,
`width`) with the Cell — they do not store them. They differ in their
**material parameters** (mass loading, density, etc.).

### Physical layer instance
The actual geometry rendered for one layer at runtime. Not a node in the
scene graph. Materialised at render time by reading layer-order,
cumulative thickness, and each kind template's parameters.

### CellDesign
The full physical model the editor mirrors (from the user's
`BaseCompositeModel` class). v0.1 exposes a subset of its fields; the
rest are deferred to v0.2+ (see ADR-0005).

## Properties

### Geometric properties (v0.1)

| Property | Lives on | Unit (storage) |
|---|---|---|
| `electrode_length` | Cell | mm |
| `electrode_width` | Cell | mm |
| `number_of_layers` (N) | Stack | int |
| `separator_thickness` | Separator template | mm |
| `cc_p_thickness` | CathodeCurrentCollector template | mm |
| `cc_n_thickness` | AnodeCurrentCollector template | mm |

### Tab properties (v0.2)

| Property | Lives on | Unit (storage) |
|---|---|---|
| `cc_p_tab_length` | CathodeCurrentCollector template | mm |
| `cc_n_tab_length` | AnodeCurrentCollector template | mm |
| `cc_p_tab_width` | CathodeCurrentCollector template | mm |
| `cc_n_tab_width` | AnodeCurrentCollector template | mm |
| `cc_p_tab_y_coordinate` | CathodeCurrentCollector template | mm |
| `cc_n_tab_y_coordinate` | AnodeCurrentCollector template | mm |
| `cc_position` | Cell | enum ("opposite" \| "same", v0.2 only "opposite") |

### Tab
A protrusion that extends outward from a current collector foil along the
X axis (the long in-plane axis). Carries current out of the cell to an
external terminal.

- `tab_length` — extent of the tab along X (outward from the collector edge)
- `tab_width` — extent of the tab along Z (the cell width direction),
  matching the Cell's `electrode_width` axis
- `tab_y_coordinate` — position of the tab centre along the cell width
  direction, measured from one width edge; centred tabs use
  `electrode_width / 2`

### Tab position (`cc_position`)
How the two collectors' tabs are arranged along X:
- `"opposite"` — anode tab extends along -X, cathode tab extends along +X
- `"same"` — both tabs extend along the same X direction (deferred to v0.3)

### Material properties (v0.1, displayed on cathode/anode panels)

| Property | Unit (storage) | Source field |
|---|---|---|
| `cathode_mass_loading` | g/m² (kept as areal density) | `cathode_mass_loading` |
| `anode_mass_loading` | g/m² | `anode_mass_loading` |
| `cathode_density` | g/cm³ | `cathode_density` |
| `anode_density` | g/cm³ | `anode_density` |
| `cathode_conductivity` | S/m | `cathode_conductivity` |
| `anode_conductivity` | S/m | `anode_conductivity` |
| `separator_porosity` | dimensionless | `separator_porosity` |
| `cathode_theoretical_density` | g/cm³ | `cathode_theoretical_density` |
| `anode_theoretical_density` | g/cm³ | `anode_theoretical_density` |
| `cathode_theoretical_capacity` | mA·h/g | `cathode_theoretical_capacity` |
| `anode_theoretical_capacity` | mA·h/g | `anode_theoretical_capacity` |
| `cathode_specific_capacity` | mA·h/g | `cathode_specific_capacity` |
| `anode_specific_capacity` | mA·h/g | `anode_specific_capacity` |
| `cathode_D50` | µm | `cathode_D50` |
| `anode_D50` | µm | `anode_D50` |

### Derived property

| Property | Formula |
|---|---|
| `cathode_coating_thickness` | `cathode_mass_loading / (cathode_density × 1_000_000) × 1000` |
| `anode_coating_thickness` | `anode_mass_loading / (anode_density × 1_000_000) × 1000` |
| `total_stack_height` | N × (2 × anode_coating + 2 × cathode_coating + 2 × separator + 2 × anode_collector + cathode_collector) |

Single repeating unit:
`anode_collector → anode → separator → cathode → cathode_collector → cathode → separator → anode → anode_collector`

(Computed by the renderer from template parameters. Not stored.)

### Stacking axis
The axis perpendicular to the layers' flat faces. Three.js **Y axis**.
Layers stack along +Y from the cell's geometric centre
(`-totalHeight/2` to `+totalHeight/2`).

## Interaction

### Hover
Mouse-over on any physical layer instance highlights **every** instance
of the same kind in the active Stack (entire group glows). Implemented
by binding the highlight to the kind-template node, not the instance.

### Selection
A click on any physical layer instance selects its **layer template
node**. The right-hand panel shows the template's properties. Edits
update every instance of that kind simultaneously.

### Real-time update
Any edit in the right-hand panel propagates to the 3D scene in the same
frame — no apply button. Implemented via the shared scene store: panel
input → `updateNode(id, partial)` → store subscribers → renderer
rebuilds geometry from updated parameters.

## Out of Scope (v0.1 / v0.2)

The following exist in `CellDesign` but are **not editable in the
panel** in v0.1 / v0.2 — they are read-only placeholders until a
later version:

- Cell shell (`shell_*`, `wall_thickness`)
- Electrolyte (`init_conc_electrolyte`, `electrolyte_coefficient`)
- Voltage window (`lower_voltage`, `upper_voltage`, `voltage_at_0_soc`,
  `voltage_at_100_soc`)
- Particle-scale parameters other than editable D50 (`a_prefactor_p/n`,
  `init_conc_*`, `*_theoretical_max_concentration`)

See ADR-0005 for the deferred list.
