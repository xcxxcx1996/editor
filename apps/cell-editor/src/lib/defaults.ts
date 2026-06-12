import { generateId, type SceneGraph } from '@pascal-app/core'
import type { AnodeNode } from '@/src/plugin/anode/schema'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector/schema'
import type { CathodeNode } from '@/src/plugin/cathode/schema'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector/schema'
import type { CellNode } from '@/src/plugin/cell/schema'
import type { SeparatorNode } from '@/src/plugin/separator/schema'
import type { StackNode } from '@/src/plugin/stack/schema'

const LOCAL_STORAGE_KEY = 'pascal-cell-editor-scene'

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
    electrode_length: 1000,
    electrode_width: 500,
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
    number_of_layers: 1,
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
    cathode_mass_loading: 200,
    cathode_density: 2_100_000,
    cathode_conductivity: 10,
    cathode_theoretical_capacity: 170,
  }

  const anode: AnodeNode = {
    object: 'node',
    id: anodeId,
    type: 'anode',
    name: 'Anode',
    parentId: stackId,
    visible: true,
    metadata: {},
    anode_mass_loading: 100,
    anode_density: 1_500_000,
    anode_conductivity: 100,
    anode_theoretical_capacity: 372,
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
    return raw ? (JSON.parse(raw) as SceneGraph) : null
  } catch {
    return null
  }
}
