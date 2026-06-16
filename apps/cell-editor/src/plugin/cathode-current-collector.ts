import type { AnyNodeDefinition, NodeDefinition, ParametricDescriptor } from '@pascal-app/core'
import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { CathodeTabYCoordinateField } from '@/src/plugin/shared/tab-y-coordinate-field'
import { z } from 'zod'

export const CathodeCurrentCollectorNode = BaseNode.extend({
  id: objectId('cathode-current-collector'),
  type: nodeType('cathode-current-collector'),
  cc_p_thickness: z.number().positive(),
  cc_p_tab_length: z.number().min(1),
  cc_p_tab_width: z.number().min(0.1),
  cc_p_tab_y_coordinate: z.number(),
})

export type CathodeCurrentCollectorNode = z.infer<typeof CathodeCurrentCollectorNode>

const cathodeCurrentCollectorParametrics: ParametricDescriptor<CathodeCurrentCollectorNode> = {
  groups: [
    {
      label: 'Geometry',
      fields: [
        {
          key: 'cc_p_thickness',
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
          key: 'cc_p_tab_length',
          kind: 'number',
          min: 1,
          searchable: true,
          step: 0.1,
          unit: 'mm',
        },
        {
          key: 'cc_p_tab_width',
          kind: 'number',
          min: 0.1,
          searchable: true,
          step: 0.1,
          unit: 'mm',
        },
        {
          key: 'cc_p_tab_y_coordinate',
          kind: 'custom',
          component: CathodeTabYCoordinateField,
        },
      ],
    },
  ],
  customPanel: () => import('./cathode-current-collector/panel'),
}

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
