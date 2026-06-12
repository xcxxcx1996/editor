import { type AnyNodeDefinition, nodeRegistry, registerNode } from '@pascal-app/core'
import { cellPlugin } from '@/src/plugin'

let cellPluginLoaded = false

function loadCellPluginSync(): void {
  if (cellPluginLoaded) return
  cellPluginLoaded = true

  for (const def of cellPlugin.nodes ?? []) {
    if (nodeRegistry.has((def as AnyNodeDefinition).kind)) continue
    registerNode(def as AnyNodeDefinition)
  }

  if (typeof console !== 'undefined') {
    const kinds = Array.from(nodeRegistry.entries(), ([kind]) => kind)
    console.info(
      `[pascal:registry] loaded ${cellPlugin.id} v${cellPlugin.apiVersion} (${kinds.length} kinds: ${kinds.join(', ')})`,
    )
  }
}

loadCellPluginSync()
