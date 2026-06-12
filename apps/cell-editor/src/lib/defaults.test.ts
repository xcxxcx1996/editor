import { describe, expect, test } from 'bun:test'
import { createDefaultCellScene } from './defaults'

describe('createDefaultCellScene', () => {
  test('creates seven nodes with correct hierarchy', () => {
    const scene = createDefaultCellScene()
    expect(Object.keys(scene.nodes)).toHaveLength(7)
    expect(scene.rootNodeIds).toHaveLength(1)

    const cellId = scene.rootNodeIds[0]
    const cell = scene.nodes[cellId]
    expect(cell?.type).toBe('cell')

    const stackId = (cell as { children?: string[] }).children?.[0]
    expect(stackId).toBeDefined()
    const stack = stackId ? scene.nodes[stackId] : undefined
    expect(stack?.type).toBe('stack')
    expect((stack as { children?: string[] }).children).toHaveLength(5)
  })
})
