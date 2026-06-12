import type { CellComponentKind, CellStructure } from './cell-structure'

export type CellComponentActionId = 'cell' | CellComponentKind

export type CellComponentAction = {
  id: CellComponentActionId
  label: string
  fullName: string
  shortcut: string
}

export const CELL_COMPONENT_ACTIONS: readonly CellComponentAction[] = [
  { id: 'cell', label: 'Cell', fullName: 'Cell', shortcut: 'Ctrl/Cmd+1' },
  { id: 'cathode', label: 'Cathode', fullName: 'Cathode', shortcut: 'Ctrl/Cmd+2' },
  { id: 'anode', label: 'Anode', fullName: 'Anode', shortcut: 'Ctrl/Cmd+3' },
  { id: 'separator', label: 'Separator', fullName: 'Separator', shortcut: 'Ctrl/Cmd+4' },
  {
    id: 'anode-current-collector',
    label: 'Cu',
    fullName: 'Anode current collector',
    shortcut: 'Ctrl/Cmd+5',
  },
  {
    id: 'cathode-current-collector',
    label: 'Al',
    fullName: 'Cathode current collector',
    shortcut: 'Ctrl/Cmd+6',
  },
]

export function resolveComponentActionNodeId(
  structure: CellStructure,
  actionId: CellComponentActionId,
): string | undefined {
  return actionId === 'cell' ? structure.cellId : structure.components[actionId]
}

export function resolveShortcutActionId(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>) {
  if (!(event.metaKey || event.ctrlKey)) return null
  const index = Number(event.key) - 1
  return CELL_COMPONENT_ACTIONS[index]?.id ?? null
}
