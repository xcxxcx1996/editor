import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
import { anodeDefinition } from './anode'
import { anodeCurrentCollectorDefinition } from './anode-current-collector'
import { cathodeDefinition } from './cathode'
import { cathodeCurrentCollectorDefinition } from './cathode-current-collector'
import { cellDefinition } from './cell/definition'
import { separatorDefinition } from './separator'
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
