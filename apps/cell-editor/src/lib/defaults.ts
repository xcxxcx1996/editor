import { generateId, type SceneGraph } from '@pascal-app/core'
import type { AnodeNode } from '@/src/plugin/anode/schema'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector/schema'
import type { CathodeNode } from '@/src/plugin/cathode/schema'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector/schema'
import type { CellNode } from '@/src/plugin/cell/schema'
import type { SeparatorNode } from '@/src/plugin/separator/schema'
import type { StackNode } from '@/src/plugin/stack/schema'

const LOCAL_STORAGE_KEY = 'pascal-cell-editor-scene'
const DEFAULT_NUMBER_OF_LAYERS = 27
const DEFAULT_TAB_LENGTH_MM = 30
const DEFAULT_TAB_WIDTH_MM = 80

export function applyCellSceneDefaults(scene: SceneGraph): SceneGraph {
  const nodes = { ...(scene.nodes as Record<string, Record<string, unknown>>) }
  const cellNode = Object.values(nodes).find(
    (node) => node.type === 'cell' && typeof node.electrode_width === 'number',
  )
  const cellWidth =
    cellNode && typeof cellNode.electrode_width === 'number' ? cellNode.electrode_width : 100
  const centeredTabYCoordinate = cellWidth / 2

  for (const [nodeId, node] of Object.entries(nodes)) {
    if (node.type === 'cell') {
      nodes[nodeId] = {
        ...node,
        cc_position: typeof node.cc_position === 'string' ? node.cc_position : 'opposite',
      }
      continue
    }

    if (node.type === 'stack') {
      nodes[nodeId] = {
        ...node,
        number_of_layers:
          typeof node.number_of_layers === 'number'
            ? node.number_of_layers
            : DEFAULT_NUMBER_OF_LAYERS,
      }
      continue
    }

    if (node.type === 'cathode-current-collector') {
      nodes[nodeId] = {
        ...node,
        cc_p_tab_length:
          typeof node.cc_p_tab_length === 'number' ? node.cc_p_tab_length : DEFAULT_TAB_LENGTH_MM,
        cc_p_tab_width:
          typeof node.cc_p_tab_width === 'number' ? node.cc_p_tab_width : DEFAULT_TAB_WIDTH_MM,
        cc_p_tab_y_coordinate:
          typeof node.cc_p_tab_y_coordinate === 'number'
            ? node.cc_p_tab_y_coordinate
            : centeredTabYCoordinate,
      }
      continue
    }

    if (node.type === 'cathode') {
      nodes[nodeId] = {
        ...node,
        cathode_density:
          typeof node.cathode_density === 'number' && node.cathode_density > 1000
            ? node.cathode_density / 1_000_000
            : node.cathode_density,
        cathode_theoretical_density:
          typeof node.cathode_theoretical_density === 'number'
            ? node.cathode_theoretical_density
            : 3.6,
        cathode_specific_capacity:
          typeof node.cathode_specific_capacity === 'number' ? node.cathode_specific_capacity : 161,
        cathode_D50: typeof node.cathode_D50 === 'number' ? node.cathode_D50 : 1,
      }
      continue
    }

    if (node.type === 'anode') {
      nodes[nodeId] = {
        ...node,
        anode_density:
          typeof node.anode_density === 'number' && node.anode_density > 1000
            ? node.anode_density / 1_000_000
            : node.anode_density,
        anode_theoretical_density:
          typeof node.anode_theoretical_density === 'number'
            ? node.anode_theoretical_density
            : 2.23,
        anode_specific_capacity:
          typeof node.anode_specific_capacity === 'number' ? node.anode_specific_capacity : 351,
        anode_D50: typeof node.anode_D50 === 'number' ? node.anode_D50 : 15,
      }
      continue
    }

    if (node.type === 'anode-current-collector') {
      nodes[nodeId] = {
        ...node,
        cc_n_tab_length:
          typeof node.cc_n_tab_length === 'number' ? node.cc_n_tab_length : DEFAULT_TAB_LENGTH_MM,
        cc_n_tab_width:
          typeof node.cc_n_tab_width === 'number' ? node.cc_n_tab_width : DEFAULT_TAB_WIDTH_MM,
        cc_n_tab_y_coordinate:
          typeof node.cc_n_tab_y_coordinate === 'number'
            ? node.cc_n_tab_y_coordinate
            : centeredTabYCoordinate,
      }
    }
  }

  return { ...scene, nodes } as unknown as SceneGraph
}

