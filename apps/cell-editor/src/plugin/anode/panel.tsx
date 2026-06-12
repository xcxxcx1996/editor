'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, PanelWrapper, SliderControl } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback } from 'react'
import { anodeCoatingThickness } from '@/src/lib/derived'
import type { AnodeNode } from './schema'

export function AnodePanel() {
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const setSelection = useViewer((s) => s.setSelection)
  const node = useScene((s) =>
    selectedId ? (s.nodes[selectedId as AnyNodeId] as AnodeNode | undefined) : undefined,
  )

  const handleUpdate = useCallback(
    (patch: Partial<AnodeNode>) => {
      if (!selectedId) return
      useScene.getState().updateNode(selectedId as AnyNodeId, patch as never)
    },
    [selectedId],
  )

  const handleClose = useCallback(() => {
    setSelection({ selectedIds: [] })
  }, [setSelection])

  if (!node) return null

  const coatingThickness = anodeCoatingThickness(node.anode_mass_loading, node.anode_density)

  return (
    <PanelWrapper onClose={handleClose} title="Anode">
      <PanelSection title="Material">
        <SliderControl
          label="anode_mass_loading"
          max={500}
          min={1}
          onChange={(value) => handleUpdate({ anode_mass_loading: value })}
          step={1}
          value={node.anode_mass_loading}
        />
        <SliderControl
          label="anode_density"
          max={5_000_000}
          min={100_000}
          onChange={(value) => handleUpdate({ anode_density: value })}
          step={10_000}
          value={node.anode_density}
        />
        <SliderControl
          label="anode_conductivity"
          max={1000}
          min={0}
          onChange={(value) => handleUpdate({ anode_conductivity: value })}
          step={1}
          value={node.anode_conductivity}
        />
        <SliderControl
          label="anode_theoretical_capacity"
          max={500}
          min={1}
          onChange={(value) => handleUpdate({ anode_theoretical_capacity: value })}
          step={1}
          value={node.anode_theoretical_capacity}
        />
      </PanelSection>
      <PanelSection title="Derived">
        <div className="flex items-center justify-between px-1 py-2 text-sm">
          <span className="text-muted-foreground">anode_coating_thickness</span>
          <span className="font-mono tabular-nums">{coatingThickness.toExponential(4)}</span>
        </div>
      </PanelSection>
    </PanelWrapper>
  )
}

export default AnodePanel
