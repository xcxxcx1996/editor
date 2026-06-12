import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
import { anodeDefinition } from './anode/definition'
import { anodeCurrentCollectorDefinition } from './anode-current-collector/definition'
import { cathodeDefinition } from './cathode/definition'
import { cathodeCurrentCollectorDefinition } from './cathode-current-collector/definition'
import { cellDefinition } from './cell/definition'
import { separatorDefinition } from './separator/definition'
import { stackDefinition } from './stack/definition'

export const cellPlugin: Plugin = {
  id: 'pascal:cell-editor',
  apiVersion: 1,
  nodes: [
    cellDefinition as unknown as AnyNodeDefinition,
    stackDefinition as unknown as AnyNodeDefinition,
    cathodeDefinition as unknown as AnyNodeDefinition,
    anodeDefinition as unknown as AnyNodeDefinition,
    separatorDefinition as unknown as AnyNodeDefinition,
    cathodeCurrentCollectorDefinition as unknown as AnyNodeDefinition,
    anodeCurrentCollectorDefinition as unknown as AnyNodeDefinition,
  ],
}
