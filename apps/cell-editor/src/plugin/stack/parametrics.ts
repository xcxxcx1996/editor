import type { ParametricDescriptor } from '@pascal-app/core'
import type { StackNode } from './schema'

export const stackParametrics: ParametricDescriptor<StackNode> = {
  groups: [
    {
      label: 'Geometry',
      fields: [
        { key: 'number_of_layers', kind: 'number', max: 100, min: 1, searchable: true, step: 1 },
      ],
    },
  ],
  customPanel: () => import('./panel'),
}
