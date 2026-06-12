import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const CellNode = BaseNode.extend({
  id: objectId('cell'),
  type: nodeType('cell'),
  electrode_length: z.number().positive().default(1000),
  electrode_width: z.number().positive().default(500),
  children: z.array(z.string()).default([]),
})

export type CellNode = z.infer<typeof CellNode>
