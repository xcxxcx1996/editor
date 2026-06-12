'use client'

import { Icon } from '@iconify/react'
import type { IconRef } from '@pascal-app/core'
import { lazy, Suspense } from 'react'

export const CELL_COMPONENT_KINDS = [
  'cathode',
  'anode',
  'separator',
  'cathode-current-collector',
  'anode-current-collector',
] as const

export type CellComponentKind = (typeof CELL_COMPONENT_KINDS)[number]

export type CellStructureNode = {
  id: string
  type: string
  name?: string
  children?: string[]
}

export type CellStructure = {
  cellId?: string
  stackId?: string
  components: Partial<Record<CellComponentKind, string>>
}

export function resolveCellStructure(nodes: Record<string, CellStructureNode>): CellStructure {
  const cell = Object.values(nodes).find((node) => node.type === 'cell')
  const stackId = cell?.children?.find((childId) => nodes[childId]?.type === 'stack')
  const stack = stackId ? nodes[stackId] : undefined
  const components: Partial<Record<CellComponentKind, string>> = {}

  for (const kind of CELL_COMPONENT_KINDS) {
    const componentId = stack?.children?.find((childId) => nodes[childId]?.type === kind)
    if (componentId) components[kind] = componentId
  }

  return {
    cellId: cell?.id,
    stackId,
    components,
  }
}

export function renderPresentationIcon(icon: IconRef | undefined): React.ReactNode {
  if (!icon) return null

  if (icon.kind === 'url') {
    return <img alt="" className="h-4 w-4 shrink-0 object-contain" src={icon.src} />
  }

  if (icon.kind === 'iconify') {
    return <Icon height={16} icon={icon.name} width={16} />
  }

  if (icon.kind === 'svg') {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox={icon.viewBox}>
        <path d={icon.path} fill="currentColor" />
      </svg>
    )
  }

  const LazyIcon = lazy(icon.module)
  return (
    <Suspense fallback={null}>
      <LazyIcon />
    </Suspense>
  )
}
