import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const StackNode = BaseNode.extend({
  id: objectId('stack'),
  type: nodeType('stack'),
  number_of_layers: z.number().int().min(1).default(27),
  children: z.array(z.string()).default([]),
})

export type StackNode = z.infer<typeof StackNode>
