import { describe, expect, test } from 'bun:test'
import { createDefaultCellScene } from '../scene/defaults'
import {
  decode,
  encode,
  isCellDesignJson,
  validate,
} from './codec'
import { buildDefaultScene } from './build-default-scene'
import { CELL_DESIGN_CONSTANTS, numberValue } from './field-map'

describe('encode', () => {
  test('exports CellDesign fields from default scene', () => {
    const scene = createDefaultCellScene()
    const design = encode(scene)

    expect(design).toMatchObject({
      cathode_mass_loading: 500,
      anode_mass_loading: 200,
      electrode_length: 400,
      electrode_width: 100,
      number_of_layers: 27,
      cc_position: 'opposite',
      separator_thickness: 0.0078,
      separator_porosity: 0.4,
      cc_p_thickness: 0.013,
      cc_n_thickness: 0.006,
      theoretical_density_p: 3.6,
      conductivity_p: 10,
      specific_capacity_n: 351,
    })
    expect(design).toMatchObject(CELL_DESIGN_CONSTANTS)
  })
})

describe('decode round-trip', () => {
  test('preserves editable fields after encode → decode → encode', () => {
    const original = createDefaultCellScene()
    const design = encode(original)
    const restored = decode(design)
    const roundTripped = encode(restored)

    expect(roundTripped).toEqual(design)
  })

  test('applies patched design values onto default scene nodes', () => {
    const design = encode(createDefaultCellScene())
    design.electrode_length = 500
    design.cathode_mass_loading = 600
    design.number_of_layers = 30

    const scene = decode(design)
    const cell = Object.values(scene.nodes).find((node) => node.type === 'cell')
    const cathode = Object.values(scene.nodes).find((node) => node.type === 'cathode')
    const stack = Object.values(scene.nodes).find((node) => node.type === 'stack')

    expect(cell).toMatchObject({ electrode_length: 500 })
    expect(cathode).toMatchObject({ cathode_mass_loading: 600 })
    expect(stack).toMatchObject({ number_of_layers: 30 })
  })
})

describe('cc_position', () => {
  test('encodes same-side from scene same', () => {
    const scene = createDefaultCellScene()
    const cellId = scene.rootNodeIds[0]
    scene.nodes[cellId] = {
      ...scene.nodes[cellId],
      cc_position: 'same',
    }

    expect(encode(scene).cc_position).toBe('same-side')
  })

  test('decodes same-side back to scene same', () => {
    const scene = decode({ ...encode(createDefaultCellScene()), cc_position: 'same-side' })
    const cell = Object.values(scene.nodes).find((node) => node.type === 'cell')
    expect(cell).toMatchObject({ cc_position: 'same' })
  })
})

describe('numberValue', () => {
  test('reads scalar numbers', () => {
    expect(numberValue(42, 0)).toBe(42)
  })

  test('reads first tuple element', () => {
    expect(numberValue([12, 24], 0)).toBe(12)
  })

  test('falls back when value is missing', () => {
    expect(numberValue(undefined, 7)).toBe(7)
  })
})

describe('validate', () => {
  test('accepts minimal CellDesign JSON', () => {
    const design = encode(createDefaultCellScene())
    expect(validate(design)).toBe(true)
    expect(isCellDesignJson(design)).toBe(true)
  })

  test('rejects incomplete payloads', () => {
    expect(validate({ electrode_length: 400 })).toBe(false)
  })
})

describe('deferred constants', () => {
  test('encode includes constants that are not stored on scene nodes', () => {
    const design = encode(createDefaultCellScene())
    expect(design.lower_voltage).toBe(2)
    expect(design.wall_thickness).toBe(0.3)
    expect(design.theoretical_max_conc_p).toBe(22_819.8)
  })

  test('decode does not add deferred constant fields to scene nodes', () => {
    const scene = decode(encode(createDefaultCellScene()))
    for (const node of Object.values(scene.nodes)) {
      expect(node).not.toHaveProperty('lower_voltage')
      expect(node).not.toHaveProperty('wall_thickness')
      expect(node).not.toHaveProperty('theoretical_max_conc_p')
    }
  })
})

describe('buildDefaultScene', () => {
  test('matches createDefaultCellScene field values', () => {
    const fromDefinitions = buildDefaultScene()
    const fromLegacy = createDefaultCellScene()

    expect(encode(fromDefinitions)).toEqual(encode(fromLegacy))
  })
})
