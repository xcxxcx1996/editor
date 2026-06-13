import type { AnyNodeDefinition, NodeDefinition } from '@pascal-app/core'
import { anodeCurrentCollectorParametrics } from './parametrics'
import { AnodeCurrentCollectorNode } from './schema'

export const anodeCurrentCollectorDefinition: NodeDefinition<typeof AnodeCurrentCollectorNode> = {
  kind: 'anode-current-collector',
  schemaVersion: 2,
  schema: AnodeCurrentCollectorNode,
  category: 'utility',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    cc_n_thickness: 0.006,
    cc_n_tab_length: 30,
    cc_n_tab_width: 80,
    cc_n_tab_y_coordinate: 50,
  }),

  capabilities: {
    deletable: false,
    selectable: { hitVolume: 'bbox' },
  },

  parametrics: anodeCurrentCollectorParametrics,

  presentation: {
    label: 'Anode CC',
    description: 'Anode-side current collector foil (outer wrap).',
    icon: { kind: 'iconify', name: 'lucide:sheet' },
    paletteSection: 'structure',
  },
}

export default anodeCurrentCollectorDefinition as unknown as AnyNodeDefinition
