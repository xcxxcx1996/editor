'use client'

import { cn } from '@pascal-app/editor'

export function RangeSliderControl({
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  max: number
  min: number
  onChange: (value: [number, number]) => void
  step?: number
  value: [number, number]
}) {
  const lower = Math.min(value[0], value[1])
  const upper = Math.max(value[0], value[1])
  const span = Math.max(max - min, step)
  const lowerPct = ((lower - min) / span) * 100
  const upperPct = ((upper - min) / span) * 100

  return (
    <div className="relative h-7 px-1">
      <div className="absolute top-1/2 right-1 left-1 h-1 -translate-y-1/2 rounded-full bg-white/10">
        <div
          className="absolute h-full rounded-full bg-[#facc15]/80"
          style={{ left: `${lowerPct}%`, right: `${100 - upperPct}%` }}
        />
      </div>
      <input
        aria-label="Range minimum"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 appearance-none bg-transparent',
          '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#facc15]/80 [&::-webkit-slider-thumb]:bg-[#1f1f21]',
          '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#facc15]/80 [&::-moz-range-thumb]:bg-[#1f1f21]',
        )}
        max={max}
        min={min}
        onChange={(event) => onChange([Math.min(Number(event.target.value), upper), upper])}
        step={step}
        type="range"
        value={lower}
      />
      <input
        aria-label="Range maximum"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 appearance-none bg-transparent',
          '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#facc15]/80 [&::-webkit-slider-thumb]:bg-[#1f1f21]',
          '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#facc15]/80 [&::-moz-range-thumb]:bg-[#1f1f21]',
        )}
        max={max}
        min={min}
        onChange={(event) => onChange([lower, Math.max(Number(event.target.value), lower)])}
        step={step}
        type="range"
        value={upper}
      />
    </div>
  )
}
