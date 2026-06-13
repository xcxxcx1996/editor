'use client'

import { type AnyNodeId, type SceneGraph, useScene } from '@pascal-app/core'
import { cn } from '@pascal-app/editor'
import {
  Bot,
  CheckCircle2,
  ChevronUp,
  ListChecks,
  Minimize2,
  Play,
  Send,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { buildCellDesignFromScene } from '@/src/lib/cell-design'
import { type CellStructureNode, resolveCellStructure } from '@/src/lib/cell-structure'
import { usePredictions } from '@/src/lib/predictions/use-predictions'

type AgentMessage = {
  id: number
  role: 'agent' | 'user'
  text: string
}

type AgentTask = {
  id: number
  title: string
  status: 'queued' | 'submitted'
}

type QuickAction = {
  id: string
  label: string
  prompt: string
  icon: ReactNode
}

type AgentProvider = 'local' | 'openai' | 'mcp'

type AgentSettings = {
  provider: AgentProvider
  openaiBaseUrl: string
  openaiApiKey: string
  openaiModel: string
  openaiTemperature: number
  mcpEndpoint: string
  mcpAuthToken: string
  mcpMethod: string
  mcpToolName: string
}

const AGENT_SETTINGS_KEY = 'pascal-cell-editor-agent-settings'

const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  provider: 'local',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiApiKey: '',
  openaiModel: 'gpt-4.1-mini',
  openaiTemperature: 0.2,
  mcpEndpoint: 'http://127.0.0.1:8787/mcp',
  mcpAuthToken: '',
  mcpMethod: 'tools/call',
  mcpToolName: 'cell_agent',
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'normalize-tabs',
    label: 'Normalize tabs',
    prompt: 'Set tab width to 80 mm and tab length to 30 mm.',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    id: 'validate-stack',
    label: 'Check stack',
    prompt: 'Check current stack dimensions and report what will be simulated.',
    icon: <ListChecks className="h-3.5 w-3.5" />,
  },
  {
    id: 'submit-simulation',
    label: 'Submit simulation',
    prompt: 'Submit an electrochemical simulation task for the current cell.',
    icon: <Play className="h-3.5 w-3.5" />,
  },
]

function nextId() {
  return Date.now() + Math.floor(Math.random() * 1000)
}

function parseNumberAfter(input: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = input.match(pattern)
    const value = match?.[1] ? Number.parseFloat(match[1]) : Number.NaN
    if (Number.isFinite(value)) return value
  }
  return null
}

