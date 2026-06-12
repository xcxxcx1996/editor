export const STACK_UNIT_ORDER = [
  'anode-current-collector',
  'anode',
  'separator',
  'cathode',
  'cathode-current-collector',
  'cathode',
  'separator',
  'anode',
  'anode-current-collector',
] as const

export type StackLayerKind = (typeof STACK_UNIT_ORDER)[number]
