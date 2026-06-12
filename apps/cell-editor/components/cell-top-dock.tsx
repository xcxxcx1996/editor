'use client'

import { cn } from '@pascal-app/editor'
import { FileUp, PlusSquare } from 'lucide-react'
import { useRef } from 'react'

const BUTTON_BASE =
  'flex h-11 items-center justify-center gap-2 rounded-md px-3 font-medium text-xs transition-colors'

export function CellTopDock({
  error,
  onImport,
  onNewScene,
}: {
  error: string | null
  onImport: (file: File) => void
  onNewScene: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <div className="flex items-stretch gap-1 rounded-lg border border-border/60 bg-background/92 p-1 text-foreground shadow-2xl backdrop-blur-md">
        <button
          className={cn(
            BUTTON_BASE,
            'text-muted-foreground hover:bg-white/8 hover:text-foreground',
          )}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <FileUp className="h-4.5 w-4.5" />
          <span>Import JSON</span>
        </button>
        <button
          className={cn(
            BUTTON_BASE,
            'text-muted-foreground hover:bg-white/8 hover:text-foreground',
          )}
          onClick={onNewScene}
          type="button"
        >
          <PlusSquare className="h-4.5 w-4.5" />
          <span>New Scene</span>
        </button>
      </div>

      <input
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onImport(file)
          event.currentTarget.value = ''
        }}
        ref={inputRef}
        type="file"
      />

      {error ? (
        <div className="rounded-md border border-[#c77878]/35 bg-[#3a2020]/88 px-3 py-1.5 text-[11px] text-[#f3b1b1] shadow-lg backdrop-blur-md">
          {error}
        </div>
      ) : null}
    </div>
  )
}
