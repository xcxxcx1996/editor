import type { CellComponentKind } from './structure-types'
import type { CellDesign, TupleFloat } from './types'

export type CellDesignNodeKind = 'cell' | 'stack' | CellComponentKind

export type FieldMapping = {
  designKey: keyof CellDesign
  nodeKind: CellDesignNodeKind
  sceneKey: string
}

export const CELL_DESIGN_CONSTANTS: Pick<
  CellDesign,
  | 'theoretical_max_conc_p'
  | 'theoretical_max_conc_n'
  | 'a_prefactor_p'
  | 'a_prefactor_n'
  | 'init_conc_negative'
  | 'init_conc_positive'
  | 'lower_voltage'
  | 'upper_voltage'
  | 'voltage_at_0_soc'
  | 'voltage_at_100_soc'
  | 'electrolyte_coefficient'
  | 'init_conc_electrolyte'
  | 'shell_length'
  | 'shell_width'
  | 'shell_thickness'
  | 'wall_thickness'
> = {
  theoretical_max_conc_p: 22_819.8,
  theoretical_max_conc_n: 30_972.2,
  a_prefactor_p: 1,
  a_prefactor_n: 1,
  init_conc_negative: 27_875,
  init_conc_positive: 4_875,
  lower_voltage: 2,
  upper_voltage: 3.8,
  voltage_at_0_soc: null,
  voltage_at_100_soc: null,
  electrolyte_coefficient: 2.8,
  init_conc_electrolyte: 1_000,
  shell_length: 0,
  shell_width: 0,
  shell_thickness: 0,
  wall_thickness: 0.3,
}

export const CELL_DESIGN_FIELD_MAPPINGS: FieldMapping[] = [
  { designKey: 'cathode_mass_loading', nodeKind: 'cathode', sceneKey: 'cathode_mass_loading' },
  { designKey: 'cathode_density', nodeKind: 'cathode', sceneKey: 'cathode_density' },
  {
    designKey: 'theoretical_density_p',
    nodeKind: 'cathode',
    sceneKey: 'cathode_theoretical_density',
  },
  {
    designKey: 'theoretical_capacity_p',
    nodeKind: 'cathode',
    sceneKey: 'cathode_theoretical_capacity',
  },
  {
    designKey: 'cathode_specific_capacity',
    nodeKind: 'cathode',
    sceneKey: 'cathode_specific_capacity',
  },
  { designKey: 'conductivity_p', nodeKind: 'cathode', sceneKey: 'cathode_conductivity' },
  { designKey: 'cathode_D50', nodeKind: 'cathode', sceneKey: 'cathode_D50' },
  { designKey: 'anode_mass_loading', nodeKind: 'anode', sceneKey: 'anode_mass_loading' },
  { designKey: 'anode_density', nodeKind: 'anode', sceneKey: 'anode_density' },
  {
    designKey: 'theoretical_density_n',
    nodeKind: 'anode',
    sceneKey: 'anode_theoretical_density',
  },
  {
    designKey: 'theoretical_capacity_n',
    nodeKind: 'anode',
    sceneKey: 'anode_theoretical_capacity',
  },
  { designKey: 'specific_capacity_n', nodeKind: 'anode', sceneKey: 'anode_specific_capacity' },
  { designKey: 'conductivity_n', nodeKind: 'anode', sceneKey: 'anode_conductivity' },
  { designKey: 'anode_D50', nodeKind: 'anode', sceneKey: 'anode_D50' },
  {
    designKey: 'separator_thickness',
    nodeKind: 'separator',
    sceneKey: 'separator_thickness',
  },
  { designKey: 'separator_porosity', nodeKind: 'separator', sceneKey: 'separator_porosity' },
  { designKey: 'number_of_layers', nodeKind: 'stack', sceneKey: 'number_of_layers' },
  { designKey: 'electrode_length', nodeKind: 'cell', sceneKey: 'electrode_length' },
  { designKey: 'electrode_width', nodeKind: 'cell', sceneKey: 'electrode_width' },
  {
    designKey: 'cc_p_thickness',
    nodeKind: 'cathode-current-collector',
    sceneKey: 'cc_p_thickness',
  },
  {
    designKey: 'cc_p_tab_length',
    nodeKind: 'cathode-current-collector',
    sceneKey: 'cc_p_tab_length',
  },
  {
    designKey: 'cc_p_tab_width',
    nodeKind: 'cathode-current-collector',
    sceneKey: 'cc_p_tab_width',
  },
  {
    designKey: 'cc_p_tab_y_coordinate',
    nodeKind: 'cathode-current-collector',
    sceneKey: 'cc_p_tab_y_coordinate',
  },
  {
    designKey: 'cc_n_thickness',
    nodeKind: 'anode-current-collector',
    sceneKey: 'cc_n_thickness',
  },
  {
    designKey: 'cc_n_tab_length',
    nodeKind: 'anode-current-collector',
    sceneKey: 'cc_n_tab_length',
  },
  {
    designKey: 'cc_n_tab_width',
    nodeKind: 'anode-current-collector',
    sceneKey: 'cc_n_tab_width',
  },
  {
    designKey: 'cc_n_tab_y_coordinate',
    nodeKind: 'anode-current-collector',
    sceneKey: 'cc_n_tab_y_coordinate',
  },
]

export function numberValue(value: TupleFloat | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  if (Array.isArray(value) && typeof value[0] === 'number') return value[0]
  return fallback
}

export function encodeCcPosition(sceneValue: string): string {
  return sceneValue === 'same' ? 'same-side' : 'opposite'
}

export function decodeCcPosition(designValue: string | undefined): 'same' | 'opposite' {
  return designValue === 'same-side' ? 'same' : 'opposite'
}

export function readSceneField(node: Record<string, unknown>, sceneKey: string): unknown {
  return node[sceneKey]
}

export function readDesignField(
  design: Partial<CellDesign>,
  designKey: keyof CellDesign,
): unknown {
  return design[designKey]
}
