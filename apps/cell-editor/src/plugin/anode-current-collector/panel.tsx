'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, PanelWrapper } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback } from 'react'
import { SearchableNumberControl } from '@/components/controls/searchable-number-control'
import { AnodeTabYCoordinateField } from '@/src/plugin/shared/tab-y-coordinate-field'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector'

export function AnodeCurrentCollectorPanel() {
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const setSelection = useViewer((s) => s.setSelection)
  const node = useScene((s) =>
    selectedId
      ? (s.nodes[selectedId as AnyNodeId] as AnodeCurrentCollectorNode | undefined)
      : undefined,
  )

  const handleUpdate = useCallback(
    (patch: Partial<AnodeCurrentCollectorNode>) => {
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
    <PanelWrapper defaultCollapsed={false} onClose={handleClose} title="Anode CC">
      <PanelSection title="Geometry">
        <SearchableNumberControl
          label="cc_n_thickness"
          min={0.0001}
          nodeKind="anode-current-collector"
          onChange={(value) => handleUpdate({ cc_n_thickness: value })}
          precision={4}
          sceneKey="cc_n_thickness"
          step={0.0001}
          unit="mm"
          value={node.cc_n_thickness}
        />
      </PanelSection>
      <PanelSection title="Tab">
        <SearchableNumberControl
          label="cc_n_tab_length"
          min={1}
          nodeKind="anode-current-collector"
          onChange={(value) => handleUpdate({ cc_n_tab_length: value })}
          precision={1}
          sceneKey="cc_n_tab_length"
          step={0.1}
          unit="mm"
          value={node.cc_n_tab_length}
        />
        <SearchableNumberControl
          label="cc_n_tab_width"
          min={0.1}
          nodeKind="anode-current-collector"
          onChange={(value) => handleUpdate({ cc_n_tab_width: value })}
          precision={1}
          sceneKey="cc_n_tab_width"
          step={0.1}
          unit="mm"
          value={node.cc_n_tab_width}
        />
        <AnodeTabYCoordinateField node={node} onUpdate={handleUpdate} />
      </PanelSection>
    </PanelWrapper>
  )
}

export default AnodeCurrentCollectorPanel
