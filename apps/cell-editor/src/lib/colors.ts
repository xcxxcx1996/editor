import type { StackLayerKind } from './layer-order'

export const LAYER_COLORS: Record<StackLayerKind, string> = {
  cathode: '#f5e7c6',
  anode: '#222222',
  separator: '#e0f2fe',
  'cathode-current-collector': '#a6a6a6',
  'anode-current-collector': '#fa8112',
}
