import type { AnodeNode } from '@/src/plugin/anode/schema'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector/schema'
import type { CathodeNode } from '@/src/plugin/cathode/schema'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector/schema'
import type { CellNode } from '@/src/plugin/cell/schema'
import type { SeparatorNode } from '@/src/plugin/separator/schema'
import type { StackNode } from '@/src/plugin/stack/schema'
import type { StackLayerKind } from './layer-order'
import type { StackThicknessInput } from './derived'

export type CellStackContext = {
  cell: CellNode
  stack: StackNode
  templates: Record<StackLayerKind, { id: string; node: unknown }>
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

export function resolveCellStackContext(
  nodes: Record<string, unknown>,
  stackNode: StackNode,
): CellStackContext | null {
  const cell = stackNode.parentId
    ? (nodes[stackNode.parentId] as CellNode | undefined)
    : undefined
  if (!cell || cell.type !== 'cell') return null

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
    templates: {
      cathode: { id: cathode.id, node: cathode },
      separator: { id: separator.id, node: separator },
      anode: { id: anode.id, node: anode },
      'cathode-current-collector': { id: ccP.id, node: ccP },
      'anode-current-collector': { id: ccN.id, node: ccN },
    },
    thicknessInput: {
      numberOfLayers: stackNode.number_of_layers,
      cathodeMassLoading: cathode.cathode_mass_loading,
      cathodeDensity: cathode.cathode_density,
      anodeMassLoading: anode.anode_mass_loading,
      anodeDensity: anode.anode_density,
      separatorThickness: separator.separator_thickness,
      ccPThickness: ccP.cc_p_thickness,
      ccNThickness: ccN.cc_n_thickness,
    },
  }
}
