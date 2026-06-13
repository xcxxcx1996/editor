import { describe, expect, test } from 'bun:test'
import { applyCellSceneDefaults, createDefaultCellScene } from './defaults'

describe('createDefaultCellScene', () => {
  test('creates seven nodes with correct hierarchy', () => {
    const scene = createDefaultCellScene()
    expect(Object.keys(scene.nodes)).toHaveLength(7)
    expect(scene.rootNodeIds).toHaveLength(1)

    const cellId = scene.rootNodeIds[0]
    const cell = scene.nodes[cellId]
    expect(cell?.type).toBe('cell')

    const stackId = (cell as { children?: string[] }).children?.[0]
    expect(stackId).toBeDefined()
    const stack = stackId ? scene.nodes[stackId] : undefined
    expect(stack?.type).toBe('stack')
    expect((stack as { children?: string[] }).children).toHaveLength(5)
  })

  test('centres default tab coordinates within the cell width', () => {
    const scene = createDefaultCellScene()
    const nodes = Object.values(scene.nodes) as Array<Record<string, unknown>>
    const cell = nodes.find((node) => node.type === 'cell')
    const cathodeCollector = nodes.find((node) => node.type === 'cathode-current-collector')
    const anodeCollector = nodes.find((node) => node.type === 'anode-current-collector')

    expect(cathodeCollector?.cc_p_tab_y_coordinate).toBe((cell?.electrode_width as number) / 2)
    expect(anodeCollector?.cc_n_tab_y_coordinate).toBe((cell?.electrode_width as number) / 2)
  })

  test('uses requested default cell geometry and material values', () => {
    const scene = createDefaultCellScene()
    const nodes = Object.values(scene.nodes) as Array<Record<string, unknown>>

    expect(nodes.find((node) => node.type === 'cell')).toMatchObject({
      electrode_length: 400,
      electrode_width: 100,
    })
    expect(nodes.find((node) => node.type === 'stack')).toMatchObject({
      number_of_layers: 27,
    })
    expect(nodes.find((node) => node.type === 'cathode')).toMatchObject({
      cathode_mass_loading: 500,
      cathode_density: 2.1,
      cathode_theoretical_density: 3.6,
      cathode_theoretical_capacity: 170,
      cathode_specific_capacity: 161,
      cathode_D50: 1,
    })
    expect(nodes.find((node) => node.type === 'anode')).toMatchObject({
      anode_mass_loading: 200,
      anode_density: 1.3,
      anode_theoretical_density: 2.23,
      anode_theoretical_capacity: 372,
      anode_specific_capacity: 351,
      anode_D50: 15,
    })
    expect(nodes.find((node) => node.type === 'cathode-current-collector')).toMatchObject({
      cc_p_tab_length: 30,
      cc_p_tab_width: 80,
    })
    expect(nodes.find((node) => node.type === 'anode-current-collector')).toMatchObject({
      cc_n_tab_length: 30,
      cc_n_tab_width: 80,
    })
  })

  test('fills missing imported tab coordinates from the current cell width', () => {
    const scene = createDefaultCellScene()
    const nodes = scene.nodes as Record<string, Record<string, unknown>>
    const cell = Object.values(nodes).find((node) => node.type === 'cell')
    const cathodeCollector = Object.values(nodes).find(
      (node) => node.type === 'cathode-current-collector',
    )
    const anodeCollector = Object.values(nodes).find(
      (node) => node.type === 'anode-current-collector',
    )

    if (cell) cell.electrode_width = 640
    if (cathodeCollector) delete cathodeCollector.cc_p_tab_y_coordinate
    if (anodeCollector) delete anodeCollector.cc_n_tab_y_coordinate

    const migrated = applyCellSceneDefaults(scene)
    const migratedNodes = Object.values(migrated.nodes) as Array<Record<string, unknown>>

    expect(
      migratedNodes.find((node) => node.type === 'cathode-current-collector')
        ?.cc_p_tab_y_coordinate,
    ).toBe(320)
    expect(
      migratedNodes.find((node) => node.type === 'anode-current-collector')?.cc_n_tab_y_coordinate,
    ).toBe(320)
  })

  test('migrates stored density values from g/m^3 to g/cm^3', () => {
    const scene = createDefaultCellScene()
    const nodes = scene.nodes as Record<string, Record<string, unknown>>
    const cathode = Object.values(nodes).find((node) => node.type === 'cathode')
    const anode = Object.values(nodes).find((node) => node.type === 'anode')

    if (cathode) cathode.cathode_density = 2_100_000
    if (anode) anode.anode_density = 1_300_000

    const migratedNodes = Object.values(applyCellSceneDefaults(scene).nodes) as Array<
      Record<string, unknown>
    >

    expect(migratedNodes.find((node) => node.type === 'cathode')?.cathode_density).toBe(2.1)
    expect(migratedNodes.find((node) => node.type === 'anode')?.anode_density).toBe(1.3)
  })

  test('fills missing imported material particle sizes and tab dimensions', () => {
    const scene = createDefaultCellScene()
    const nodes = scene.nodes as Record<string, Record<string, unknown>>
    const stack = Object.values(nodes).find((node) => node.type === 'stack')
    const cathode = Object.values(nodes).find((node) => node.type === 'cathode')
    const anode = Object.values(nodes).find((node) => node.type === 'anode')
    const cathodeCollector = Object.values(nodes).find(
      (node) => node.type === 'cathode-current-collector',
    )
    const anodeCollector = Object.values(nodes).find(
      (node) => node.type === 'anode-current-collector',
    )

    if (stack) delete stack.number_of_layers
    if (cathode) delete cathode.cathode_D50
    if (anode) delete anode.anode_D50
    if (cathodeCollector) {
      delete cathodeCollector.cc_p_tab_length
      delete cathodeCollector.cc_p_tab_width
    }
    if (anodeCollector) {
      delete anodeCollector.cc_n_tab_length
      delete anodeCollector.cc_n_tab_width
    }

    const migratedNodes = Object.values(applyCellSceneDefaults(scene).nodes) as Array<
      Record<string, unknown>
    >

    expect(migratedNodes.find((node) => node.type === 'stack')?.number_of_layers).toBe(27)
    expect(migratedNodes.find((node) => node.type === 'cathode')?.cathode_D50).toBe(1)
    expect(migratedNodes.find((node) => node.type === 'anode')?.anode_D50).toBe(15)
    expect(
      migratedNodes.find((node) => node.type === 'cathode-current-collector')?.cc_p_tab_length,
    ).toBe(30)
    expect(
      migratedNodes.find((node) => node.type === 'cathode-current-collector')?.cc_p_tab_width,
    ).toBe(80)
    expect(
      migratedNodes.find((node) => node.type === 'anode-current-collector')?.cc_n_tab_length,
    ).toBe(30)
    expect(
      migratedNodes.find((node) => node.type === 'anode-current-collector')?.cc_n_tab_width,
    ).toBe(80)
  })
})
