'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, PanelWrapper, SliderControl } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback, useMemo } from 'react'
import {
  type CellStructureNode,
  renderPresentationIcon,
  resolveCellStructure,
} from '@/src/lib/cell-structure'
import { totalStackHeight } from '@/src/lib/derived'
import type { AnodeNode } from '@/src/plugin/anode/schema'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector/schema'
import type { CathodeNode } from '@/src/plugin/cathode/schema'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector/schema'
import type { SeparatorNode } from '@/src/plugin/separator/schema'
import type { StackNode } from '@/src/plugin/stack/schema'
import type { CellNode } from './schema'

function resolveNode<T extends { type: string }>(
  nodes: Record<string, unknown>,
  nodeId: string | undefined,
): T | undefined {
  return nodeId ? (nodes[nodeId] as T | undefined) : undefined
}

export function CellPanel({
  defaultCollapsed,
  onClose,
  node: _node,
}: {
  defaultCollapsed?: boolean
  onClose?: () => void
  node?: CellNode
} = {}) {
  const setSelection = useViewer((s) => s.setSelection)
  const nodes = useScene((s) => s.nodes)
  const sceneNodes = nodes as unknown as Record<string, CellStructureNode>
  const structure = useMemo(() => resolveCellStructure(sceneNodes), [sceneNodes])
  const cell = resolveNode<CellNode>(nodes, structure.cellId)
  const stack = resolveNode<StackNode>(nodes, structure.stackId)

  const handleCellUpdate = useCallback(
    (patch: Partial<CellNode>) => {
      if (!structure.cellId) return
      useScene.getState().updateNode(structure.cellId as AnyNodeId, patch as never)
    },
    [structure.cellId],
  )

  const handleStackUpdate = useCallback(
    (patch: Partial<StackNode>) => {
      if (!structure.stackId) return
      useScene.getState().updateNode(structure.stackId as AnyNodeId, patch as never)
    },
    [structure.stackId],
  )

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
      return
    }
    setSelection({ selectedIds: [] })
  }, [onClose, setSelection])

  const stackHeight = useMemo(() => {
    const cathode = resolveNode<CathodeNode>(nodes, structure.components.cathode)
    const anode = resolveNode<AnodeNode>(nodes, structure.components.anode)
    const separator = resolveNode<SeparatorNode>(nodes, structure.components.separator)
    const ccP = resolveNode<CathodeCurrentCollectorNode>(
      nodes,
      structure.components['cathode-current-collector'],
    )
    const ccN = resolveNode<AnodeCurrentCollectorNode>(
      nodes,
      structure.components['anode-current-collector'],
    )

    if (!(stack && cathode && anode && separator && ccP && ccN)) return 0

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
  }, [nodes, stack, structure.components])

  if (!(cell && stack)) return null

  return (
    <PanelWrapper
      defaultCollapsed={defaultCollapsed}
      icon={renderPresentationIcon({ kind: 'iconify', name: 'lucide:battery' })}
      onClose={handleClose}
      title="Cell"
    >
      <PanelSection title="Geometry">
        <SliderControl
          label="electrode_length"
          min={1}
          onChange={(value) => handleCellUpdate({ electrode_length: value })}
          step={1}
          unit="mm"
          value={cell.electrode_length}
        />
        <SliderControl
          label="electrode_width"
          min={1}
          onChange={(value) => handleCellUpdate({ electrode_width: value })}
          step={1}
          unit="mm"
          value={cell.electrode_width}
        />
      </PanelSection>
      <PanelSection title="Stack">
        <SliderControl
          label="number_of_layers"
          max={100}
          min={1}
          onChange={(value) => handleStackUpdate({ number_of_layers: Math.round(value) })}
          step={1}
          value={stack.number_of_layers}
        />
      </PanelSection>
      <PanelSection title="Electrolyte">
        <SliderControl
          label="electrolyte_concentration"
          max={5}
          min={0}
          onChange={(value) => handleCellUpdate({ electrolyte_concentration: value })}
          precision={2}
          step={0.01}
          unit="mol/L"
          value={cell.electrolyte_concentration}
        />
        <SliderControl
          label="electrolyte_level_height"
          max={100}
          min={0}
          onChange={(value) => handleCellUpdate({ electrolyte_level_ratio: value / 100 })}
          precision={0}
          step={1}
          unit="%"
          value={cell.electrolyte_level_ratio * 100}
        />
      </PanelSection>
      <PanelSection title="Tab Position">
        <div className="px-3 py-2">
          <div className="flex h-9 w-full items-center rounded-lg border border-border/50 bg-[#2C2C2E] p-[3px]">
            <button
              className={
                cell.cc_position === 'opposite'
                  ? 'relative flex h-full flex-1 items-center justify-center rounded-md bg-[#3e3e3e] font-medium text-foreground text-xs shadow-sm ring-1 ring-border/50 transition-all duration-200'
                  : 'relative flex h-full flex-1 items-center justify-center rounded-md font-medium text-muted-foreground text-xs transition-all duration-200 hover:bg-white/5 hover:text-foreground'
              }
              onClick={() => handleCellUpdate({ cc_position: 'opposite' })}
              type="button"
            >
              Opposite
            </button>
            <button
              className={
                cell.cc_position === 'same'
                  ? 'relative flex h-full flex-1 items-center justify-center rounded-md bg-[#3e3e3e] font-medium text-foreground text-xs opacity-50 shadow-sm ring-1 ring-border/50'
                  : 'relative flex h-full flex-1 items-center justify-center rounded-md font-medium text-muted-foreground text-xs opacity-50'
              }
              disabled
              title="Same-side tab rendering is planned for v0.3."
              type="button"
            >
              Same (v0.3)
            </button>
          </div>
        </div>
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

export default CellPanel
