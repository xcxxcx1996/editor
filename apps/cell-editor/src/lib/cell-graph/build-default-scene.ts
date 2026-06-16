import type { SceneGraph } from '@pascal-app/core'
import { generateId } from '@pascal-app/core/schema'
import { anodeDefinition } from '@/src/plugin/anode'
import { anodeCurrentCollectorDefinition } from '@/src/plugin/anode-current-collector'
import { cathodeDefinition } from '@/src/plugin/cathode'
import { cathodeCurrentCollectorDefinition } from '@/src/plugin/cathode-current-collector'
import { cellDefinition } from '@/src/plugin/cell/definition'
import { separatorDefinition } from '@/src/plugin/separator'
import { stackDefinition } from '@/src/plugin/stack/definition'

const COMPONENT_DEFINITIONS = [
  cathodeDefinition,
  anodeDefinition,
  separatorDefinition,
  cathodeCurrentCollectorDefinition,
  anodeCurrentCollectorDefinition,
] as const

const COMPONENT_NAMES: Record<string, string> = {
  cathode: 'Cathode',
  anode: 'Anode',
  separator: 'Separator',
  'cathode-current-collector': 'Cathode CC',
  'anode-current-collector': 'Anode CC',
}

export function buildDefaultScene(): SceneGraph {
  const cellId = generateId('cell')
  const stackId = generateId('stack')
  const componentIds = COMPONENT_DEFINITIONS.map((definition) => generateId(definition.kind))

  const cellDefaults = cellDefinition.defaults()
  const electrodeWidth =
    typeof cellDefaults.electrode_width === 'number' ? cellDefaults.electrode_width : 100

  const cell = {
    ...cellDefaults,
    id: cellId,
    type: 'cell' as const,
    name: 'Cell',
    parentId: null,
    children: [stackId],
  }

  const stack = {
    ...stackDefinition.defaults(),
    id: stackId,
    type: 'stack' as const,
    name: 'Stack',
    parentId: cellId,
    children: componentIds,
  }

  const nodes: Record<string, unknown> = {
    [cellId]: cell,
    [stackId]: stack,
  }

  for (const [index, definition] of COMPONENT_DEFINITIONS.entries()) {
    const id = componentIds[index]!
    const defaults = definition.defaults() as Record<string, unknown>
    const node: Record<string, unknown> = {
      ...defaults,
      id,
      type: definition.kind,
      name: COMPONENT_NAMES[definition.kind] ?? definition.kind,
      parentId: stackId,
      visible: true,
      metadata: defaults.metadata ?? {},
    }

    if (definition.kind === 'cathode-current-collector') {
      node.cc_p_tab_y_coordinate = electrodeWidth / 2
    }
    if (definition.kind === 'anode-current-collector') {
      node.cc_n_tab_y_coordinate = electrodeWidth / 2
    }

    nodes[id] = node
  }

  return {
    nodes,
    rootNodeIds: [cellId],
  } as unknown as SceneGraph
}
