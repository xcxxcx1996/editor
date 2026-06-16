'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, PanelWrapper, SliderControl } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback } from 'react'
import { SearchableNumberControl } from '@/components/controls/searchable-number-control'
import { cathodeCoatingThickness } from '@/src/lib/derived'
import type { CathodeNode } from '@/src/plugin/cathode'

export function CathodePanel() {
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const setSelection = useViewer((s) => s.setSelection)
  const node = useScene((s) =>
    selectedId ? (s.nodes[selectedId as AnyNodeId] as CathodeNode | undefined) : undefined,
  )

  const handleUpdate = useCallback(
    (patch: Partial<CathodeNode>) => {
      if (!selectedId) return
      useScene.getState().updateNode(selectedId as AnyNodeId, patch as never)
    },
    [selectedId],
  )

  const handleClose = useCallback(() => {
    setSelection({ selectedIds: [] })
  }, [setSelection])

  if (!node) return null

  const coatingThickness = cathodeCoatingThickness(node.cathode_mass_loading, node.cathode_density)

  return (
    <PanelWrapper defaultCollapsed={false} onClose={handleClose} title="Cathode">
      <PanelSection title="Material">
        <SearchableNumberControl
          label="cathode_mass_loading"
          max={500}
          min={1}
          nodeKind="cathode"
          onChange={(value) => handleUpdate({ cathode_mass_loading: value })}
          precision={1}
          sceneKey="cathode_mass_loading"
          step={0.1}
          unit="g/m^2"
          value={node.cathode_mass_loading}
        />
        <SearchableNumberControl
          label="cathode_density"
          max={5}
          min={0.1}
          nodeKind="cathode"
          onChange={(value) => handleUpdate({ cathode_density: value })}
          precision={2}
          sceneKey="cathode_density"
          step={0.01}
          unit="g/cm^3"
          value={node.cathode_density}
        />
        <SliderControl
          label="cathode_conductivity"
          max={1000}
          min={0}
          onChange={(value) => handleUpdate({ cathode_conductivity: value })}
          step={1}
          unit="S/m"
          value={node.cathode_conductivity}
        />
        <SliderControl
          label="cathode_theoretical_density"
          max={8}
          min={0.1}
          onChange={(value) => handleUpdate({ cathode_theoretical_density: value })}
          precision={2}
          step={0.01}
          unit="g/cm^3"
          value={node.cathode_theoretical_density}
        />
        <SliderControl
          label="cathode_theoretical_capacity"
          max={500}
          min={1}
          onChange={(value) => handleUpdate({ cathode_theoretical_capacity: value })}
          step={1}
          unit="mA*h/g"
          value={node.cathode_theoretical_capacity}
        />
        <SliderControl
          label="cathode_specific_capacity"
          max={500}
          min={1}
          onChange={(value) => handleUpdate({ cathode_specific_capacity: value })}
          step={1}
          unit="mA*h/g"
          value={node.cathode_specific_capacity}
        />
        <SliderControl
          label="cathode_D50"
          max={50}
          min={0.1}
          onChange={(value) => handleUpdate({ cathode_D50: value })}
          precision={1}
          step={0.1}
          unit="µm"
          value={node.cathode_D50}
        />
      </PanelSection>
      <PanelSection title="Derived">
        <div className="flex items-center justify-between gap-3 px-1 py-2 text-xs">
          <span className="truncate text-muted-foreground">cathode_coating_thickness</span>
          <span className="shrink-0 font-mono text-foreground tabular-nums">
            {coatingThickness.toFixed(4)} mm
          </span>
        </div>
      </PanelSection>
    </PanelWrapper>
  )
}

export default CathodePanel
