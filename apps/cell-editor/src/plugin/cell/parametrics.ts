import type { ParametricDescriptor } from '@pascal-app/core'
import type { CellNode } from './schema'

export const cellParametrics: ParametricDescriptor<CellNode> = {
  groups: [],
  customPanel: () => import('./panel'),
}
