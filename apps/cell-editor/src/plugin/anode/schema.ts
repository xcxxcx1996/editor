import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const AnodeNode = BaseNode.extend({
  id: objectId('anode'),
  type: nodeType('anode'),
  anode_mass_loading: z.number().positive().default(200),
  anode_density: z.number().positive().default(1.3),
  anode_conductivity: z.number().nonnegative().default(100),
  anode_theoretical_density: z.number().positive().default(2.23),
  anode_theoretical_capacity: z.number().positive().default(372),
  anode_specific_capacity: z.number().positive().default(351),
  anode_D50: z.number().positive().default(15),
})

export type AnodeNode = z.infer<typeof AnodeNode>
