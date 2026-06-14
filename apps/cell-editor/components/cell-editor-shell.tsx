'use client'

import { type SceneGraph, useScene, validateBuildJson } from '@pascal-app/core'
import { cn, Grid } from '@pascal-app/editor'
import { type OutlineStyle, useViewer, Viewer } from '@pascal-app/viewer'
import { CameraControls } from '@react-three/drei'
import { Bot, ChevronLeft, ChevronsRight, ListChecks, Goal } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { CellAgentDock } from '@/components/cell-agent-dock'
import { CellCameraController } from '@/components/cell-camera-controller'
import { CellComponentDock } from '@/components/cell-component-dock'
import { CellDesignGoalsPanel } from '@/components/cell-design-goals-panel'
import { CellPanelManager } from '@/components/cell-panel-manager'
import { CellSelectionManager } from '@/components/cell-selection-manager'
import {
  CellSimulationFieldOverlay,
  CellSimulationJobsPanel,
  CellSimulationResultsPanel,
  INITIAL_SIMULATION_PREVIEW_STATE,
  type SimulationPreviewState,
} from '@/components/cell-simulation-preview'
import { CellTopDock } from '@/components/cell-top-dock'
import {
  buildCellDesignFromScene,
  cellDesignToSceneGraph,
  isCellDesignJson,
} from '@/src/lib/cell-design'
import {
  applyCellSceneDefaults,
  createDefaultCellScene,
  saveCellSceneToLocalStorage,
} from '@/src/lib/defaults'
import {
  getExplodedPresentation,
  getPresentationThicknessScale,
  REAL_THICKNESS_SCALE,
  setExplodedPresentation,
  setPresentationThicknessScale,
} from '@/src/lib/presentation-thickness'
import type { DesignGoal } from '@/src/lib/projects/types'

function isUsableScene(graph: SceneGraph | null | undefined): graph is SceneGraph {
  return !!graph && Object.keys(graph.nodes).length > 0 && (graph.rootNodeIds?.length ?? 0) > 0
}

const CELL_SELECTED_STYLE: OutlineStyle = {
  visibleColor: 0x86_4f_ff,
  hiddenColor: 0x73_3f_ea,
  strength: 3.8,
  pulse: false,
}

type SidebarMode = 'agent' | 'goals' | 'results'
type EditorLoadingState = {
  message: string
  visible: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type CellEditorShellProps = {
  initialScene: unknown
  projectId: string
  projectName: string
}

function EditorLoadingOverlay({ message, visible }: EditorLoadingState) {
  if (!visible) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-[80] flex items-center justify-center bg-[#111113]/88 text-foreground backdrop-blur-md">
      <div className="flex min-w-60 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 shadow-2xl">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#facc15]/30 border-t-[#facc15]" />
        <div>
          <p className="font-semibold text-sm">{message}</p>
          <p className="text-[11px] text-muted-foreground">Framing cell geometry</p>
        </div>
      </div>
    </div>
  )
}

function SidebarButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
        active
          ? 'bg-white/12 text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]'
          : 'text-muted-foreground hover:bg-white/8 hover:text-foreground',
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  )
}

function CellWorkspaceSidebar({
  activeMode,
  children,
  expanded,
  onSelectAgent,
  onSelectGoals,
  onSelectResults,
  onToggleExpanded,
}: {
  activeMode: SidebarMode | null
  children: ReactNode
  expanded: boolean
  onSelectAgent: () => void
  onSelectGoals: () => void
  onSelectResults: () => void
  onToggleExpanded: () => void
}) {
  return (
    <aside className="pointer-events-auto absolute top-0 bottom-0 left-0 z-50 flex text-foreground">
      <div className="flex w-14 flex-col items-center border-border/50 border-r bg-[#111113]/96 py-3 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg text-white">
          <span className="grid grid-cols-3 gap-0.5">
            <span className="h-1.5 w-1.5 rounded-sm bg-white/95" />
            <span className="mt-2 h-1.5 w-1.5 rounded-sm bg-white/75" />
            <span className="mt-4 h-1.5 w-1.5 rounded-sm bg-white/55" />
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <SidebarButton
            active={activeMode === 'goals'}
            icon={<Goal className="h-5 w-5" />}
            label="Goals"
            onClick={onSelectGoals}
          />
          <SidebarButton
            active={activeMode === 'agent'}
            icon={<Bot className="h-5 w-5" />}
            label="Agent"
            onClick={onSelectAgent}
          />
          <SidebarButton
            active={activeMode === 'results'}
            icon={<ListChecks className="h-5 w-5" />}
            label="Jobs"
            onClick={onSelectResults}
          />
        </div>
        <div className="mt-auto flex flex-col items-center">
          <button
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              expanded
                ? 'bg-white/12 text-foreground'
                : 'bg-white/8 text-muted-foreground hover:bg-white/12 hover:text-foreground',
            )}
            onClick={onToggleExpanded}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            type="button"
          >
            {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {expanded && activeMode ? (
        <div className="h-full w-[min(390px,calc(100vw-5rem))] bg-background/95 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
      ) : null}
    </aside>
  )
}

