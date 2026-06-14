'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { cn } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import {
  ChevronsUpDown,
  Layers,
  LayersMinus,
  LayersPlus,
  Maximize,
  Scale3d,
  TableRowsSplit,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { type CellStructureNode, resolveCellStructure } from '@/src/lib/cell-structure'
import {
  CELL_COMPONENT_ACTIONS,
  type CellComponentActionId,
  resolveComponentActionNodeId,
  resolveShortcutActionId,
} from '@/src/lib/component-actions'
import {
  isPresentationThicknessExaggerated,
  toggleExplodedPresentation,
  togglePresentationThicknessScale,
  useExplodedPresentation,
  usePresentationThicknessScale,
} from '@/src/lib/presentation-thickness'

function CollectorIcon({ label }: { label: string }) {
  return <span className="font-semibold text-[11px] leading-none tracking-[0.02em]">{label}</span>
}

function iconForAction(id: CellComponentActionId, label: string): ReactNode {
  if (id === 'cell') return <Layers className="h-4.5 w-4.5" />
  if (id === 'cathode') return <LayersPlus className="h-4.5 w-4.5" />
  if (id === 'anode') return <LayersMinus className="h-4.5 w-4.5" />
  if (id === 'separator') return <TableRowsSplit className="h-4.5 w-4.5" />
  return <CollectorIcon label={label} />
}

function shortcutBadge(shortcut: string) {
  return shortcut.replace('Ctrl/Cmd+', '')
}

export function CellComponentDock({
  onFit,
  onThicknessToggle,
}: {
  onFit: () => void
  onThicknessToggle: () => void
}) {
  const nodes = useScene((s) => s.nodes)
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const setSelection = useViewer((s) => s.setSelection)
  const thicknessScale = usePresentationThicknessScale()
  const isExaggerated = isPresentationThicknessExaggerated(thicknessScale)
  const isExploded = useExplodedPresentation()

  const sceneNodes = nodes as unknown as Record<string, CellStructureNode>
  const structure = useMemo(() => resolveCellStructure(sceneNodes), [sceneNodes])

  const selectAction = useCallback(
    (actionId: CellComponentActionId) => {
      const nodeId = resolveComponentActionNodeId(structure, actionId)
      if (!nodeId) return
      setSelection({ selectedIds: [nodeId as AnyNodeId] })
      useViewer.setState({ hoveredId: null })
    },
    [setSelection, structure],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const actionId = resolveShortcutActionId(event)
      if (!actionId) return
      event.preventDefault()
      selectAction(actionId)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectAction])

  const handleToggleThickness = () => {
    togglePresentationThicknessScale()
    onThicknessToggle()
  }

  const handleToggleExploded = () => {
    toggleExplodedPresentation()
    onThicknessToggle()
  }

  return (
    <div className="pointer-events-auto flex items-stretch gap-1 rounded-xl border border-border/60 bg-background/92 p-1 text-foreground shadow-2xl backdrop-blur-md">
      {CELL_COMPONENT_ACTIONS.map((action) => {
        const nodeId = resolveComponentActionNodeId(structure, action.id)
        const active =
          selectedId === nodeId || (action.id === 'cell' && selectedId === structure.stackId)
        return (
          <button
            aria-pressed={active}
            className={cn(
              'relative flex h-11 w-11 items-center justify-center rounded-lg font-medium text-xs transition-colors',
              active
                ? 'bg-[#818cf8] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset]'
                : 'text-muted-foreground hover:bg-white/8 hover:text-foreground',
            )}
            disabled={!nodeId}
            key={action.id}
            onClick={() => selectAction(action.id)}
            title={`${action.fullName} (${action.shortcut})`}
            type="button"
          >
            {iconForAction(action.id, action.label)}
            <span className="-right-1 -bottom-1 absolute rounded bg-black/55 px-1 py-0.5 font-semibold text-[9px] text-white/70 leading-none">
              {shortcutBadge(action.shortcut)}
            </span>
          </button>
        )
      })}

      <div className="mx-1 w-px bg-border/60" />

      <button
        aria-pressed={isExploded}
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-lg font-medium text-xs transition-colors',
          isExploded
            ? 'bg-white/12 text-foreground'
            : 'text-muted-foreground hover:bg-white/8 hover:text-foreground',
        )}
        onClick={handleToggleExploded}
        title="Toggle exploded stack spacing (along X)"
        type="button"
      >
        <ChevronsUpDown className="h-4.5 w-4.5" />
        <span className="-right-1 -bottom-1 absolute rounded bg-black/55 px-1 py-0.5 font-semibold text-[9px] text-white/70 leading-none">
          E
        </span>
      </button>

      <button
        aria-pressed={isExaggerated}
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-lg font-medium text-xs transition-colors',
          isExaggerated
            ? 'bg-white/12 text-foreground'
            : 'text-muted-foreground hover:bg-white/8 hover:text-foreground',
        )}
        onClick={handleToggleThickness}
        title="Toggle stack thickness presentation (X x 20)"
        type="button"
      >
        <Scale3d className="h-4.5 w-4.5" />
        <span className="-right-1 -bottom-1 absolute rounded bg-black/55 px-1 py-0.5 font-semibold text-[9px] text-white/70 leading-none">
          X
        </span>
      </button>

      <button
        className="relative flex h-11 w-11 items-center justify-center rounded-lg font-medium text-muted-foreground text-xs transition-colors hover:bg-white/8 hover:text-foreground"
        onClick={onFit}
        title="Fit view"
        type="button"
      >
        <Maximize className="h-4.5 w-4.5" />
        <span className="-right-1 -bottom-1 absolute rounded bg-black/55 px-1 py-0.5 font-semibold text-[9px] text-white/70 leading-none">
          F
        </span>
      </button>
    </div>
  )
}
