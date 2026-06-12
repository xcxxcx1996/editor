import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { separatorParametrics } from './parametrics'
import { SeparatorNode } from './schema'

export const separatorDefinition: NodeDefinition<typeof SeparatorNode> = {
  kind: 'separator',
  schemaVersion: 1,
  schema: SeparatorNode,
  category: 'utility',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    separator_thickness: 0.0078,
    separator_porosity: 0.4,
  }),

  capabilities: {
    deletable: false,
    selectable: { hitVolume: 'bbox' },
  },

  parametrics: separatorParametrics,

  presentation: {
    label: 'Separator',
    description: 'Porous insulator between cathode and anode.',
    icon: { kind: 'iconify', name: 'lucide:separator-horizontal' },
    paletteSection: 'structure',
  },
}

export default separatorDefinition as unknown as AnyNodeDefinition
