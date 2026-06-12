import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const CathodeCurrentCollectorNode = BaseNode.extend({
  id: objectId('cathode-current-collector'),
  type: nodeType('cathode-current-collector'),
  cc_p_thickness: z.number().positive().default(0.013),
})

export type CathodeCurrentCollectorNode = z.infer<typeof CathodeCurrentCollectorNode>
