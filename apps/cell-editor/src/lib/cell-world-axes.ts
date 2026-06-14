import { mmToMeters } from './units'

type CellLike = {
  electrode_length: number
  electrode_width: number
}

export type CellWorldDimensions = {
  stackM: number
  widthM: number
  lengthM: number
  stackCenterM: number
}

export function resolveCellWorldDimensions(
  cell: CellLike,
  stackThicknessMm: number,
  stackCenterMm = 0,
): CellWorldDimensions {
  return {
    stackM: mmToMeters(stackThicknessMm),
    widthM: mmToMeters(cell.electrode_width),
    lengthM: mmToMeters(cell.electrode_length),
    stackCenterM: mmToMeters(stackCenterMm),
  }
}

export function layerBoxArgs(
  lengthM: number,
  widthM: number,
  thicknessM: number,
): [number, number, number] {
  return [Math.max(thicknessM, 1e-4), Math.max(widthM, 1e-4), Math.max(lengthM, 1e-4)]
}