function resolveProjectScene(initialScene: unknown): SceneGraph {
  if (isCellDesignJson(initialScene)) return cellDesignToSceneGraph(initialScene)

  const result = validateBuildJson(initialScene)
  if (result.ok && result.parsed && isUsableScene(result.parsed as SceneGraph)) {
    return result.parsed as SceneGraph
  }

  return createDefaultCellScene()
}

function saveStatusLabel(status: SaveStatus) {
  if (status === 'saving') return 'Saving'
  if (status === 'saved') return 'Saved'
  if (status === 'error') return 'Save failed'
  return 'Ready'
}

export function CellEditorShell({ initialScene, projectId, projectName }: CellEditorShellProps) {
  const [fitTrigger, setFitTrigger] = useState(0)
  const [entryTrigger, setEntryTrigger] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)
  const [editorLoading, setEditorLoading] = useState<EditorLoadingState>({
    message: 'Loading editor',
    visible: true,
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isSimulationPreview, setIsSimulationPreview] = useState(false)
  const [activeResultDetail, setActiveResultDetail] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode | null>('goals')
  const [simulationPreview, setSimulationPreview] = useState<SimulationPreviewState>(
    INITIAL_SIMULATION_PREVIEW_STATE,
  )
  const isLoadingSceneRef = useRef(false)
  const loadingHideTimeoutRef = useRef<number | null>(null)
  const loadingTimeoutRef = useRef<number | null>(null)
  const autosaveTimeoutRef = useRef<number | null>(null)
  const previousPreviewSceneRef = useRef<SceneGraph | null>(null)
  const previewSceneJobIdRef = useRef<string | null>(null)
  const previousPresentationRef = useRef<{ exploded: boolean; thicknessScale: number } | null>(null)

  const showEditorLoading = useCallback((message: string) => {
    setEditorLoading({ message, visible: true })
    if (loadingHideTimeoutRef.current !== null) {
      window.clearTimeout(loadingHideTimeoutRef.current)
      loadingHideTimeoutRef.current = null
    }
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current)
    }
    loadingTimeoutRef.current = window.setTimeout(() => {
      setEditorLoading((current) => ({ ...current, visible: false }))
      loadingTimeoutRef.current = null
      requestAnimationFrame(() => {
        setFitTrigger((n) => n + 1)
      })
    }, 3500)
  }, [])

  const hideEditorLoadingSoon = useCallback((animateAfterLoading = false) => {
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    if (loadingHideTimeoutRef.current !== null) {
      window.clearTimeout(loadingHideTimeoutRef.current)
    }
    loadingHideTimeoutRef.current = window.setTimeout(() => {
      setEditorLoading((current) => ({ ...current, visible: false }))
      loadingHideTimeoutRef.current = null
      if (animateAfterLoading) {
        requestAnimationFrame(() => {
          setFitTrigger((n) => n + 1)
        })
      }
    }, 1000)
  }, [])

  const applySceneGraph = useCallback(
    (sceneGraph: SceneGraph, { persist = true } = {}) => {
      const sceneWithDefaults = applyCellSceneDefaults(sceneGraph)
      setImportError(null)
      isLoadingSceneRef.current = true
      useScene.getState().unloadScene()
      useScene
        .getState()
        .setScene(sceneWithDefaults.nodes as never, sceneWithDefaults.rootNodeIds as never)
      useViewer.getState().setCameraMode('orthographic')
      useViewer.getState().setSceneTheme('studio')
      useViewer.getState().setShading('solid')
      useViewer.getState().setEdges('soft')
      useViewer.getState().setShowGrid(true)
      useViewer
        .getState()
        .setSelection({ selectedIds: [sceneWithDefaults.rootNodeIds[0] as never] })
      if (persist) {
        saveCellSceneToLocalStorage(sceneWithDefaults)
        setHasUnsavedChanges(false)
        setSaveStatus('saving')
        fetch(`/api/projects/${projectId}`, {
          body: JSON.stringify({ cell_design: sceneWithDefaults }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
          .then((response) => {
            if (!response.ok) throw new Error('Project save failed.')
            setSaveStatus('saved')
          })
          .catch(() => setSaveStatus('error'))
      }

      requestAnimationFrame(() => {
        isLoadingSceneRef.current = false
        setEntryTrigger((n) => n + 1)
      })
    },
    [projectId],
  )

  useEffect(() => {
    showEditorLoading('Loading editor')
    applySceneGraph(resolveProjectScene(initialScene), { persist: false })
  }, [applySceneGraph, initialScene, showEditorLoading])

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current !== null) {
        window.clearTimeout(loadingTimeoutRef.current)
      }
      if (loadingHideTimeoutRef.current !== null) {
        window.clearTimeout(loadingHideTimeoutRef.current)
      }
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = useScene.subscribe((state, previous) => {
      if (isLoadingSceneRef.current) return
      if (state.nodes === previous.nodes) return
      setHasUnsavedChanges(true)
      const sceneGraph = {
        nodes: state.nodes,
        rootNodeIds: state.rootNodeIds,
      } as unknown as SceneGraph
      saveCellSceneToLocalStorage(sceneGraph)

      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current)
      }
      setSaveStatus('saving')
      autosaveTimeoutRef.current = window.setTimeout(async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}`, {
            body: JSON.stringify({ cell_design: applyCellSceneDefaults(sceneGraph) }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          })
          if (!response.ok) throw new Error('Autosave failed.')
          setHasUnsavedChanges(false)
          setSaveStatus('saved')
        } catch {
          setSaveStatus('error')
        } finally {
          autosaveTimeoutRef.current = null
        }
      }, 800)
    })

    return unsubscribe
  }, [projectId])

  const handleFit = useCallback(() => {
    setFitTrigger((n) => n + 1)
  }, [])

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const raw = await file.text()
        const parsed = JSON.parse(raw) as unknown
        if (isCellDesignJson(parsed)) {
          showEditorLoading('Loading cell design')
          applySceneGraph(cellDesignToSceneGraph(parsed))
          return
        }

        const result = validateBuildJson(parsed)

        if (!result.ok || !result.parsed) {
          setImportError(result.errors[0]?.message ?? 'Invalid scene JSON.')
          return
        }

        showEditorLoading('Loading cell scene')
        applySceneGraph(result.parsed as SceneGraph)
      } catch {
        setImportError('Could not read that JSON file.')
      }
    },
    [applySceneGraph, showEditorLoading],
  )

  const handleExport = useCallback(() => {
    const state = useScene.getState()
    const sceneGraph = applyCellSceneDefaults({
      nodes: state.nodes,
      rootNodeIds: state.rootNodeIds,
    } as unknown as SceneGraph)
    const json = JSON.stringify(buildCellDesignFromScene(sceneGraph), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'cell-design.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setHasUnsavedChanges(false)
  }, [])

  const openSimulationPreview = useCallback(() => {
    showEditorLoading('Loading preview')
    previousPresentationRef.current = {
      exploded: getExplodedPresentation(),
      thicknessScale: getPresentationThicknessScale(),
    }
    setExplodedPresentation(false)
    setPresentationThicknessScale(REAL_THICKNESS_SCALE)
    useViewer.getState().setSelection({ selectedIds: [] })
    setIsSimulationPreview(true)
    requestAnimationFrame(() => {
      setFitTrigger((n) => n + 1)
    })
  }, [showEditorLoading])

  const restorePreviewScene = useCallback(() => {
    const previousScene = previousPreviewSceneRef.current
    previousPreviewSceneRef.current = null
    previewSceneJobIdRef.current = null
    if (!previousScene) return

    showEditorLoading('Restoring editor')
    applySceneGraph(previousScene, { persist: false })
  }, [applySceneGraph, showEditorLoading])

  const applyPredictionCellDesignPreview = useCallback(
    (cellDesign: unknown) => {
      if (!isCellDesignJson(cellDesign)) return
      if (previewSceneJobIdRef.current === simulationPreview.activePredictionId) return

      if (!previousPreviewSceneRef.current) {
        const current = useScene.getState()
        previousPreviewSceneRef.current = {
          nodes: current.nodes,
          rootNodeIds: current.rootNodeIds,
        } as unknown as SceneGraph
      }

      previewSceneJobIdRef.current = simulationPreview.activePredictionId
      showEditorLoading('Loading prediction cell')
      applySceneGraph(cellDesignToSceneGraph(cellDesign), { persist: false })
      requestAnimationFrame(() => {
        setFitTrigger((n) => n + 1)
      })
    },
    [applySceneGraph, showEditorLoading, simulationPreview.activePredictionId],
  )

  const closeSimulationPreview = useCallback(() => {
    restorePreviewScene()
    const previousPresentation = previousPresentationRef.current
    previousPresentationRef.current = null
    if (previousPresentation) {
      setExplodedPresentation(previousPresentation.exploded)
      setPresentationThicknessScale(previousPresentation.thicknessScale)
    }
    setSimulationPreview((current) => ({ ...current, activePredictionId: null, playing: false }))
    setIsSimulationPreview(false)
    setActiveResultDetail(false)
  }, [restorePreviewScene])

  const openAgentSidebar = useCallback(() => {
    if (isSimulationPreview) {
      closeSimulationPreview()
    }
    setSidebarMode('agent')
    setSidebarExpanded(true)
  }, [closeSimulationPreview, isSimulationPreview])

  const openResultsSidebar = useCallback(() => {
    if (isSimulationPreview) closeSimulationPreview()
    setSidebarMode('results')
    setSidebarExpanded(true)
  }, [closeSimulationPreview, isSimulationPreview])

  const openGoalsSidebar = useCallback(() => {
    if (isSimulationPreview) closeSimulationPreview()
    setSidebarMode('goals')
    setSidebarExpanded(true)
  }, [closeSimulationPreview, isSimulationPreview])

  const openResultDetail = useCallback(
    (jobId: string, metricId: string) => {
      setSimulationPreview((current) => ({
        ...current,
        activePredictionId: jobId,
        activeJobId: jobId,
        activeMetricId: metricId,
        currentTime: 0,
        playing: false,
      }))
      setActiveResultDetail(true)
      openSimulationPreview()
    },
    [openSimulationPreview],
  )

  const startDesignGoalsSimulation = useCallback(
    async (goals: DesignGoal[]) => {
      if (goals.length === 0) return

      const state = useScene.getState()
      const cellDesign = buildCellDesignFromScene(
        applyCellSceneDefaults({
          nodes: state.nodes,
          rootNodeIds: state.rootNodeIds,
        } as unknown as SceneGraph),
      )
      const response = await fetch('/api/predictions', {
        body: JSON.stringify({
          cell_design: cellDesign,
          label: 'Design goals simulation',
          name: 'Design goals simulation',
          project_id: projectId,
          simulation_config: {
            conditions: goals.map((goal) => ({
              ambient_temperature_c: goal.work_condition.temperature_c ?? 25,
              cutoff_voltage_v: goal.work_condition.cutoff_voltage_v,
              id: goal.id,
              label: goal.label,
              protocol: goal.work_condition.protocol ?? 'CC-CV',
              rate: goal.work_condition.rate ?? '1C',
              soc_pct: goal.work_condition.soc_pct,
              type: goal.work_condition.mode ?? 'discharge',
            })),
            design_goals: goals.map((goal) => ({
              constraints: goal.constraints,
              id: goal.id,
              label: goal.label,
              work_condition: goal.work_condition,
            })),
            duration: 60,
            source: 'design_goals',
          },
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || 'Could not start simulation.')
      }

      setSidebarMode('results')
      setSidebarExpanded(true)
    },
    [projectId],
  )

  const backToJobs = useCallback(() => {
    closeSimulationPreview()
    setSimulationPreview((current) => ({ ...current, activePredictionId: null }))
    setSidebarMode('results')
    setSidebarExpanded(true)
  }, [closeSimulationPreview])

  const closeSidebarPanel = useCallback(() => {
    if (sidebarMode === 'results') {
      closeSimulationPreview()
      setSidebarMode(null)
      return
    }
    setSidebarMode(null)
  }, [closeSimulationPreview, sidebarMode])

  return (
    <div className="dark flex h-screen w-screen bg-sidebar text-foreground">
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          <EditorLoadingOverlay message={editorLoading.message} visible={editorLoading.visible} />
          <Viewer
            defaultRender={{ shading: 'solid', textures: false, colorPreset: 'clay' }}
            renderContext="editor"
            selectedStyle={CELL_SELECTED_STYLE}
            selectionManager={isSimulationPreview ? 'default' : 'custom'}
          >
            <Grid
              cellColor="#dfdfdf"
              cellSize={0.05}
              cellThickness={0.5}
              fadeDistance={8}
              fadeStrength={1.35}
              revealRadius={3}
              sectionColor="#dfdfdf"
              sectionSize={0.5}
              sectionThickness={0.72}
            />
            <CameraControls makeDefault />
            <CellCameraController
              entryKey={entryTrigger}
              fitTrigger={fitTrigger}
              onEntryFramed={() => hideEditorLoadingSoon(true)}
              onFitFramed={() => hideEditorLoadingSoon(false)}
            />
            {isSimulationPreview ? (
              <CellSimulationFieldOverlay state={simulationPreview} />
            ) : (
              <CellSelectionManager />
            )}
          </Viewer>
        </div>
        <CellWorkspaceSidebar
          activeMode={sidebarMode}
          expanded={sidebarExpanded}
          onSelectAgent={openAgentSidebar}
          onSelectGoals={openGoalsSidebar}
          onSelectResults={openResultsSidebar}
          onToggleExpanded={() => {
            if (!sidebarExpanded && !sidebarMode) {
              setSidebarMode('goals')
            }
            setSidebarExpanded((expanded) => !expanded)
          }}
        >
          {sidebarMode === 'goals' ? (
            <CellDesignGoalsPanel
              embedded
              onClose={closeSidebarPanel}
              onStartSimulation={startDesignGoalsSimulation}
              projectId={projectId}
            />
          ) : null}
          {sidebarMode === 'agent' ? (
            <CellAgentDock
              embedded
              onClose={closeSidebarPanel}
              onFit={handleFit}
              projectId={projectId}
            />
          ) : null}
          {sidebarMode === 'results' && !activeResultDetail ? (
            <CellSimulationJobsPanel
              embedded
              onClose={closeSidebarPanel}
              onSelectJob={openResultDetail}
              projectId={projectId}
            />
          ) : null}
          {sidebarMode === 'results' && activeResultDetail ? (
            <CellSimulationResultsPanel
              embedded
              onBack={backToJobs}
              onCellDesignPreview={applyPredictionCellDesignPreview}
              onChange={(patch) =>
                setSimulationPreview((current) => ({
                  ...current,
                  ...patch,
                }))
              }
              onClose={closeSidebarPanel}
              state={simulationPreview}
            />
          ) : null}
        </CellWorkspaceSidebar>
        <div className="pointer-events-none absolute top-3 right-4 left-16 z-40 flex items-start justify-center">
          {!isSimulationPreview ? (
            <div className="flex items-start gap-2">
              <div className="pointer-events-auto flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-background/92 px-2.5 text-foreground shadow-2xl backdrop-blur-md">
                <Link
                  className="font-medium text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  href="/projects"
                >
                  All projects
                </Link>
                <span className="text-muted-foreground/50 text-[11px]">/</span>
                <span className="max-w-48 truncate font-semibold text-[11px]">{projectName}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    saveStatus === 'error'
                      ? 'bg-[#fca5a5]/12 text-[#fecaca]'
                      : hasUnsavedChanges || saveStatus === 'saving'
                        ? 'bg-[#facc15]/12 text-[#fde68a]'
                        : 'bg-[#86efac]/12 text-[#bbf7d0]',
                  )}
                >
                  {saveStatusLabel(saveStatus)}
                </span>
              </div>
              <CellTopDock error={importError} onExport={handleExport} onImport={handleImport} />
            </div>
          ) : (
            <div />
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-30"
          data-viewer-bounds
          style={{ transform: 'translateZ(0)' }}
        >
          {isSimulationPreview ? null : <CellPanelManager />}
        </div>
        {!isSimulationPreview ? (
          <div className="pointer-events-none absolute right-4 bottom-4 left-16 z-40 flex items-center justify-center">
            <div className="pointer-events-auto">
              <CellComponentDock onFit={handleFit} onThicknessToggle={handleFit} />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