function loadAgentSettings(): AgentSettings {
  if (typeof window === 'undefined') return DEFAULT_AGENT_SETTINGS

  try {
    const raw = window.localStorage.getItem(AGENT_SETTINGS_KEY)
    if (!raw) return DEFAULT_AGENT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AgentSettings>
    return { ...DEFAULT_AGENT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_AGENT_SETTINGS
  }
}

function sceneSummary(
  structure: ReturnType<typeof resolveCellStructure>,
  nodes: Record<string, CellStructureNode>,
) {
  const stack = structure.stackId
    ? (nodes[structure.stackId] as unknown as Record<string, unknown>)
    : null
  const cell = structure.cellId
    ? (nodes[structure.cellId] as unknown as Record<string, unknown>)
    : null

  return {
    cell: {
      electrode_length: cell?.electrode_length,
      electrode_width: cell?.electrode_width,
    },
    stack: {
      number_of_layers: stack?.number_of_layers,
    },
    componentIds: structure.components,
  }
}

function parseOpenAiMessage(payload: unknown): string {
  const response = payload as {
    choices?: Array<{ message?: { content?: unknown } }>
    error?: { message?: string }
  }
  const content = response.choices?.[0]?.message?.content
  if (typeof content === 'string' && content.trim()) return content.trim()
  if (response.error?.message) return `OpenAI-compatible endpoint error: ${response.error.message}`
  return 'OpenAI-compatible endpoint returned no assistant message.'
}

function parseMcpResult(payload: unknown): string {
  const response = payload as {
    result?: {
      content?: Array<{ text?: unknown }>
      structuredContent?: unknown
    }
    error?: { message?: string }
  }
  if (response.error?.message) return `MCP endpoint error: ${response.error.message}`

  const text = response.result?.content
    ?.map((item) => (typeof item.text === 'string' ? item.text : null))
    .filter(Boolean)
    .join('\n')
  if (text) return text

  if (response.result?.structuredContent) {
    return JSON.stringify(response.result.structuredContent, null, 2)
  }

  return 'MCP endpoint returned an empty result.'
}

export function CellAgentDock({
  embedded = false,
  onClose,
  onFit,
}: {
  embedded?: boolean
  onClose?: () => void
  onFit: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<AgentSettings>(() => loadAgentSettings())
  const [draft, setDraft] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 1,
      role: 'agent',
      text: 'Ready. Ask me to adjust cell parameters, check the stack, or submit a simulation task.',
    },
  ])
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const nodes = useScene((s) => s.nodes)
  const sceneNodes = nodes as unknown as Record<string, CellStructureNode>
  const structure = useMemo(() => resolveCellStructure(sceneNodes), [sceneNodes])
  const { createPrediction } = usePredictions({ limit: 20 })
  const activeProviderLabel =
    settings.provider === 'openai'
      ? 'OpenAI-compatible'
      : settings.provider === 'mcp'
        ? 'MCP-compatible'
        : 'Local'

  useEffect(() => {
    window.localStorage.setItem(AGENT_SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const appendMessage = useCallback((role: AgentMessage['role'], text: string) => {
    setMessages((current) => [...current, { id: nextId(), role, text }])
  }, [])

  const submitSimulationTask = useCallback(async (title: string) => {
    const state = useScene.getState()
    const cellDesign = buildCellDesignFromScene({
      nodes: state.nodes,
      rootNodeIds: state.rootNodeIds,
    } as unknown as SceneGraph)
    const prediction = await createPrediction({
      cell_design: cellDesign,
      label: title,
      name: title,
      simulation_config: {
        duration: 60,
        conditions: [
          {
            id: 'default',
            label: title,
            type: 'charge',
            ambient_temperature_c: 25,
            protocol: 'CC-CV',
            rate: '1C',
          },
        ],
      },
    })
    const task: AgentTask = { id: nextId(), title, status: 'submitted' }
    setTasks((current) => [task, ...current].slice(0, 4))
    return `Simulation task submitted: ${title} (${prediction.id}).`
  }, [createPrediction])

  const runLocalCommand = useCallback(
    async (input: string) => {
      const state = useScene.getState()
      const updates: string[] = []
      const layerCount = parseNumberAfter(input, [
        /(?:层数|layers?|number_of_layers)\D*(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*(?:层|layers?)/i,
      ])
      const tabWidth = parseNumberAfter(input, [
        /(?:极耳|tab)[\s\S]*(?:宽度|width)\D*(\d+(?:\.\d+)?)/i,
        /(?:宽度|width)\D*(\d+(?:\.\d+)?)[\s\S]*(?:极耳|tab)/i,
      ])
      const tabLength = parseNumberAfter(input, [
        /(?:极耳|tab)[\s\S]*(?:长度|length)\D*(\d+(?:\.\d+)?)/i,
        /(?:长度|length)\D*(\d+(?:\.\d+)?)[\s\S]*(?:极耳|tab)/i,
      ])

      if (layerCount && structure.stackId) {
        const nextLayerCount = Math.max(1, Math.round(layerCount))
        state.updateNode(
          structure.stackId as AnyNodeId,
          { number_of_layers: nextLayerCount } as never,
        )
        updates.push(`set number_of_layers to ${nextLayerCount}`)
      }

      if (tabWidth) {
        const patch = { cc_p_tab_width: tabWidth }
        const anodePatch = { cc_n_tab_width: tabWidth }
        const cathodeCollectorId = structure.components['cathode-current-collector']
        const anodeCollectorId = structure.components['anode-current-collector']
        if (cathodeCollectorId) state.updateNode(cathodeCollectorId as AnyNodeId, patch as never)
        if (anodeCollectorId) state.updateNode(anodeCollectorId as AnyNodeId, anodePatch as never)
        updates.push(`set tab width to ${tabWidth} mm`)
      }

      if (tabLength) {
        const patch = { cc_p_tab_length: tabLength }
        const anodePatch = { cc_n_tab_length: tabLength }
        const cathodeCollectorId = structure.components['cathode-current-collector']
        const anodeCollectorId = structure.components['anode-current-collector']
        if (cathodeCollectorId) state.updateNode(cathodeCollectorId as AnyNodeId, patch as never)
        if (anodeCollectorId) state.updateNode(anodeCollectorId as AnyNodeId, anodePatch as never)
        updates.push(`set tab length to ${tabLength} mm`)
      }

      if (/fit|适配|视图|view/i.test(input)) {
        onFit()
        updates.push('fit the view')
      }

      if (/check|validate|检查|校验/i.test(input)) {
        const currentNodes = state.nodes as unknown as Record<string, Record<string, unknown>>
        const stack = structure.stackId ? currentNodes[structure.stackId] : null
        const cell = structure.cellId ? currentNodes[structure.cellId] : null
        return `Stack check complete: ${cell?.electrode_length ?? '-'} x ${
          cell?.electrode_width ?? '-'
        } mm, ${stack?.number_of_layers ?? '-'} layers. Ready for simulation submission.`
      }

      if (/submit|simulation|simulate|模拟|仿真|任务/i.test(input)) {
        return await submitSimulationTask('Electrochemical cell simulation')
      }

      if (updates.length > 0) return `Applied: ${updates.join(', ')}.`

      return 'I can adjust clear numeric parameters, check the stack, fit the view, or submit a simulation task. Try "set layers to 27" or "tab width 80".'
    },
    [onFit, structure, submitSimulationTask],
  )

  const runOpenAiCommand = useCallback(
    async (input: string) => {
      if (!settings.openaiBaseUrl.trim() || !settings.openaiModel.trim()) {
        return 'OpenAI-compatible settings need a base URL and model.'
      }
      if (!settings.openaiApiKey.trim()) {
        return 'OpenAI-compatible settings need an API key before remote calls are enabled.'
      }

      const baseUrl = settings.openaiBaseUrl.replace(/\/+$/, '')
      const response = await fetch(`${baseUrl}/chat/completions`, {
        body: JSON.stringify({
          model: settings.openaiModel,
          temperature: settings.openaiTemperature,
          messages: [
            {
              role: 'system',
              content:
                'You are a battery cell editor assistant. Be concise. Suggest exact editable parameters when possible. The local app can apply numeric layer, tab width, tab length, fit view, check stack, and submit simulation commands.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                request: input,
                scene: sceneSummary(structure, sceneNodes),
              }),
            },
          ],
        }),
        headers: {
          Authorization: `Bearer ${settings.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as unknown
      return parseOpenAiMessage(payload)
    },
    [sceneNodes, settings, structure],
  )

  const runMcpCommand = useCallback(
    async (input: string) => {
      if (!settings.mcpEndpoint.trim()) {
        return 'MCP-compatible settings need an endpoint URL.'
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (settings.mcpAuthToken.trim()) {
        headers.Authorization = `Bearer ${settings.mcpAuthToken}`
      }

      const params =
        settings.mcpMethod === 'tools/call'
          ? {
              name: settings.mcpToolName,
              arguments: {
                message: input,
                scene: sceneSummary(structure, sceneNodes),
              },
            }
          : {
              message: input,
              scene: sceneSummary(structure, sceneNodes),
            }

      const response = await fetch(settings.mcpEndpoint, {
        body: JSON.stringify({
          id: nextId(),
          jsonrpc: '2.0',
          method: settings.mcpMethod,
          params,
        }),
        headers,
        method: 'POST',
      })
      const payload = (await response.json()) as unknown
      return parseMcpResult(payload)
    },
    [sceneNodes, settings, structure],
  )

  const runAgentCommand = useCallback(
    async (input: string) => {
      if (settings.provider === 'openai') return runOpenAiCommand(input)
      if (settings.provider === 'mcp') return runMcpCommand(input)
      return runLocalCommand(input)
    },
    [runLocalCommand, runMcpCommand, runOpenAiCommand, settings.provider],
  )

  const handleSubmit = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault()
      const input = draft.trim()
      if (!input || isRunning) return
      setDraft('')
      appendMessage('user', input)
      setIsRunning(true)
      try {
        appendMessage('agent', await runAgentCommand(input))
      } catch (error) {
        appendMessage(
          'agent',
          error instanceof Error
            ? `Agent request failed: ${error.message}`
            : 'Agent request failed.',
        )
      } finally {
        setIsRunning(false)
      }
    },
    [appendMessage, draft, isRunning, runAgentCommand],
  )

  const handleQuickAction = useCallback(
    async (prompt: string) => {
      if (isRunning) return
      setDraft(prompt)
      appendMessage('user', prompt)
      setIsRunning(true)
      try {
        appendMessage('agent', await runAgentCommand(prompt))
      } catch (error) {
        appendMessage(
          'agent',
          error instanceof Error
            ? `Agent request failed: ${error.message}`
            : 'Agent request failed.',
        )
      } finally {
        setIsRunning(false)
      }
    },
    [appendMessage, isRunning, runAgentCommand],
  )

  const isOpen = embedded || expanded

  if (!isOpen) {
    return (
      <button
        className="flex h-11 items-center gap-2 rounded-lg border border-border/60 bg-background/92 px-3 font-medium text-foreground text-xs shadow-2xl backdrop-blur-md transition-colors hover:bg-white/8"
        onClick={() => setExpanded(true)}
        title="Open cell agent"
        type="button"
      >
        <Bot className="h-4.5 w-4.5 text-[#818cf8]" />
        <span>Agent</span>
        <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {activeProviderLabel}
        </span>
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      </button>
    )
  }

  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden bg-background/95 text-foreground',
        embedded
          ? 'h-full border-border/60 border-l'
          : 'h-[520px] max-h-[calc(100dvh-7rem)] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-border/60 shadow-2xl backdrop-blur-xl',
      )}
    >
      <header className="flex h-13 shrink-0 items-center justify-between border-border/60 border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#818cf8]/16 text-[#a5b4fc]">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-sm">Cell Agent</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {activeProviderLabel} command bridge and simulation queue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md bg-[#2C2C2E] text-muted-foreground transition-colors hover:bg-[#3e3e3e] hover:text-foreground',
              settingsOpen && 'bg-[#818cf8]/20 text-[#c7d2fe]',
            )}
            onClick={() => setSettingsOpen((open) => !open)}
            title="Agent settings"
            type="button"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2C2C2E] text-muted-foreground transition-colors hover:bg-[#3e3e3e] hover:text-foreground"
            onClick={() => setExpanded(false)}
            title="Minimize"
            type="button"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2C2C2E] text-muted-foreground transition-colors hover:bg-[#3e3e3e] hover:text-foreground"
            onClick={() => {
              if (embedded) {
                onClose?.()
              } else {
                setExpanded(false)
              }
              setDraft('')
            }}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto]">
        <div className="no-scrollbar min-h-0 overflow-y-auto px-3 py-3">
          {settingsOpen ? (
            <div className="mb-3 rounded-lg border border-[#818cf8]/30 bg-[#111113] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-xs">Agent settings</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Switch between local commands, OpenAI-compatible chat, and MCP JSON-RPC.
                  </p>
                </div>
                <span className="rounded-full border border-border/50 px-2 py-1 text-[10px] text-muted-foreground">
                  {activeProviderLabel}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-black/30 p-1">
                {(['local', 'openai', 'mcp'] as const).map((provider) => (
                  <button
                    className={cn(
                      'h-8 rounded-md font-medium text-[11px] transition-colors',
                      settings.provider === provider
                        ? 'bg-[#818cf8] text-white'
                        : 'text-muted-foreground hover:bg-white/8 hover:text-foreground',
                    )}
                    key={provider}
                    onClick={() => setSettings((current) => ({ ...current, provider }))}
                    type="button"
                  >
                    {provider === 'local' ? 'Local' : provider === 'openai' ? 'OpenAI' : 'MCP'}
                  </button>
                ))}
              </div>

              {settings.provider === 'openai' ? (
                <div className="grid gap-2">
                  <label className="grid gap-1 text-[11px] text-muted-foreground">
                    Base URL
                    <input
                      className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          openaiBaseUrl: event.target.value,
                        }))
                      }
                      value={settings.openaiBaseUrl}
                    />
                  </label>
                  <div className="grid grid-cols-[1fr_88px] gap-2">
                    <label className="grid gap-1 text-[11px] text-muted-foreground">
                      Model
                      <input
                        className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            openaiModel: event.target.value,
                          }))
                        }
                        value={settings.openaiModel}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] text-muted-foreground">
                      Temp
                      <input
                        className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                        max={2}
                        min={0}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            openaiTemperature: Number.parseFloat(event.target.value) || 0,
                          }))
                        }
                        step={0.1}
                        type="number"
                        value={settings.openaiTemperature}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1 text-[11px] text-muted-foreground">
                    API key
                    <input
                      className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          openaiApiKey: event.target.value,
                        }))
                      }
                      placeholder="sk-..."
                      type="password"
                      value={settings.openaiApiKey}
                    />
                  </label>
                </div>
              ) : null}

              {settings.provider === 'mcp' ? (
                <div className="grid gap-2">
                  <label className="grid gap-1 text-[11px] text-muted-foreground">
                    Endpoint
                    <input
                      className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          mcpEndpoint: event.target.value,
                        }))
                      }
                      value={settings.mcpEndpoint}
                    />
                  </label>
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <label className="grid gap-1 text-[11px] text-muted-foreground">
                      Method
                      <input
                        className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            mcpMethod: event.target.value,
                          }))
                        }
                        value={settings.mcpMethod}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] text-muted-foreground">
                      Tool
                      <input
                        className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            mcpToolName: event.target.value,
                          }))
                        }
                        value={settings.mcpToolName}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1 text-[11px] text-muted-foreground">
                    Bearer token
                    <input
                      className="h-8 rounded-md border border-border/60 bg-[#1f1f21] px-2 text-foreground outline-none focus:border-[#818cf8]/70"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          mcpAuthToken: event.target.value,
                        }))
                      }
                      placeholder="optional"
                      type="password"
                      value={settings.mcpAuthToken}
                    />
                  </label>
                </div>
              ) : null}

              {settings.provider === 'local' ? (
                <p className="rounded-md bg-white/[0.04] px-2 py-2 text-[11px] text-muted-foreground">
                  Local mode applies supported numeric edits directly in the scene without a network
                  request.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div
                className={cn(
                  'max-w-[86%] rounded-lg px-3 py-2 text-xs leading-5',
                  message.role === 'user'
                    ? 'ml-auto bg-[#818cf8] text-white'
                    : 'mr-auto border border-border/50 bg-white/[0.04] text-foreground',
                )}
                key={message.id}
              >
                {message.text}
              </div>
            ))}
          </div>

          {tasks.length > 0 ? (
            <div className="mt-4 rounded-lg border border-border/50 bg-black/20 p-2">
              <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#86efac]" />
                Submitted tasks
              </div>
              <div className="flex flex-col gap-1.5">
                {tasks.map((task) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-2 py-1.5 text-[11px]"
                    key={task.id}
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="shrink-0 text-[#86efac]">{task.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-border/60 border-t p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                className="flex h-8 items-center gap-1.5 rounded-md border border-border/50 bg-white/[0.04] px-2.5 font-medium text-[11px] text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
                disabled={isRunning}
                key={action.id}
                onClick={() => handleQuickAction(action.prompt)}
                type="button"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>

          <form className="flex items-end gap-2" onSubmit={handleSubmit}>
            <textarea
              className="min-h-10 flex-1 resize-none rounded-lg border border-border/60 bg-[#1f1f21] px-3 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#818cf8]/70"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Ask: set layers to 27, tab width 80, submit simulation..."
              rows={2}
              value={draft}
            />
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#818cf8] text-white transition-colors hover:bg-[#6f79ea] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!draft.trim() || isRunning}
              type="submit"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
