'use client'

import { nodeRegistry, useScene } from '@pascal-app/core'
import { cn } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

type SceneNode = {
  id: string
  type: string
  name?: string
  children?: string[]
}

type TreeNode = {
  id: string
  label: string
  children: TreeNode[]
}

function buildTree(nodes: Record<string, SceneNode>, nodeId: string): TreeNode | null {
  const node = nodes[nodeId]
  if (!node) return null
  const def = nodeRegistry.get(node.type)
  const label = node.name ?? def?.presentation?.label ?? node.type

  return {
    id: node.id,
    label,
    children: (node.children ?? [])
      .map((childId) => buildTree(nodes, childId))
      .filter((child): child is TreeNode => child !== null),
  }
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode
  depth: number
  selectedId: string | undefined
  onSelect: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.id

  return (
    <div>
      <button
        className={cn(
          'flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/60',
          isSelected && 'bg-accent text-accent-foreground',
        )}
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        type="button"
      >
        {hasChildren ? (
          <span
            className="inline-flex shrink-0"
            onClick={(event) => {
              event.stopPropagation()
              setExpanded((value) => !value)
            }}
            onKeyDown={() => undefined}
            role="presentation"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        ) : (
          <span className="inline-block w-3.5 shrink-0" />
        )}
        <span className="truncate">{node.label}</span>
      </button>
      {expanded &&
        node.children.map((child) => (
          <TreeRow
            depth={depth + 1}
            key={child.id}
            node={child}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
    </div>
  )
}

export function CellOutliner() {
  const rootNodeIds = useScene((s) => s.rootNodeIds)
  const nodes = useScene((s) => s.nodes)
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const setSelection = useViewer((s) => s.setSelection)

  const sceneNodes = nodes as unknown as Record<string, SceneNode>

  const trees = useMemo(
    () =>
      rootNodeIds
        .map((id) => buildTree(sceneNodes, id))
        .filter((tree): tree is TreeNode => tree !== null),
    [rootNodeIds, sceneNodes],
  )

  return (
    <div className="flex h-full flex-col border-border/60 border-r bg-background">
      <div className="border-border/60 border-b px-3 py-2 font-medium text-sm">Outliner</div>
      <div className="flex-1 overflow-y-auto p-2">
        {trees.map((tree) => (
          <TreeRow
            depth={0}
            key={tree.id}
            node={tree}
            onSelect={(id) => setSelection({ selectedIds: [id] })}
            selectedId={selectedId}
          />
        ))}
      </div>
    </div>
  )
}
