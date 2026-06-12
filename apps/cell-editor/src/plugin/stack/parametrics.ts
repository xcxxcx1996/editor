import type { ParametricDescriptor } from '@pascal-app/core'
import type { StackNode } from './schema'

export const stackParametrics: ParametricDescriptor<StackNode> = {
  groups: [],
  customPanel: () => import('./panel'),
}
