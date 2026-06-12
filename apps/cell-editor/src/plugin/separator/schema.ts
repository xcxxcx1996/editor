import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const SeparatorNode = BaseNode.extend({
  id: objectId('separator'),
  type: nodeType('separator'),
  separator_thickness: z.number().positive().default(0.0078),
  separator_porosity: z.number().min(0).max(1).default(0.4),
})

export type SeparatorNode = z.infer<typeof SeparatorNode>
