import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const CathodeNode = BaseNode.extend({
  id: objectId('cathode'),
  type: nodeType('cathode'),
  cathode_mass_loading: z.number().positive().default(200),
  cathode_density: z.number().positive().default(2_100_000),
  cathode_conductivity: z.number().nonnegative().default(10),
  cathode_theoretical_capacity: z.number().positive().default(170),
})

export type CathodeNode = z.infer<typeof CathodeNode>
