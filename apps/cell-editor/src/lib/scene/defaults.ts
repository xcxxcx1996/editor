import type { SceneGraph } from '@pascal-app/core/clone-scene-graph'
import { buildDefaultScene } from '../cell-graph/build-default-scene'

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
        electrolyte_concentration:
          typeof node.electrolyte_concentration === 'number' ? node.electrolyte_concentration : 1,
        electrolyte_level_ratio:
          typeof node.electrolyte_level_ratio === 'number' ? node.electrolyte_level_ratio : 0.5,
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
  return buildDefaultScene()
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
