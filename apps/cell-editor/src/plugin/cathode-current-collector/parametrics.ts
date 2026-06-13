import type { ParametricDescriptor } from '@pascal-app/core'
import { CathodeTabYCoordinateField } from '@/src/plugin/shared/tab-y-coordinate-field'
import type { CathodeCurrentCollectorNode } from './schema'

export const cathodeCurrentCollectorParametrics: ParametricDescriptor<CathodeCurrentCollectorNode> =
  {
    groups: [
      {
        label: 'Geometry',
        fields: [{ key: 'cc_p_thickness', kind: 'number', min: 0.0001, step: 0.0001, unit: 'mm' }],
      },
      {
        label: 'Tab',
        fields: [
          { key: 'cc_p_tab_length', kind: 'number', min: 1, step: 1, unit: 'mm' },
          { key: 'cc_p_tab_width', kind: 'number', min: 0.1, step: 1, unit: 'mm' },
          {
            key: 'cc_p_tab_y_coordinate',
            kind: 'custom',
            component: CathodeTabYCoordinateField,
          },
        ],
      },
    ],
  }
