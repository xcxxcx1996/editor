import type { AnyNodeDefinition, NodeDefinition, ParametricDescriptor } from '@pascal-app/core'
import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const CathodeNode = BaseNode.extend({
  id: objectId('cathode'),
  type: nodeType('cathode'),
  cathode_mass_loading: z.number().positive(),
  cathode_density: z.number().positive(),
  cathode_conductivity: z.number().nonnegative(),
  cathode_theoretical_density: z.number().positive(),
  cathode_theoretical_capacity: z.number().positive(),
  cathode_specific_capacity: z.number().positive(),
  cathode_D50: z.number().positive(),
})

export type CathodeNode = z.infer<typeof CathodeNode>

const cathodeParametrics: ParametricDescriptor<CathodeNode> = {
  groups: [
    {
      label: 'Material',
      fields: [
        {
          key: 'cathode_mass_loading',
          kind: 'number',
          max: 500,
          min: 1,
          searchable: true,
          step: 0.1,
          unit: 'g/m^2',
        },
        {
          key: 'cathode_density',
          kind: 'number',
          max: 5,
          min: 0.1,
          searchable: true,
          step: 0.01,
          unit: 'g/cm^3',
        },
      ],
    },
  ],
  customPanel: () => import('./cathode/panel'),
}

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
    cathode_mass_loading: 500,
    cathode_density: 2.1,
    cathode_conductivity: 10,
    cathode_theoretical_density: 3.6,
    cathode_theoretical_capacity: 170,
    cathode_specific_capacity: 161,
    cathode_D50: 1,
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
