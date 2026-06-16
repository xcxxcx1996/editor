export const CELL_COMPONENT_KINDS = [
  'cathode',
  'anode',
  'separator',
  'cathode-current-collector',
  'anode-current-collector',
] as const

export type CellComponentKind = (typeof CELL_COMPONENT_KINDS)[number]

export type CellStructureNode = {
  id: string
  type: string
  name?: string
  children?: string[]
}

export type CellStructure = {
  cellId?: string
  stackId?: string
  components: Partial<Record<CellComponentKind, string>>
}
