import type { AnyNodeDefinition, NodeDefinition, ParametricDescriptor } from '@pascal-app/core'
import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const AnodeNode = BaseNode.extend({
  id: objectId('anode'),
  type: nodeType('anode'),
  anode_mass_loading: z.number().positive(),
  anode_density: z.number().positive(),
  anode_conductivity: z.number().nonnegative(),
  anode_theoretical_density: z.number().positive(),
  anode_theoretical_capacity: z.number().positive(),
  anode_specific_capacity: z.number().positive(),
  anode_D50: z.number().positive(),
})

export type AnodeNode = z.infer<typeof AnodeNode>

const anodeParametrics: ParametricDescriptor<AnodeNode> = {
  groups: [
    {
      label: 'Material',
      fields: [
        {
          key: 'anode_mass_loading',
          kind: 'number',
          max: 500,
          min: 1,
          searchable: true,
          step: 0.1,
          unit: 'g/m^2',
        },
        {
          key: 'anode_density',
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
  customPanel: () => import('./anode/panel'),
}

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
    anode_mass_loading: 200,
    anode_density: 1.3,
    anode_conductivity: 100,
    anode_theoretical_density: 2.23,
    anode_theoretical_capacity: 372,
    anode_specific_capacity: 351,
    anode_D50: 15,
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
