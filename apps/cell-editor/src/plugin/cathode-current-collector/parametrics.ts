import type { ParametricDescriptor } from '@pascal-app/core'
import type { CathodeCurrentCollectorNode } from './schema'

export const cathodeCurrentCollectorParametrics: ParametricDescriptor<CathodeCurrentCollectorNode> =
  {
    groups: [
      {
        label: 'Geometry',
        fields: [{ key: 'cc_p_thickness', kind: 'number', min: 0.0001, step: 0.0001 }],
      },
    ],
  }
