import { generateId, type SceneGraph } from '@pascal-app/core'
import type { AnodeNode } from '@/src/plugin/anode/schema'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector/schema'
import type { CathodeNode } from '@/src/plugin/cathode/schema'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector/schema'
import type { CellNode } from '@/src/plugin/cell/schema'
import type { SeparatorNode } from '@/src/plugin/separator/schema'
import type { StackNode } from '@/src/plugin/stack/schema'
import { resolveCellStructure, type CellStructureNode } from './cell-structure'

export type TupleFloat = number | number[]

export type CellDesign = {
  cathode_mass_loading: TupleFloat
  anode_mass_loading: TupleFloat
  cathode_density: TupleFloat
  anode_density: TupleFloat
  theoretical_density_p: TupleFloat
  theoretical_density_n: TupleFloat
  theoretical_capacity_p: TupleFloat
  theoretical_capacity_n: TupleFloat
  cathode_specific_capacity: TupleFloat
  specific_capacity_n: TupleFloat
  theoretical_max_conc_p: TupleFloat
  theoretical_max_conc_n: TupleFloat
  conductivity_p: TupleFloat
  conductivity_n: TupleFloat
  a_prefactor_p: TupleFloat
  a_prefactor_n: TupleFloat
  cathode_D50: TupleFloat
  anode_D50: TupleFloat
  init_conc_negative: TupleFloat
  init_conc_positive: TupleFloat
  lower_voltage: number
  upper_voltage: number
  voltage_at_0_soc: number | null
  voltage_at_100_soc: number | null
  separator_thickness: number
  separator_porosity: number
  electrolyte_coefficient: number
  init_conc_electrolyte: number
  number_of_layers: number
  electrode_length: number
  electrode_width: number
  cc_p_thickness: number
  cc_n_thickness: number
  cc_p_tab_length: number
  cc_n_tab_length: number
  cc_n_tab_width: number
  cc_p_tab_width: number
  cc_p_tab_y_coordinate: number
  cc_n_tab_y_coordinate: number
  cc_position: string
  shell_length: number
  shell_width: number
  shell_thickness: number
  wall_thickness: number
}

function requireNode<T extends { type: string }>(
  nodes: Record<string, unknown>,
  id: string | undefined,
  type: string,
): T {
  const node = id ? (nodes[id] as T | undefined) : undefined
  if (node?.type !== type) throw new Error(`Cell design export is missing ${type}.`)
  return node
}

export function buildCellDesignFromScene(scene: SceneGraph): CellDesign {
  const nodes = scene.nodes as Record<string, unknown>
  const structure = resolveCellStructure(nodes as Record<string, CellStructureNode>)
  const cell = requireNode<CellNode>(nodes, structure.cellId, 'cell')
  const stack = requireNode<StackNode>(nodes, structure.stackId, 'stack')
  const cathode = requireNode<CathodeNode>(nodes, structure.components.cathode, 'cathode')
  const anode = requireNode<AnodeNode>(nodes, structure.components.anode, 'anode')
  const separator = requireNode<SeparatorNode>(nodes, structure.components.separator, 'separator')
  const ccP = requireNode<CathodeCurrentCollectorNode>(
    nodes,
    structure.components['cathode-current-collector'],
    'cathode-current-collector',
  )
  const ccN = requireNode<AnodeCurrentCollectorNode>(
    nodes,
    structure.components['anode-current-collector'],
    'anode-current-collector',
  )

  return {
    cathode_mass_loading: cathode.cathode_mass_loading,
    anode_mass_loading: anode.anode_mass_loading,
    cathode_density: cathode.cathode_density,
    anode_density: anode.anode_density,
    theoretical_density_p: cathode.cathode_theoretical_density,
    theoretical_density_n: anode.anode_theoretical_density,
    theoretical_capacity_p: cathode.cathode_theoretical_capacity,
    theoretical_capacity_n: anode.anode_theoretical_capacity,
    cathode_specific_capacity: cathode.cathode_specific_capacity,
    specific_capacity_n: anode.anode_specific_capacity,
    theoretical_max_conc_p: 22_819.8,
    theoretical_max_conc_n: 30_972.2,
    conductivity_p: cathode.cathode_conductivity,
    conductivity_n: anode.anode_conductivity,
    a_prefactor_p: 1,
    a_prefactor_n: 1,
    cathode_D50: cathode.cathode_D50,
    anode_D50: anode.anode_D50,
    init_conc_negative: 27_875,
    init_conc_positive: 4_875,
    lower_voltage: 2,
    upper_voltage: 3.8,
    voltage_at_0_soc: null,
    voltage_at_100_soc: null,
    separator_thickness: separator.separator_thickness,
    separator_porosity: separator.separator_porosity,
    electrolyte_coefficient: 2.8,
    init_conc_electrolyte: 1_000,
    number_of_layers: stack.number_of_layers,
    electrode_length: cell.electrode_length,
    electrode_width: cell.electrode_width,
    cc_p_thickness: ccP.cc_p_thickness,
    cc_n_thickness: ccN.cc_n_thickness,
    cc_p_tab_length: ccP.cc_p_tab_length,
    cc_n_tab_length: ccN.cc_n_tab_length,
    cc_n_tab_width: ccN.cc_n_tab_width,
    cc_p_tab_width: ccP.cc_p_tab_width,
    cc_p_tab_y_coordinate: ccP.cc_p_tab_y_coordinate,
    cc_n_tab_y_coordinate: ccN.cc_n_tab_y_coordinate,
    cc_position: cell.cc_position === 'same' ? 'same-side' : 'opposite',
    shell_length: 0,
    shell_width: 0,
    shell_thickness: 0,
    wall_thickness: 0.3,
  }
}

