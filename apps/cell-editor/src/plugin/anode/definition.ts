import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { anodeParametrics } from './parametrics'
import { AnodeNode } from './schema'

export const anodeDefinition: NodeDefinition<typeof AnodeNode> = {
  kind: 'anode',
  schemaVersion: 1,
  schema: AnodeNode,
  category: 'utility',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    anode_mass_loading: 100,
    anode_density: 1_500_000,
    anode_conductivity: 100,
    anode_theoretical_capacity: 372,
  }),

  capabilities: {
    deletable: false,
    selectable: { hitVolume: 'bbox' },
  },

  parametrics: anodeParametrics,

  presentation: {
    label: 'Anode',
    description: 'Negative electrode template — coating material parameters.',
    icon: { kind: 'iconify', name: 'lucide:minus' },
    paletteSection: 'structure',
  },
}

export default anodeDefinition as unknown as AnyNodeDefinition
