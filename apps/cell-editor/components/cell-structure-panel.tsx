'use client'

import { type AnyNodeId, nodeRegistry, useScene } from '@pascal-app/core'
import { cn } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import {
  CELL_COMPONENT_KINDS,
  type CellStructureNode,
  resolveCellStructure,
} from '@/src/lib/cell-structure'
import { renderPresentationIcon } from '@/src/plugin/shared/presentation-icon'

type CellTreeRowProps = {
  nodeId: string
  depth: number
  icon: React.ReactNode
  label: React.ReactNode
  hasChildren?: boolean
  isSelected: boolean
  isHovered: boolean
  isLast?: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function CellTreeRow({
  nodeId,
  depth,
  icon,
  label,
  hasChildren,
  isSelected,
  isHovered,
  isLast,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CellTreeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  return (
    <div data-treenode-id={nodeId}>
      <div
        className={cn(
          'group/row relative flex h-8 cursor-pointer select-none items-center border-border/50 border-r border-r-transparent border-b text-sm transition-all duration-200',
          isSelected
            ? 'border-r-3 border-r-white bg-accent/50 text-foreground'
            : isHovered
              ? 'bg-accent/30 text-foreground'
              : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
        )}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        ref={rowRef}
        style={{ paddingLeft: depth * 12 + 12, paddingRight: 12 }}
      >
        {depth > 0 && (
          <>
            <div
              className={cn(
                'pointer-events-none absolute w-px bg-border/50',
                isLast ? 'top-0 bottom-1/2' : 'top-0 bottom-0',
              )}
              style={{ left: (depth - 1) * 12 + 20 }}
            />
            <div
              className="pointer-events-none absolute top-1/2 h-px bg-border/50"
              style={{ left: (depth - 1) * 12 + 20, width: 4 }}
            />
          </>
        )}
        {hasChildren && (
          <div
            className="pointer-events-none absolute top-1/2 bottom-0 w-px bg-border/50"
            style={{ left: depth * 12 + 20 }}
          />
        )}

        <button
          className="z-10 flex h-4 w-4 shrink-0 items-center justify-center bg-inherit"
          onClick={(event) => event.stopPropagation()}
          type="button"
        >
          {hasChildren ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" /> : null}
        </button>

        <div
          className={cn(
            'z-10 ml-1 flex h-4 w-4 shrink-0 items-center justify-center transition-all',
            !isSelected && 'opacity-60 grayscale',
          )}
        >
          {icon}
        </div>

        <div className="z-10 ml-2 min-w-0 flex-1 truncate">{label}</div>
      </div>
    </div>
  )
}

export function CellStructurePanel() {
  const nodes = useScene((s) => s.nodes)
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const hoveredId = useViewer((s) => s.hoveredId)
  const setSelection = useViewer((s) => s.setSelection)

  const sceneNodes = nodes as unknown as Record<string, CellStructureNode>
  const structure = useMemo(() => resolveCellStructure(sceneNodes), [sceneNodes])
  const cell = structure.cellId ? sceneNodes[structure.cellId] : undefined
  const cellDef = cell ? nodeRegistry.get(cell.type) : undefined

  const handleMouseEnter = (nodeId: string) => {
    useViewer.setState({ hoveredId: nodeId as AnyNodeId })
  }

  const handleMouseLeave = () => {
    useViewer.setState({ hoveredId: null })
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-[68px] shrink-0 items-center justify-between border-border/50 border-b px-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          {renderPresentationIcon(cellDef?.presentation?.icon)}
          <span className="font-semibold text-xl">Cell Editor</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {structure.cellId && (
          <CellTreeRow
            depth={0}
            hasChildren
            icon={renderPresentationIcon(cellDef?.presentation?.icon)}
            isHovered={hoveredId === structure.cellId}
            isSelected={selectedId === structure.cellId || selectedId === structure.stackId}
            label={cell?.name ?? cellDef?.presentation?.label ?? 'Cell'}
            nodeId={structure.cellId}
            onClick={() => setSelection({ selectedIds: [structure.cellId!] })}
            onMouseEnter={() => handleMouseEnter(structure.cellId!)}
            onMouseLeave={handleMouseLeave}
          />
        )}
        {CELL_COMPONENT_KINDS.map((kind, index) => {
          const nodeId = structure.components[kind]
          if (!nodeId) return null
          const node = sceneNodes[nodeId]
          const def = nodeRegistry.get(kind)
          return (
            <CellTreeRow
              depth={1}
              hasChildren={false}
              icon={renderPresentationIcon(def?.presentation?.icon)}
              isHovered={hoveredId === nodeId}
              isLast={index === CELL_COMPONENT_KINDS.length - 1}
              isSelected={selectedId === nodeId}
              key={kind}
              label={node?.name ?? def?.presentation?.label ?? kind}
              nodeId={nodeId}
              onClick={() => setSelection({ selectedIds: [nodeId] })}
              onMouseEnter={() => handleMouseEnter(nodeId)}
              onMouseLeave={handleMouseLeave}
            />
          )
        })}
      </div>
    </div>
  )
}
