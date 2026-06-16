import { describe, expect, test } from 'bun:test'
import { createDefaultCellScene } from '../scene/defaults'
import { totalStackHeight } from '../stack/derived'
import {
  resolveCellGraph,
  resolveCellGraphFromStack,
  resolveCellStructure,
  templateIdsFromGraph,
} from './resolve'
import type { StackNode } from '@/src/plugin/stack/schema'

describe('resolveCellGraph', () => {
  test('resolves default scene with all component kinds', () => {
    const scene = createDefaultCellScene()
    const graph = resolveCellGraph(scene.nodes as Record<string, unknown>)

    expect(graph).not.toBeNull()
    expect(graph?.cell.type).toBe('cell')
    expect(graph?.stack.type).toBe('stack')
    expect(graph?.components.cathode.id).toBeTruthy()
    expect(graph?.components.anode.id).toBeTruthy()
    expect(graph?.components.separator.id).toBeTruthy()
    expect(graph?.components['cathode-current-collector'].id).toBeTruthy()
    expect(graph?.components['anode-current-collector'].id).toBeTruthy()
  })

  test('returns null when a component kind is missing', () => {
    const scene = createDefaultCellScene()
    const nodes = { ...(scene.nodes as Record<string, unknown>) }
    const stack = Object.values(nodes).find((node) => (node as { type?: string }).type === 'stack') as
      | StackNode
      | undefined
    if (!stack) throw new Error('missing stack')

    nodes[stack.id] = {
      ...stack,
      children: stack.children?.filter((childId) => nodes[childId]?.type !== 'anode'),
    }

    expect(resolveCellGraph(nodes)).toBeNull()
  })

  test('builds thicknessInput compatible with totalStackHeight', () => {
    const scene = createDefaultCellScene()
    const graph = resolveCellGraph(scene.nodes as Record<string, unknown>)
    expect(graph).not.toBeNull()
    if (!graph) return

    expect(totalStackHeight(graph.thicknessInput)).toBeGreaterThan(0)
  })

  test('resolveCellGraphFromStack matches resolveCellGraph', () => {
    const scene = createDefaultCellScene()
    const nodes = scene.nodes as Record<string, unknown>
    const graph = resolveCellGraph(nodes)
    const stack = graph?.stack
    expect(stack).toBeDefined()
    if (!stack) return

    expect(resolveCellGraphFromStack(nodes, stack)).toEqual(graph)
  })
})

describe('resolveCellStructure', () => {
  test('delegates to resolveCellGraph', () => {
    const scene = createDefaultCellScene()
    const nodes = scene.nodes as Record<string, { id: string; type: string; children?: string[] }>
    const structure = resolveCellStructure(nodes)
    const graph = resolveCellGraph(nodes)

    expect(structure.cellId).toBe(graph?.cell.id)
    expect(structure.stackId).toBe(graph?.stack.id)
    expect(structure.components.cathode).toBe(graph?.components.cathode.id)
  })
})

describe('templateIdsFromGraph', () => {
  test('returns ids for all component kinds', () => {
    const scene = createDefaultCellScene()
    const graph = resolveCellGraph(scene.nodes as Record<string, unknown>)
    expect(graph).not.toBeNull()
    if (!graph) return

    expect(templateIdsFromGraph(graph)).toEqual({
      cathode: graph.components.cathode.id,
      separator: graph.components.separator.id,
      anode: graph.components.anode.id,
      'cathode-current-collector': graph.components['cathode-current-collector'].id,
      'anode-current-collector': graph.components['anode-current-collector'].id,
    })
  })
})
