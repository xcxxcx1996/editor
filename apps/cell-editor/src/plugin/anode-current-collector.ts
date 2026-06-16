import type { AnyNodeDefinition, NodeDefinition, ParametricDescriptor } from '@pascal-app/core'
import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { AnodeTabYCoordinateField } from '@/src/plugin/shared/tab-y-coordinate-field'
import { z } from 'zod'

export const AnodeCurrentCollectorNode = BaseNode.extend({
  id: objectId('anode-current-collector'),
  type: nodeType('anode-current-collector'),
  cc_n_thickness: z.number().positive(),
  cc_n_tab_length: z.number().min(1),
  cc_n_tab_width: z.number().min(0.1),
  cc_n_tab_y_coordinate: z.number(),
})

export type AnodeCurrentCollectorNode = z.infer<typeof AnodeCurrentCollectorNode>

const anodeCurrentCollectorParametrics: ParametricDescriptor<AnodeCurrentCollectorNode> = {
  groups: [
    {
      label: 'Geometry',
      fields: [
        {
          key: 'cc_n_thickness',
          kind: 'number',
          min: 0.0001,
          searchable: true,
          step: 0.0001,
          unit: 'mm',
        },
      ],
    },
    {
      label: 'Tab',
      fields: [
        {
          key: 'cc_n_tab_length',
          kind: 'number',
          min: 1,
          searchable: true,
          step: 0.1,
          unit: 'mm',
        },
        {
          key: 'cc_n_tab_width',
          kind: 'number',
          min: 0.1,
          searchable: true,
          step: 0.1,
          unit: 'mm',
        },
        {
          key: 'cc_n_tab_y_coordinate',
          kind: 'custom',
          component: AnodeTabYCoordinateField,
        },
      ],
    },
  ],
  customPanel: () => import('./anode-current-collector/panel'),
}

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
