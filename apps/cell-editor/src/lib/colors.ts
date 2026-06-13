import type { StackLayerKind } from './layer-order'

export const LAYER_COLORS: Record<StackLayerKind, string> = {
  cathode: '#f5e7c6',
  anode: '#222222',
  separator: '#e0f2fe',
  'cathode-current-collector': '#757575',
  'anode-current-collector': '#fa8112',
}