export function createDefaultCellScene(): SceneGraph {
  const cellId = generateId('cell')
  const stackId = generateId('stack')
  const cathodeId = generateId('cathode')
  const anodeId = generateId('anode')
  const separatorId = generateId('separator')
  const ccPId = generateId('cathode-current-collector')
  const ccNId = generateId('anode-current-collector')

  const cell: CellNode = {
    object: 'node',
    id: cellId,
    type: 'cell',
    name: 'Cell',
    parentId: null,
    visible: true,
    metadata: {},
    electrode_length: 400,
    electrode_width: 100,
    cc_position: 'opposite',
    children: [stackId],
  }

  const stack: StackNode = {
    object: 'node',
    id: stackId,
    type: 'stack',
    name: 'Stack',
    parentId: cellId,
    visible: true,
    metadata: {},
    number_of_layers: DEFAULT_NUMBER_OF_LAYERS,
    children: [cathodeId, anodeId, separatorId, ccPId, ccNId],
  }

  const cathode: CathodeNode = {
    object: 'node',
    id: cathodeId,
    type: 'cathode',
    name: 'Cathode',
    parentId: stackId,
    visible: true,
    metadata: {},
    cathode_mass_loading: 500,
    cathode_density: 2.1,
    cathode_conductivity: 10,
    cathode_theoretical_density: 3.6,
    cathode_theoretical_capacity: 170,
    cathode_specific_capacity: 161,
    cathode_D50: 1,
  }

  const anode: AnodeNode = {
    object: 'node',
    id: anodeId,
    type: 'anode',
    name: 'Anode',
    parentId: stackId,
    visible: true,
    metadata: {},
    anode_mass_loading: 200,
    anode_density: 1.3,
    anode_conductivity: 100,
    anode_theoretical_density: 2.23,
    anode_theoretical_capacity: 372,
    anode_specific_capacity: 351,
    anode_D50: 15,
  }

  const separator: SeparatorNode = {
    object: 'node',
    id: separatorId,
    type: 'separator',
    name: 'Separator',
    parentId: stackId,
    visible: true,
    metadata: {},
    separator_thickness: 0.0078,
    separator_porosity: 0.4,
  }

  const cathodeCollector: CathodeCurrentCollectorNode = {
    object: 'node',
    id: ccPId,
    type: 'cathode-current-collector',
    name: 'Cathode CC',
    parentId: stackId,
    visible: true,
    metadata: {},
    cc_p_thickness: 0.013,
    cc_p_tab_length: DEFAULT_TAB_LENGTH_MM,
    cc_p_tab_width: DEFAULT_TAB_WIDTH_MM,
    cc_p_tab_y_coordinate: cell.electrode_width / 2,
  }

  const anodeCollector: AnodeCurrentCollectorNode = {
    object: 'node',
    id: ccNId,
    type: 'anode-current-collector',
    name: 'Anode CC',
    parentId: stackId,
    visible: true,
    metadata: {},
    cc_n_thickness: 0.006,
    cc_n_tab_length: DEFAULT_TAB_LENGTH_MM,
    cc_n_tab_width: DEFAULT_TAB_WIDTH_MM,
    cc_n_tab_y_coordinate: cell.electrode_width / 2,
  }

  return {
    nodes: {
      [cellId]: cell,
      [stackId]: stack,
      [cathodeId]: cathode,
      [anodeId]: anode,
      [separatorId]: separator,
      [ccPId]: cathodeCollector,
      [ccNId]: anodeCollector,
    },
    rootNodeIds: [cellId],
  } as unknown as SceneGraph
}

export function saveCellSceneToLocalStorage(scene: SceneGraph): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scene))
  } catch {
    // quota errors are non-fatal
  }
}

export function loadCellSceneFromLocalStorage(): SceneGraph | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? applyCellSceneDefaults(JSON.parse(raw) as SceneGraph) : null
  } catch {
    return null
  }
}
