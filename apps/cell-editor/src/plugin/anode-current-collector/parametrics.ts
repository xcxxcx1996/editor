import type { ParametricDescriptor } from '@pascal-app/core'
import { AnodeTabYCoordinateField } from '@/src/plugin/shared/tab-y-coordinate-field'
import type { AnodeCurrentCollectorNode } from './schema'

export const anodeCurrentCollectorParametrics: ParametricDescriptor<AnodeCurrentCollectorNode> = {
  groups: [
    {
      label: 'Geometry',
      fields: [{ key: 'cc_n_thickness', kind: 'number', min: 0.0001, step: 0.0001, unit: 'mm' }],
    },
    {
      label: 'Tab',
      fields: [
        { key: 'cc_n_tab_length', kind: 'number', min: 1, step: 1, unit: 'mm' },
        { key: 'cc_n_tab_width', kind: 'number', min: 0.1, step: 1, unit: 'mm' },
        {
          key: 'cc_n_tab_y_coordinate',
          kind: 'custom',
          component: AnodeTabYCoordinateField,
        },
      ],
    },
  ],
}
