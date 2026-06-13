import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const CathodeNode = BaseNode.extend({
  id: objectId('cathode'),
  type: nodeType('cathode'),
  cathode_mass_loading: z.number().positive().default(500),
  cathode_density: z.number().positive().default(2.1),
  cathode_conductivity: z.number().nonnegative().default(10),
  cathode_theoretical_density: z.number().positive().default(3.6),
  cathode_theoretical_capacity: z.number().positive().default(170),
  cathode_specific_capacity: z.number().positive().default(161),
  cathode_D50: z.number().positive().default(1),
})

export type CathodeNode = z.infer<typeof CathodeNode>
