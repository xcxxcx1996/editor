import type { StackLayerKind } from './layer-order'

export const LAYER_COLORS: Record<StackLayerKind, string> = {
  cathode: '#e85d5d',
  anode: '#5d8de8',
  separator: '#f0e68c',
  'cathode-current-collector': '#c0c0c0',
  'anode-current-collector': '#a8a8a8',
}
