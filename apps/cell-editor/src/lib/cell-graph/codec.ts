import type { SceneGraph } from '@pascal-app/core'
import { resolveCellStructure } from './resolve'
import type { CellStructureNode } from './structure-types'
import type { AnodeNode } from '@/src/plugin/anode'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector'
import type { CathodeNode } from '@/src/plugin/cathode'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector'
import type { CellNode } from '@/src/plugin/cell/schema'
import type { SeparatorNode } from '@/src/plugin/separator'
import type { StackNode } from '@/src/plugin/stack/schema'
import { buildDefaultScene } from '@/src/lib/cell-graph/build-default-scene'
import {
  CELL_DESIGN_CONSTANTS,
  CELL_DESIGN_FIELD_MAPPINGS,
  decodeCcPosition,
  encodeCcPosition,
  numberValue,
  readDesignField,
  readSceneField,
} from '@/src/lib/cell-graph/field-map'
import type { CellDesign, TupleFloat } from './types'

function requireNode<T extends { type: string }>(
  nodes: Record<string, unknown>,
  id: string | undefined,
  type: string,
): T {
  const node = id ? (nodes[id] as T | undefined) : undefined
  if (node?.type !== type) throw new Error(`Cell design export is missing ${type}.`)
  return node
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

type ResolvedNodes = {
  cell: CellNode
  stack: StackNode
  cathode: CathodeNode
  anode: AnodeNode
  separator: SeparatorNode
  ccP: CathodeCurrentCollectorNode
  ccN: AnodeCurrentCollectorNode
}

function resolveNodes(scene: SceneGraph): ResolvedNodes {
  const nodes = scene.nodes as Record<string, unknown>
  const structure = resolveCellStructure(nodes as Record<string, CellStructureNode>)
  return {
    cell: requireNode<CellNode>(nodes, structure.cellId, 'cell'),
    stack: requireNode<StackNode>(nodes, structure.stackId, 'stack'),
    cathode: requireNode<CathodeNode>(nodes, structure.components.cathode, 'cathode'),
    anode: requireNode<AnodeNode>(nodes, structure.components.anode, 'anode'),
    separator: requireNode<SeparatorNode>(nodes, structure.components.separator, 'separator'),
    ccP: requireNode<CathodeCurrentCollectorNode>(
      nodes,
      structure.components['cathode-current-collector'],
      'cathode-current-collector',
    ),
    ccN: requireNode<AnodeCurrentCollectorNode>(
      nodes,
      structure.components['anode-current-collector'],
      'anode-current-collector',
    ),
  }
}

function nodeByKind(resolved: ResolvedNodes, kind: string): Record<string, unknown> {
  switch (kind) {
    case 'cell':
      return resolved.cell as unknown as Record<string, unknown>
    case 'stack':
      return resolved.stack as unknown as Record<string, unknown>
    case 'cathode':
      return resolved.cathode as unknown as Record<string, unknown>
    case 'anode':
      return resolved.anode as unknown as Record<string, unknown>
    case 'separator':
      return resolved.separator as unknown as Record<string, unknown>
    case 'cathode-current-collector':
      return resolved.ccP as unknown as Record<string, unknown>
    case 'anode-current-collector':
      return resolved.ccN as unknown as Record<string, unknown>
    default:
      throw new Error(`Unknown node kind: ${kind}`)
  }
}

export function encode(scene: SceneGraph): CellDesign {
  const resolved = resolveNodes(scene)
  const design = { ...CELL_DESIGN_CONSTANTS } as CellDesign

  for (const mapping of CELL_DESIGN_FIELD_MAPPINGS) {
    const node = nodeByKind(resolved, mapping.nodeKind)
    ;(design as Record<string, unknown>)[mapping.designKey] = readSceneField(node, mapping.sceneKey)
  }

  design.cc_position = encodeCcPosition(resolved.cell.cc_position)
  design.number_of_layers = resolved.stack.number_of_layers

  return design
}

function defaultForSceneField(
  scene: SceneGraph,
  nodeKind: string,
  sceneKey: string,
): number {
  const defaultScene = buildDefaultScene()
  const structure = resolveCellStructure(defaultScene.nodes as Record<string, CellStructureNode>)
  const nodes = defaultScene.nodes as Record<string, unknown>
  const id =
    nodeKind === 'cell'
      ? structure.cellId
      : nodeKind === 'stack'
        ? structure.stackId
        : structure.components[nodeKind as keyof typeof structure.components]
  const node = id ? (nodes[id] as Record<string, unknown> | undefined) : undefined
  const value = node?.[sceneKey]
  return typeof value === 'number' ? value : 0
}

function applyDesignPatch(scene: SceneGraph, design: Partial<CellDesign>): SceneGraph {
  const nodes = { ...(scene.nodes as Record<string, Record<string, unknown>>) }
  const structure = resolveCellStructure(nodes as Record<string, CellStructureNode>)

  const nodeIdByKind: Record<string, string | undefined> = {
    cell: structure.cellId,
    stack: structure.stackId,
    cathode: structure.components.cathode,
    anode: structure.components.anode,
    separator: structure.components.separator,
    'cathode-current-collector': structure.components['cathode-current-collector'],
    'anode-current-collector': structure.components['anode-current-collector'],
  }

  for (const mapping of CELL_DESIGN_FIELD_MAPPINGS) {
    const nodeId = nodeIdByKind[mapping.nodeKind]
    if (!nodeId) continue

    const designValue = readDesignField(design, mapping.designKey)
    if (designValue === undefined) continue

    const fallback = defaultForSceneField(scene, mapping.nodeKind, mapping.sceneKey)
    const nextValue =
      mapping.designKey === 'number_of_layers'
        ? Math.max(1, Math.round(numberValue(designValue as TupleFloat, fallback)))
        : numberValue(designValue as TupleFloat, fallback)

    nodes[nodeId] = {
      ...nodes[nodeId],
      [mapping.sceneKey]: nextValue,
    }
  }

  const cellId = structure.cellId
  if (cellId && nodes[cellId]) {
    nodes[cellId] = {
      ...nodes[cellId],
      cc_position: decodeCcPosition(design.cc_position),
    }
  }

  const electrodeWidth = design.electrode_width
  if (typeof electrodeWidth === 'number') {
    for (const [nodeId, node] of Object.entries(nodes)) {
      if (node.type === 'cathode-current-collector' && design.cc_p_tab_y_coordinate === undefined) {
        nodes[nodeId] = {
          ...node,
          cc_p_tab_y_coordinate: electrodeWidth / 2,
        }
      }
      if (node.type === 'anode-current-collector' && design.cc_n_tab_y_coordinate === undefined) {
        nodes[nodeId] = {
          ...node,
          cc_n_tab_y_coordinate: electrodeWidth / 2,
        }
      }
    }
  }

  return { ...scene, nodes } as unknown as SceneGraph
}

export function decode(design: Partial<CellDesign>): SceneGraph {
  return applyDesignPatch(buildDefaultScene(), design)
}

export function validate(design: unknown): design is Partial<CellDesign> {
  return (
    isRecord(design) &&
    typeof design.electrode_length === 'number' &&
    typeof design.electrode_width === 'number' &&
    typeof design.number_of_layers === 'number' &&
    'cathode_mass_loading' in design &&
    'anode_mass_loading' in design
  )
}

export const buildCellDesignFromScene = encode
export const cellDesignToSceneGraph = decode
export const isCellDesignJson = validate
