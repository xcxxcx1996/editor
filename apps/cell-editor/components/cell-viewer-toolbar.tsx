'use client'

import { cn } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { Box, Grid2x2, Maximize, ScanLine } from 'lucide-react'
import type { ReactNode } from 'react'

const TOOLBAR_CONTAINER =
  'inline-flex h-8 items-stretch overflow-hidden rounded-xl border border-border bg-background/90 shadow-2xl backdrop-blur-md'

const TOOLBAR_BUTTON =
  'flex items-center justify-center gap-1.5 px-2.5 font-medium text-xs transition-colors'

function ToolButton({
  active,
  label,
  icon,
  onClick,
}: {
  active?: boolean
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        TOOLBAR_BUTTON,
        active
          ? 'bg-white/10 text-foreground'
          : 'text-muted-foreground/70 hover:bg-white/8 hover:text-muted-foreground',
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export function CellViewerToolbar({ onFit }: { onFit: () => void }) {
  const cameraMode = useViewer((s) => s.cameraMode)
  const setCameraMode = useViewer((s) => s.setCameraMode)
  const shading = useViewer((s) => s.shading)
  const setShading = useViewer((s) => s.setShading)

  return (
    <div className={TOOLBAR_CONTAINER}>
      <ToolButton
        active={cameraMode === 'orthographic'}
        icon={
          cameraMode === 'perspective' ? (
            <Box className="h-4 w-4" />
          ) : (
            <ScanLine className="h-4 w-4" />
          )
        }
        label={cameraMode === 'perspective' ? 'Perspective' : 'Orthographic'}
        onClick={() => setCameraMode(cameraMode === 'perspective' ? 'orthographic' : 'perspective')}
      />
      <ToolButton
        active={shading === 'solid'}
        icon={<Grid2x2 className="h-4 w-4" />}
        label={shading === 'solid' ? 'Solid' : 'Rendered'}
        onClick={() => setShading(shading === 'solid' ? 'rendered' : 'solid')}
      />
      <ToolButton icon={<Maximize className="h-4 w-4" />} label="Fit view" onClick={onFit} />
    </div>
  )
}
