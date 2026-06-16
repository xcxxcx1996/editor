import { describe, expect, test } from 'bun:test'
import {
  designKeyForSceneField,
  formatSearchRangeBounds,
  inferSimulationTaskType,
  isIntegerSearchField,
  normalizeSearchRangeBounds,
  normalizeSimulationSearchRanges,
  quantizeSearchRangeValue,
  validEnabledSearchRanges,
} from './search-ranges'

describe('simulation search ranges', () => {
  test('maps scene fields to CellDesign fields', () => {
    expect(designKeyForSceneField('cathode', 'cathode_mass_loading')).toBe('cathode_mass_loading')
    expect(designKeyForSceneField('cathode-current-collector', 'cc_p_tab_y_coordinate')).toBe(
      'cc_p_tab_y_coordinate',
    )
    expect(designKeyForSceneField('unknown', 'local_field')).toBe('local_field')
  })

  test('normalizes persisted ranges and orders min/max', () => {
    expect(
      normalizeSimulationSearchRanges([
        {
          enabled: true,
          max: 10,
          min: 20,
          nodeKind: 'stack',
          sceneKey: 'number_of_layers',
        },
        { enabled: true, min: 'bad', nodeKind: 'stack', sceneKey: 'number_of_layers' },
      ]),
    ).toEqual([
      {
        designKey: 'number_of_layers',
        enabled: true,
        max: 20,
        min: 10,
        nodeKind: 'stack',
        sceneKey: 'number_of_layers',
      },
    ])
  })

  test('rounds integer search fields when normalizing persisted ranges', () => {
    expect(
      normalizeSimulationSearchRanges([
        {
          enabled: true,
          max: 27,
          min: 16.2,
          nodeKind: 'stack',
          sceneKey: 'number_of_layers',
        },
      ]),
    ).toEqual([
      {
        designKey: 'number_of_layers',
        enabled: true,
        max: 27,
        min: 16,
        nodeKind: 'stack',
        sceneKey: 'number_of_layers',
      },
    ])
    expect(formatSearchRangeBounds({
      designKey: 'number_of_layers',
      enabled: true,
      max: 27,
      min: 16.2,
      nodeKind: 'stack',
      sceneKey: 'number_of_layers',
    })).toBe('16 – 27')
    expect(isIntegerSearchField('number_of_layers')).toBe(true)
    expect(quantizeSearchRangeValue(16.2, 'number_of_layers')).toBe(16)
    expect(quantizeSearchRangeValue(1.4, 'cathode_mass_loading')).toBe(1.4)
    expect(
      formatSearchRangeBounds({
        designKey: 'anode_mass_loading',
        enabled: true,
        max: 220.5,
        min: 180.2,
        nodeKind: 'anode',
        sceneKey: 'anode_mass_loading',
      }),
    ).toBe('180.2 – 220.5')
  })

  test('infers spatial search only from enabled valid ranges', () => {
    const disabled = [
      {
        designKey: 'number_of_layers',
        enabled: false,
        max: 10,
        min: 1,
        nodeKind: 'stack',
        sceneKey: 'number_of_layers',
      },
    ]
    const invalid = [{ ...disabled[0]!, enabled: true, max: 1, min: 1 }]
    const valid = [{ ...disabled[0]!, enabled: true, max: 12, min: 4 }]

    expect(validEnabledSearchRanges(disabled)).toEqual([])
    expect(inferSimulationTaskType(invalid)).toBe('single_point')
    expect(inferSimulationTaskType(valid)).toBe('spatial_search')
  })
})