function numberValue(value: TupleFloat | undefined, fallback: number) {
  if (typeof value === 'number') return value
  if (Array.isArray(value) && typeof value[0] === 'number') return value[0]
  return fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function isCellDesignJson(value: unknown): value is Partial<CellDesign> {
  return (
    isRecord(value) &&
    typeof value.electrode_length === 'number' &&
    typeof value.electrode_width === 'number' &&
    typeof value.number_of_layers === 'number' &&
    'cathode_mass_loading' in value &&
    'anode_mass_loading' in value
  )
}

export function cellDesignToSceneGraph(design: Partial<CellDesign>): SceneGraph {
  const cellId = generateId('cell')
  const stackId = generateId('stack')
  const cathodeId = generateId('cathode')
  const anodeId = generateId('anode')
  const separatorId = generateId('separator')
  const ccPId = generateId('cathode-current-collector')
  const ccNId = generateId('anode-current-collector')

  return {
    nodes: {
      [cellId]: {
        object: 'node',
        id: cellId,
        type: 'cell',
        name: 'Cell',
        parentId: null,
        visible: true,
        metadata: {},
        electrode_length: design.electrode_length ?? 400,
        electrode_width: design.electrode_width ?? 100,
        cc_position: design.cc_position === 'same-side' ? 'same' : 'opposite',
        children: [stackId],
      },
      [stackId]: {
        object: 'node',
        id: stackId,
        type: 'stack',
        name: 'Stack',
        parentId: cellId,
        visible: true,
        metadata: {},
        number_of_layers: Math.max(1, Math.round(design.number_of_layers ?? 27)),
        children: [cathodeId, anodeId, separatorId, ccPId, ccNId],
      },
      [cathodeId]: {
        object: 'node',
        id: cathodeId,
        type: 'cathode',
        name: 'Cathode',
        parentId: stackId,
        visible: true,
        metadata: {},
        cathode_mass_loading: numberValue(design.cathode_mass_loading, 500),
        cathode_density: numberValue(design.cathode_density, 2.1),
        cathode_conductivity: numberValue(design.conductivity_p, 10),
        cathode_theoretical_density: numberValue(design.theoretical_density_p, 3.6),
        cathode_theoretical_capacity: numberValue(design.theoretical_capacity_p, 170),
        cathode_specific_capacity: numberValue(design.cathode_specific_capacity, 161),
        cathode_D50: numberValue(design.cathode_D50, 1),
      },
      [anodeId]: {
        object: 'node',
        id: anodeId,
        type: 'anode',
        name: 'Anode',
        parentId: stackId,
        visible: true,
        metadata: {},
        anode_mass_loading: numberValue(design.anode_mass_loading, 200),
        anode_density: numberValue(design.anode_density, 1.3),
        anode_conductivity: numberValue(design.conductivity_n, 100),
        anode_theoretical_density: numberValue(design.theoretical_density_n, 2.23),
        anode_theoretical_capacity: numberValue(design.theoretical_capacity_n, 372),
        anode_specific_capacity: numberValue(design.specific_capacity_n, 351),
        anode_D50: numberValue(design.anode_D50, 15),
      },
      [separatorId]: {
        object: 'node',
        id: separatorId,
        type: 'separator',
        name: 'Separator',
        parentId: stackId,
        visible: true,
        metadata: {},
        separator_thickness: design.separator_thickness ?? 0.0078,
        separator_porosity: design.separator_porosity ?? 0.4,
      },
      [ccPId]: {
        object: 'node',
        id: ccPId,
        type: 'cathode-current-collector',
        name: 'Cathode CC',
        parentId: stackId,
        visible: true,
        metadata: {},
        cc_p_thickness: design.cc_p_thickness ?? 0.013,
        cc_p_tab_length: design.cc_p_tab_length ?? 30,
        cc_p_tab_width: design.cc_p_tab_width ?? 80,
        cc_p_tab_y_coordinate: design.cc_p_tab_y_coordinate ?? design.electrode_width ?? 50,
      },
      [ccNId]: {
        object: 'node',
        id: ccNId,
        type: 'anode-current-collector',
        name: 'Anode CC',
        parentId: stackId,
        visible: true,
        metadata: {},
        cc_n_thickness: design.cc_n_thickness ?? 0.006,
        cc_n_tab_length: design.cc_n_tab_length ?? 30,
        cc_n_tab_width: design.cc_n_tab_width ?? 80,
        cc_n_tab_y_coordinate: design.cc_n_tab_y_coordinate ?? design.electrode_width ?? 50,
      },
    },
    rootNodeIds: [cellId],
  } as unknown as SceneGraph
}
