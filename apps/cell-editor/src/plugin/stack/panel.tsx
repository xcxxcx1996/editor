'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, PanelWrapper, SliderControl } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback, useMemo } from 'react'
import { totalStackHeight } from '@/src/lib/derived'
import type { AnodeNode } from '@/src/plugin/anode/schema'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector/schema'
import type { CathodeNode } from '@/src/plugin/cathode/schema'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector/schema'
import type { SeparatorNode } from '@/src/plugin/separator/schema'
import type { StackNode } from './schema'

function resolveTemplate<T extends { type: string }>(
  nodes: Record<string, unknown>,
  childIds: string[],
  type: string,
): T | undefined {
  const id = childIds.find((childId) => (nodes[childId] as T | undefined)?.type === type)
  return id ? (nodes[id] as T) : undefined
}

export function StackPanel() {
  const selectedId = useViewer((s) => s.selection.selectedIds[0])
  const setSelection = useViewer((s) => s.setSelection)
  const nodes = useScene((s) => s.nodes)
  const stack = useScene((s) =>
    selectedId ? (s.nodes[selectedId as AnyNodeId] as StackNode | undefined) : undefined,
  )

  const handleUpdate = useCallback(
    (patch: Partial<StackNode>) => {
      if (!selectedId) return
      useScene.getState().updateNode(selectedId as AnyNodeId, patch as never)
    },
    [selectedId],
  )

  const handleClose = useCallback(() => {
    setSelection({ selectedIds: [] })
  }, [setSelection])

  const stackHeight = useMemo(() => {
    if (!stack) return 0
    const childIds = stack.children ?? []
    const cathode = resolveTemplate<CathodeNode>(nodes, childIds, 'cathode')
    const anode = resolveTemplate<AnodeNode>(nodes, childIds, 'anode')
    const separator = resolveTemplate<SeparatorNode>(nodes, childIds, 'separator')
    const ccP = resolveTemplate<CathodeCurrentCollectorNode>(
      nodes,
      childIds,
      'cathode-current-collector',
    )
    const ccN = resolveTemplate<AnodeCurrentCollectorNode>(
      nodes,
      childIds,
      'anode-current-collector',
    )
    if (!(cathode && anode && separator && ccP && ccN)) return 0

    return totalStackHeight({
      numberOfLayers: stack.number_of_layers,
      cathodeMassLoading: cathode.cathode_mass_loading,
      cathodeDensity: cathode.cathode_density,
      anodeMassLoading: anode.anode_mass_loading,
      anodeDensity: anode.anode_density,
      separatorThickness: separator.separator_thickness,
      ccPThickness: ccP.cc_p_thickness,
      ccNThickness: ccN.cc_n_thickness,
    })
  }, [nodes, stack])

  if (!stack) return null

  return (
    <PanelWrapper defaultCollapsed={false} onClose={handleClose} title="Stack">
      <PanelSection title="Geometry">
        <SliderControl
          label="number_of_layers"
          max={100}
          min={1}
          onChange={(value) => handleUpdate({ number_of_layers: Math.round(value) })}
          step={1}
          value={stack.number_of_layers}
        />
      </PanelSection>
      <PanelSection title="Derived">
        <div className="flex items-center justify-between gap-3 px-1 py-2 text-xs">
          <span className="truncate text-muted-foreground">total_stack_height</span>
          <span className="shrink-0 font-mono text-foreground tabular-nums">
            {stackHeight.toFixed(4)} mm
          </span>
        </div>
      </PanelSection>
    </PanelWrapper>
  )
}

export default StackPanel
