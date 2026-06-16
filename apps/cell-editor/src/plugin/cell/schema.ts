import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const CellNode = BaseNode.extend({
  id: objectId('cell'),
  type: nodeType('cell'),
  electrode_length: z.number().positive(),
  electrode_width: z.number().positive(),
  electrolyte_concentration: z.number().nonnegative(),
  electrolyte_level_ratio: z.number().min(0).max(1),
  cc_position: z.enum(['opposite', 'same']),
  children: z.array(z.string()),
})

export type CellNode = z.infer<typeof CellNode>
