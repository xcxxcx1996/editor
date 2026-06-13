import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { cellParametrics } from './parametrics'
import { CellNode } from './schema'

export const cellDefinition: NodeDefinition<typeof CellNode> = {
  kind: 'cell',
  schemaVersion: 2,
  schema: CellNode,
  category: 'utility',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    electrode_length: 400,
    electrode_width: 100,
    cc_position: 'opposite',
    children: [],
  }),

  capabilities: {
    deletable: false,
    selectable: { hitVolume: 'bbox' },
  },

  parametrics: cellParametrics,

  renderer: {
    kind: 'parametric',
    module: () => import('./renderer'),
  },

  presentation: {
    label: 'Cell',
    description: 'Root electrochemical cell — owns in-plane electrode dimensions.',
    icon: { kind: 'iconify', name: 'lucide:battery' },
    paletteSection: 'structure',
  },
}

export default cellDefinition as unknown as AnyNodeDefinition
