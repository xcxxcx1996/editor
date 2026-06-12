import type { ParametricDescriptor } from '@pascal-app/core'
import type { AnodeCurrentCollectorNode } from './schema'

export const anodeCurrentCollectorParametrics: ParametricDescriptor<AnodeCurrentCollectorNode> = {
  groups: [
    {
      label: 'Geometry',
      fields: [{ key: 'cc_n_thickness', kind: 'number', min: 0.0001, step: 0.0001 }],
    },
  ],
}
