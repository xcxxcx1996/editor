import type { AnyNodeDefinition, NodeDefinition, ParametricDescriptor } from '@pascal-app/core'
import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const SeparatorNode = BaseNode.extend({
  id: objectId('separator'),
  type: nodeType('separator'),
  separator_thickness: z.number().positive(),
  separator_porosity: z.number().min(0).max(1),
})

export type SeparatorNode = z.infer<typeof SeparatorNode>

const separatorParametrics: ParametricDescriptor<SeparatorNode> = {
  groups: [
    {
      label: 'Geometry',
      fields: [
        {
          key: 'separator_thickness',
          kind: 'number',
          min: 0.0001,
          searchable: true,
          step: 0.0001,
          unit: 'mm',
        },
      ],
    },
    {
      label: 'Material',
      fields: [
        {
          key: 'separator_porosity',
          kind: 'number',
          max: 1,
          min: 0,
          searchable: true,
          step: 0.01,
        },
      ],
    },
  ],
  customPanel: () => import('./separator/panel'),
}

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
