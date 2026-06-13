import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { cathodeCurrentCollectorParametrics } from './parametrics'
import { CathodeCurrentCollectorNode } from './schema'

export const cathodeCurrentCollectorDefinition: NodeDefinition<typeof CathodeCurrentCollectorNode> =
  {
    kind: 'cathode-current-collector',
    schemaVersion: 2,
    schema: CathodeCurrentCollectorNode,
    category: 'utility',

    defaults: () => ({
      object: 'node',
      parentId: null,
      visible: true,
      metadata: {},
      cc_p_thickness: 0.013,
      cc_p_tab_length: 30,
      cc_p_tab_width: 80,
      cc_p_tab_y_coordinate: 50,
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
