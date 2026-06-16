import type { AnodeNode } from '@/src/plugin/anode'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector'
import type { CathodeNode } from '@/src/plugin/cathode'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector'
import type { CellNode } from '@/src/plugin/cell/schema'
import type { SeparatorNode } from '@/src/plugin/separator'
import type { StackNode } from '@/src/plugin/stack/schema'
import {
  CELL_COMPONENT_KINDS,
  type CellComponentKind,
  type CellStructure,
  type CellStructureNode,
} from '@/src/lib/cell-graph/structure-types'
import type { StackThicknessInput } from '../stack/derived'

export type CellGraphComponent = {
  id: string
  node: unknown
}

export type CellGraph = {
  cell: CellNode
  stack: StackNode
  components: Record<CellComponentKind, CellGraphComponent>
  thicknessInput: StackThicknessInput
}

function findChildByType<T extends { type: string }>(
  nodes: Record<string, unknown>,
  childIds: string[],
  type: string,
): T | undefined {
  for (const childId of childIds) {
    const child = nodes[childId] as T | undefined
    if (child?.type === type) return child
  }
  return undefined
}

function buildThicknessInput(
  stack: StackNode,
  cathode: CathodeNode,
  anode: AnodeNode,
  separator: SeparatorNode,
  ccP: CathodeCurrentCollectorNode,
  ccN: AnodeCurrentCollectorNode,
): StackThicknessInput {
  return {
    numberOfLayers: stack.number_of_layers,
    cathodeMassLoading: cathode.cathode_mass_loading,
    cathodeDensity: cathode.cathode_density,
    anodeMassLoading: anode.anode_mass_loading,
    anodeDensity: anode.anode_density,
    separatorThickness: separator.separator_thickness,
    ccPThickness: ccP.cc_p_thickness,
    ccNThickness: ccN.cc_n_thickness,
  }
}

export function resolveCellGraphFromStack(
  nodes: Record<string, unknown>,
  stackNode: StackNode,
): CellGraph | null {
  const cell = stackNode.parentId
    ? (nodes[stackNode.parentId] as CellNode | undefined)
    : undefined
  if (cell?.type !== 'cell') return null

  const childIds = stackNode.children ?? []
  const cathode = findChildByType<CathodeNode>(nodes, childIds, 'cathode')
  const anode = findChildByType<AnodeNode>(nodes, childIds, 'anode')
  const separator = findChildByType<SeparatorNode>(nodes, childIds, 'separator')
  const ccP = findChildByType<CathodeCurrentCollectorNode>(
    nodes,
    childIds,
    'cathode-current-collector',
  )
  const ccN = findChildByType<AnodeCurrentCollectorNode>(
    nodes,
    childIds,
    'anode-current-collector',
  )

  if (!(cathode && anode && separator && ccP && ccN)) return null

  return {
    cell,
    stack: stackNode,
    components: {
      cathode: { id: cathode.id, node: cathode },
      separator: { id: separator.id, node: separator },
      anode: { id: anode.id, node: anode },
      'cathode-current-collector': { id: ccP.id, node: ccP },
      'anode-current-collector': { id: ccN.id, node: ccN },
    },
    thicknessInput: buildThicknessInput(stackNode, cathode, anode, separator, ccP, ccN),
  }
}

export function resolveCellGraph(nodes: Record<string, unknown>): CellGraph | null {
  const cell = Object.values(nodes).find((node) => (node as CellStructureNode).type === 'cell') as
    | CellNode
    | undefined
  const stackId = cell?.children?.find(
    (childId) => (nodes[childId] as CellStructureNode | undefined)?.type === 'stack',
  )
  const stack = stackId ? (nodes[stackId] as StackNode | undefined) : undefined
  if (stack?.type !== 'stack') return null
  return resolveCellGraphFromStack(nodes, stack)
}

export function resolveCellStructure(nodes: Record<string, CellStructureNode>): CellStructure {
  const graph = resolveCellGraph(nodes as Record<string, unknown>)
  if (!graph) return { components: {} }

  const components = {} as Partial<Record<CellComponentKind, string>>
  for (const kind of CELL_COMPONENT_KINDS) {
    components[kind] = graph.components[kind].id
  }

  return {
    cellId: graph.cell.id,
    stackId: graph.stack.id,
    components,
  }
}

export function templateIdsFromGraph(graph: CellGraph): Record<CellComponentKind, string> {
  return {
    cathode: graph.components.cathode.id,
    separator: graph.components.separator.id,
    anode: graph.components.anode.id,
    'cathode-current-collector': graph.components['cathode-current-collector'].id,
    'anode-current-collector': graph.components['anode-current-collector'].id,
  }
}
