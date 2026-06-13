import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const CathodeCurrentCollectorNode = BaseNode.extend({
  id: objectId('cathode-current-collector'),
  type: nodeType('cathode-current-collector'),
  cc_p_thickness: z.number().positive().default(0.013),
  cc_p_tab_length: z.number().min(1).default(30),
  cc_p_tab_width: z.number().min(0.1).default(80),
  cc_p_tab_y_coordinate: z.number().default(50),
})

export type CathodeCurrentCollectorNode = z.infer<typeof CathodeCurrentCollectorNode>
