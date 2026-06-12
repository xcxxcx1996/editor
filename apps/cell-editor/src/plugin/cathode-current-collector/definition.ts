import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { cathodeCurrentCollectorParametrics } from './parametrics'
import { CathodeCurrentCollectorNode } from './schema'

export const cathodeCurrentCollectorDefinition: NodeDefinition<typeof CathodeCurrentCollectorNode> =
  {
    kind: 'cathode-current-collector',
    schemaVersion: 1,
    schema: CathodeCurrentCollectorNode,
    category: 'utility',

    defaults: () => ({
      object: 'node',
      parentId: null,
      visible: true,
      metadata: {},
      cc_p_thickness: 0.013,
    }),

    capabilities: {
      deletable: false,
      selectable: { hitVolume: 'bbox' },
    },

    parametrics: cathodeCurrentCollectorParametrics,

    presentation: {
      label: 'Cathode CC',
      description: 'Cathode-side current collector foil.',
      icon: { kind: 'iconify', name: 'lucide:sheet' },
      paletteSection: 'structure',
    },
  }

export default cathodeCurrentCollectorDefinition as unknown as AnyNodeDefinition
