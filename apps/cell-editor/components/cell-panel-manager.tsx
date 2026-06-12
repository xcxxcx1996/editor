'use client'

import { useScene } from '@pascal-app/core'
import { Inspector } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback, useMemo } from 'react'
import { type CellStructureNode, resolveCellStructure } from '@/src/lib/cell-structure'
import { CellPanel } from '@/src/plugin/cell/panel'

export function CellPanelManager() {
  const nodes = useScene((s) => s.nodes)
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const sceneNodes = nodes as unknown as Record<string, CellStructureNode>
  const structure = useMemo(() => resolveCellStructure(sceneNodes), [sceneNodes])
  const clearSelection = useCallback(() => {
    useViewer.getState().resetSelection()
  }, [])

  if (!selectedId) return null

  if (selectedId === structure.cellId || selectedId === structure.stackId) {
    return <CellPanel defaultCollapsed={false} key={selectedId} onClose={clearSelection} />
  }

  return (
    <Inspector
      defaultCollapsed={false}
      key={selectedId}
      nodeId={selectedId as never}
      onClose={clearSelection}
    />
  )
}
