import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const AnodeNode = BaseNode.extend({
  id: objectId('anode'),
  type: nodeType('anode'),
  anode_mass_loading: z.number().positive().default(100),
  anode_density: z.number().positive().default(1_500_000),
  anode_conductivity: z.number().nonnegative().default(100),
  anode_theoretical_capacity: z.number().positive().default(372),
})

export type AnodeNode = z.infer<typeof AnodeNode>
