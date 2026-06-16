'use client'

import { SliderControl } from '@pascal-app/editor'
import { Wand2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { RangeSliderControl } from '@/components/controls/range-slider-control'
import {
  designKeyForSceneField,
  isIntegerSearchField,
  normalizeSearchRangeBounds,
  quantizeSearchRangeValue,
} from '@/src/lib/simulation/search-ranges'
import { useSimulationSearchRange } from '@/src/lib/simulation/search-ranges-context'
import { setSimulationPreviewOverride } from '@/src/lib/simulation/preview-overrides'

function precisionForStep(step: number): number {
  if (step <= 0) return 0
  return Math.max(0, Math.ceil(-Math.log10(step)))
}

function defaultRange(
  value: number,
  min: number,
  max: number,
  step: number,
  designKey: string,
): [number, number] {
  const padding = Math.max(Math.abs(value) * 0.1, step)
  let rangeMin = Math.max(min, value - padding)
  let rangeMax = Math.min(max, value + padding)
  if (isIntegerSearchField(designKey)) {
    rangeMin = quantizeSearchRangeValue(rangeMin, designKey)
    rangeMax = quantizeSearchRangeValue(rangeMax, designKey)
    if (rangeMin >= rangeMax) {
      rangeMax = Math.min(max, rangeMin + 1)
    }
  }
  return [rangeMin, rangeMax]
}

export function SearchableNumberControl({
  label,
  max,
  min = 0,
  nodeKind,
  onChange,
  precision,
  sceneKey,
  step = 1,
  unit = '',
  value,
}: {
  label: string
  max?: number
  min?: number
  nodeKind: string
  onChange: (value: number) => void
  precision?: number
  sceneKey: string
  step?: number
  unit?: string
  value: number
}) {
  const designKey = designKeyForSceneField(nodeKind, sceneKey)
  const integerField = isIntegerSearchField(designKey)
  const sliderMax = max ?? Math.max(value * 2, min + step * 100)
  const { range, updateRange } = useSimulationSearchRange(nodeKind, sceneKey)
  const [fallbackMin, fallbackMax] = useMemo(
    () => defaultRange(value, min, sliderMax, step, designKey),
    [designKey, min, sliderMax, step, value],
  )
  const currentRange = normalizeSearchRangeBounds(
    range ?? {
      designKey,
      enabled: false,
      max: fallbackMax,
      min: fallbackMin,
      nodeKind,
      sceneKey,
    },
  )
  const enabled = currentRange.enabled
  const displayPrecision = precision ?? precisionForStep(step)

  useEffect(() => {
    if (!enabled) {
      setSimulationPreviewOverride(sceneKey, null)
      return
    }

    const midpoint = (currentRange.min + currentRange.max) / 2
    setSimulationPreviewOverride(
      sceneKey,
      integerField ? Math.round(midpoint) : midpoint,
    )
    return () => setSimulationPreviewOverride(sceneKey, null)
  }, [currentRange.max, currentRange.min, enabled, integerField, sceneKey])

  if (!enabled) {
    return (
      <div className="flex items-center gap-0.5">
        <SliderControl
          className="min-w-0 flex-1"
          label={label}
          max={max}
          min={min}
          onChange={onChange}
          precision={displayPrecision}
          step={step}
          unit={unit}
          value={value}
        />
        <button
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#facc15]/12 hover:text-[#fde68a]"
          onClick={() =>
            updateRange({
              ...currentRange,
              enabled: true,
              max: currentRange.max,
              min: currentRange.min,
            })
          }
          title="Enable spatial search range"
          type="button"
        >
          <Wand2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  function commitRange(minValue: number, maxValue: number) {
    updateRange(
      normalizeSearchRangeBounds({
        ...currentRange,
        enabled: true,
        max: Math.max(minValue, maxValue),
        min: Math.min(minValue, maxValue),
      }),
    )
  }

  return (
    <div className="rounded-lg border border-[#facc15]/25 bg-[#facc15]/[0.045] px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-[#fde68a] text-xs">{label}</p>
          <p className="text-[10px] text-muted-foreground">Spatial search range</p>
        </div>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-md bg-[#facc15]/14 text-[#fde68a] hover:bg-[#facc15]/22"
          onClick={() => updateRange({ ...currentRange, enabled: false })}
          title="Disable spatial search range"
          type="button"
        >
          <Wand2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[10px] text-muted-foreground">
          Min
          <input
            className="h-7 rounded-md border border-border/60 bg-[#1f1f21] px-2 font-mono text-foreground text-xs outline-none focus:border-[#facc15]/70"
            max={currentRange.max}
            min={min}
            onChange={(event) => commitRange(Number(event.target.value), currentRange.max)}
            step={step}
            type="number"
            value={Number(currentRange.min.toFixed(displayPrecision))}
          />
        </label>
        <label className="grid gap-1 text-[10px] text-muted-foreground">
          Max
          <input
            className="h-7 rounded-md border border-border/60 bg-[#1f1f21] px-2 font-mono text-foreground text-xs outline-none focus:border-[#facc15]/70"
            max={sliderMax}
            min={currentRange.min}
            onChange={(event) => commitRange(currentRange.min, Number(event.target.value))}
            step={step}
            type="number"
            value={Number(currentRange.max.toFixed(displayPrecision))}
          />
        </label>
      </div>
      <RangeSliderControl
        max={sliderMax}
        min={min}
        onChange={([nextMin, nextMax]) => commitRange(nextMin, nextMax)}
        step={step}
        value={[currentRange.min, currentRange.max]}
      />
      <p className="text-[10px] text-muted-foreground">
        Preview uses midpoint{' '}
        {(integerField
          ? Math.round((currentRange.min + currentRange.max) / 2)
          : (currentRange.min + currentRange.max) / 2
        ).toFixed(displayPrecision)}
        {unit ? ` ${unit}` : ''}.
      </p>
    </div>
  )
}
