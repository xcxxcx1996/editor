import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const AnodeCurrentCollectorNode = BaseNode.extend({
  id: objectId('anode-current-collector'),
  type: nodeType('anode-current-collector'),
  cc_n_thickness: z.number().positive().default(0.006),
  cc_n_tab_length: z.number().min(1).default(30),
  cc_n_tab_width: z.number().min(0.1).default(80),
  cc_n_tab_y_coordinate: z.number().default(50),
})

export type AnodeCurrentCollectorNode = z.infer<typeof AnodeCurrentCollectorNode>
