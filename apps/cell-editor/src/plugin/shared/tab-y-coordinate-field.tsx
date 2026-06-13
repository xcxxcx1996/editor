'use client'

import { useScene } from '@pascal-app/core'
import { SliderControl } from '@pascal-app/editor'
import type { AnodeCurrentCollectorNode } from '@/src/plugin/anode-current-collector/schema'
import type { CathodeCurrentCollectorNode } from '@/src/plugin/cathode-current-collector/schema'

function useCellWidth(): number {
  return useScene((s) => {
    for (const node of Object.values(s.nodes) as Array<Record<string, unknown>>) {
      if (node.type === 'cell' && typeof node.electrode_width === 'number') {
        return Math.max(1, node.electrode_width)
      }
    }
    return 500
  })
}

export function CathodeTabYCoordinateField({
  node,
  onUpdate,
}: {
  node: CathodeCurrentCollectorNode
  onUpdate: (patch: Partial<CathodeCurrentCollectorNode>) => void
}) {
  const cellWidth = useCellWidth()

  return (
    <SliderControl
      label="cc_p_tab_y_coordinate"
      max={cellWidth}
      min={0}
      onChange={(value) => onUpdate({ cc_p_tab_y_coordinate: value })}
      step={1}
      unit="mm"
      value={node.cc_p_tab_y_coordinate}
    />
  )
}

export function AnodeTabYCoordinateField({
  node,
  onUpdate,
}: {
  node: AnodeCurrentCollectorNode
  onUpdate: (patch: Partial<AnodeCurrentCollectorNode>) => void
}) {
  const cellWidth = useCellWidth()

  return (
    <SliderControl
      label="cc_n_tab_y_coordinate"
      max={cellWidth}
      min={0}
      onChange={(value) => onUpdate({ cc_n_tab_y_coordinate: value })}
      step={1}
      unit="mm"
      value={node.cc_n_tab_y_coordinate}
    />
  )
}
