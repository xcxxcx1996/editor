import { describe, expect, test } from 'bun:test'
import { resolveComponentActionNodeId, resolveShortcutActionId } from './component-actions'

const structure = {
  cellId: 'cell_1',
  stackId: 'stack_1',
  components: {
    cathode: 'cathode_1',
    anode: 'anode_1',
    separator: 'separator_1',
    'cathode-current-collector': 'cc_p_1',
    'anode-current-collector': 'cc_n_1',
  },
}

describe('component actions', () => {
  test('maps fixed component actions to scene node ids', () => {
    expect(resolveComponentActionNodeId(structure, 'cell')).toBe('cell_1')
    expect(resolveComponentActionNodeId(structure, 'cathode')).toBe('cathode_1')
    expect(resolveComponentActionNodeId(structure, 'anode-current-collector')).toBe('cc_n_1')
  })

  test('maps Ctrl/Cmd+1..6 to fixed component actions', () => {
    expect(resolveShortcutActionId({ key: '1', ctrlKey: true, metaKey: false })).toBe('cell')
    expect(resolveShortcutActionId({ key: '3', ctrlKey: false, metaKey: true })).toBe('anode')
    expect(resolveShortcutActionId({ key: '5', ctrlKey: true, metaKey: false })).toBe(
      'anode-current-collector',
    )
    expect(resolveShortcutActionId({ key: '6', ctrlKey: true, metaKey: false })).toBe(
      'cathode-current-collector',
    )
  })

  test('ignores shortcuts outside the fixed component range', () => {
    expect(resolveShortcutActionId({ key: '7', ctrlKey: true, metaKey: false })).toBeNull()
    expect(resolveShortcutActionId({ key: '1', ctrlKey: false, metaKey: false })).toBeNull()
  })
})
