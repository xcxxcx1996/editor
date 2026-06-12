'use client'

import { type SceneGraph, useScene, validateBuildJson } from '@pascal-app/core'
import { Grid } from '@pascal-app/editor'
import { type OutlineStyle, useViewer, Viewer } from '@pascal-app/viewer'
import { CameraControls } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CellCameraController } from '@/components/cell-camera-controller'
import { CellComponentDock } from '@/components/cell-component-dock'
import { CellPanelManager } from '@/components/cell-panel-manager'
import { CellSelectionManager } from '@/components/cell-selection-manager'
import { CellTopDock } from '@/components/cell-top-dock'
import {
  createDefaultCellScene,
  loadCellSceneFromLocalStorage,
  saveCellSceneToLocalStorage,
} from '@/src/lib/defaults'

function isUsableScene(graph: SceneGraph | null | undefined): graph is SceneGraph {
  return !!graph && Object.keys(graph.nodes).length > 0 && (graph.rootNodeIds?.length ?? 0) > 0
}

const CELL_SELECTED_STYLE: OutlineStyle = {
  visibleColor: 0x86_4f_ff,
  hiddenColor: 0x73_3f_ea,
  strength: 3.8,
  pulse: false,
}

export function CellEditorShell() {
  const [fitTrigger, setFitTrigger] = useState(0)
  const [entryTrigger, setEntryTrigger] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)
  const isLoadingSceneRef = useRef(false)

  const loadScene = useCallback((): SceneGraph => {
    const stored = loadCellSceneFromLocalStorage()
    return isUsableScene(stored) ? stored : createDefaultCellScene()
  }, [])

  const applySceneGraph = useCallback((sceneGraph: SceneGraph) => {
    setImportError(null)
    isLoadingSceneRef.current = true
    useScene.getState().unloadScene()
    useScene.getState().setScene(sceneGraph.nodes as never, sceneGraph.rootNodeIds as never)
    useViewer.getState().setCameraMode('orthographic')
    useViewer.getState().setShowGrid(true)
    useViewer.getState().setSelection({ selectedIds: [sceneGraph.rootNodeIds[0] as never] })
    saveCellSceneToLocalStorage(sceneGraph)

    requestAnimationFrame(() => {
      isLoadingSceneRef.current = false
      setEntryTrigger((n) => n + 1)
    })
  }, [])

  useEffect(() => {
    applySceneGraph(loadScene())
  }, [applySceneGraph, loadScene])

  useEffect(() => {
    const unsubscribe = useScene.subscribe((state, previous) => {
      if (isLoadingSceneRef.current) return
      if (state.nodes === previous.nodes) return
      saveCellSceneToLocalStorage({
        nodes: state.nodes,
        rootNodeIds: state.rootNodeIds,
      } as unknown as Parameters<typeof saveCellSceneToLocalStorage>[0])
    })

    return unsubscribe
  }, [])

  const handleFit = useCallback(() => {
    setFitTrigger((n) => n + 1)
  }, [])

  const handleNewScene = useCallback(() => {
    applySceneGraph(createDefaultCellScene())
  }, [applySceneGraph])

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const raw = await file.text()
        const parsed = JSON.parse(raw) as unknown
        const result = validateBuildJson(parsed)

        if (!result.ok || !result.parsed) {
          setImportError(result.errors[0]?.message ?? 'Invalid scene JSON.')
          return
        }

        applySceneGraph(result.parsed as SceneGraph)
      } catch {
        setImportError('Could not read that JSON file.')
      }
    },
    [applySceneGraph],
  )

  return (
    <div className="dark flex h-screen w-screen bg-sidebar text-foreground">
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          <Viewer
            renderContext="editor"
            selectedStyle={CELL_SELECTED_STYLE}
            selectionManager="custom"
          >
            <Grid
              cellColor="#dad5ce"
              cellSize={0.1}
              cellThickness={0.5}
              fadeDistance={900}
              fadeStrength={1.35}
              revealRadius={20}
              sectionColor="#c4bbb0"
              sectionSize={100}
              sectionThickness={0.72}
            />
            <CameraControls makeDefault />
            <CellCameraController entryKey={entryTrigger} fitTrigger={fitTrigger} />
            <CellSelectionManager />
          </Viewer>
        </div>
        <div className="pointer-events-none absolute top-4 right-4 left-4 z-40 flex items-start justify-center">
          <CellTopDock error={importError} onImport={handleImport} onNewScene={handleNewScene} />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-30"
          data-viewer-bounds
          style={{ transform: 'translateZ(0)' }}
        >
          <CellPanelManager />
        </div>
        <div className="pointer-events-none absolute right-4 bottom-4 left-4 z-40 flex items-center justify-center">
          <div className="pointer-events-auto">
            <CellComponentDock onFit={handleFit} onThicknessToggle={handleFit} />
          </div>
        </div>
      </main>
    </div>
  )
}
