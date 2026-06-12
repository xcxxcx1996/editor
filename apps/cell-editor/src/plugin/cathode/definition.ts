import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { cathodeParametrics } from './parametrics'
import { CathodeNode } from './schema'

export const cathodeDefinition: NodeDefinition<typeof CathodeNode> = {
  kind: 'cathode',
  schemaVersion: 1,
  schema: CathodeNode,
  category: 'utility',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    cathode_mass_loading: 200,
    cathode_density: 2_100_000,
    cathode_conductivity: 10,
    cathode_theoretical_capacity: 170,
  }),

  capabilities: {
    deletable: false,
    selectable: { hitVolume: 'bbox' },
  },

  parametrics: cathodeParametrics,

  presentation: {
    label: 'Cathode',
    description: 'Positive electrode template — coating material parameters.',
    icon: { kind: 'iconify', name: 'lucide:plus' },
    paletteSection: 'structure',
  },
}

export default cathodeDefinition as unknown as AnyNodeDefinition
