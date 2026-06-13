import type { ParametricDescriptor } from '@pascal-app/core'
import type { SeparatorNode } from './schema'

export const separatorParametrics: ParametricDescriptor<SeparatorNode> = {
  groups: [
    {
      label: 'Geometry',
      fields: [
        { key: 'separator_thickness', kind: 'number', min: 0.0001, step: 0.0001, unit: 'mm' },
      ],
    },
    {
      label: 'Material',
      fields: [{ key: 'separator_porosity', kind: 'number', min: 0, max: 1, step: 0.01 }],
    },
  ],
}
