import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const AnodeCurrentCollectorNode = BaseNode.extend({
  id: objectId('anode-current-collector'),
  type: nodeType('anode-current-collector'),
  cc_n_thickness: z.number().positive().default(0.006),
})

export type AnodeCurrentCollectorNode = z.infer<typeof AnodeCurrentCollectorNode>
