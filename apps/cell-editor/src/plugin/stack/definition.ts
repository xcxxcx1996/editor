import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { stackParametrics } from './parametrics'
import { StackNode } from './schema'

export const stackDefinition: NodeDefinition<typeof StackNode> = {
  kind: 'stack',
  schemaVersion: 1,
  schema: StackNode,
  category: 'utility',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    number_of_layers: 27,
    children: [],
  }),

  capabilities: {
    deletable: false,
    selectable: { hitVolume: 'bbox' },
  },

  parametrics: stackParametrics,

  renderer: {
    kind: 'parametric',
    module: () => import('./renderer'),
  },

  presentation: {
    label: 'Stack',
    description: 'Layered stack — materialises physical layers at render time.',
    icon: { kind: 'iconify', name: 'lucide:layers' },
    paletteSection: 'structure',
  },
}

export default stackDefinition as unknown as AnyNodeDefinition
