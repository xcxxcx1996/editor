import type { ParametricDescriptor } from '@pascal-app/core'
import type { CathodeNode } from './schema'

export const cathodeParametrics: ParametricDescriptor<CathodeNode> = {
  groups: [],
  customPanel: () => import('./panel'),
}
