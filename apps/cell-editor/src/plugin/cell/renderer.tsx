'use client'

import { type AnyNodeId, useRegistry, useScene } from '@pascal-app/core'
import { NodeRenderer } from '@pascal-app/viewer'
import { useRef } from 'react'
import type { Group } from 'three'
import type { StackNode } from '@/src/plugin/stack/schema'
import type { CellNode } from './schema'

const CellRenderer = ({ node }: { node: CellNode }) => {
  const ref = useRef<Group>(null!)
  const nodes = useScene((s) => s.nodes)
  useRegistry(node.id, 'cell', ref)

  const stackId = node.children?.[0]
  const stackNode = stackId ? (nodes[stackId as AnyNodeId] as StackNode | undefined) : undefined

  return <group ref={ref}>{stackId ? <NodeRenderer nodeId={stackId as AnyNodeId} /> : null}</group>
}

export default CellRenderer
