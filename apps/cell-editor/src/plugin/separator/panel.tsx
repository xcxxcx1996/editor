'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, PanelWrapper } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback } from 'react'
import { SearchableNumberControl } from '@/components/controls/searchable-number-control'
import type { SeparatorNode } from '@/src/plugin/separator'

export function SeparatorPanel() {
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const setSelection = useViewer((s) => s.setSelection)
  const node = useScene((s) =>
    selectedId ? (s.nodes[selectedId as AnyNodeId] as SeparatorNode | undefined) : undefined,
  )

  const handleUpdate = useCallback(
    (patch: Partial<SeparatorNode>) => {
      if (!selectedId) return
      useScene.getState().updateNode(selectedId as AnyNodeId, patch as never)
    },
    [selectedId],
  )

  const handleClose = useCallback(() => {
    setSelection({ selectedIds: [] })
  }, [setSelection])

  if (!node) return null

  return (
    <PanelWrapper defaultCollapsed={false} onClose={handleClose} title="Separator">
      <PanelSection title="Geometry">
        <SearchableNumberControl
          label="separator_thickness"
          min={0.0001}
          nodeKind="separator"
          onChange={(value) => handleUpdate({ separator_thickness: value })}
          precision={4}
          sceneKey="separator_thickness"
          step={0.0001}
          unit="mm"
          value={node.separator_thickness}
        />
      </PanelSection>
      <PanelSection title="Material">
        <SearchableNumberControl
          label="separator_porosity"
          max={1}
          min={0}
          nodeKind="separator"
          onChange={(value) => handleUpdate({ separator_porosity: value })}
          precision={2}
          sceneKey="separator_porosity"
          step={0.01}
          value={node.separator_porosity}
        />
      </PanelSection>
    </PanelWrapper>
  )
}

export default SeparatorPanel
