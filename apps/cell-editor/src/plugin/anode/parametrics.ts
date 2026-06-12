import type { ParametricDescriptor } from '@pascal-app/core'
import type { AnodeNode } from './schema'

export const anodeParametrics: ParametricDescriptor<AnodeNode> = {
  groups: [],
  customPanel: () => import('./panel'),
}
