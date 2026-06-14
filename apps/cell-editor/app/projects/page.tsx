import { BatteryCharging, Box, LogOut, Goal, Zap } from 'lucide-react'
import Link from 'next/link'
import { CreateProjectButton } from '@/components/create-project-button'
import { createClient } from '@/src/lib/supabase/server'
import type { ProjectRecord } from '@/src/lib/projects/types'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  const items = (projects ?? []) as ProjectRecord[]

  return (
    <div className="dark min-h-screen bg-[#111113] text-foreground">
      <header className="sticky top-0 z-20 border-white/10 border-b bg-[#111113]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link className="flex items-center gap-3" href="/projects">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#facc15]/14 text-[#fde68a]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Cell Editor</p>
              <p className="text-[11px] text-muted-foreground">Projects</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <CreateProjectButton />
            <form action="/auth/logout" method="post">
              <button
                className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 font-medium text-muted-foreground text-xs transition-colors hover:bg-white/8 hover:text-foreground"
                type="submit"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8 grid gap-4 border-white/10 border-b pb-8 md:grid-cols-[1fr_320px]">
          <div>
            <p className="mb-3 flex items-center gap-2 font-medium text-[#fde68a] text-xs uppercase tracking-[0.18em]">
              <BatteryCharging className="h-4 w-4" />
              Battery design workspace
            </p>
            <h1 className="font-semibold text-4xl text-white tracking-[-0.02em]">Projects</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-6">
              Manage persisted cell designs, design goals, and simulation jobs from one scoped
              workspace.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-sm">
              <Goal className="h-4 w-4 text-[#86efac]" />
              <span className="font-semibold">{items.length} projects</span>
            </div>
            <p className="mt-2 text-muted-foreground text-xs leading-5">
              New prediction jobs and design goals are saved under the project you open.
            </p>
          </div>
        </section>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/16 bg-white/[0.03] px-6 py-14 text-center">
            <Box className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-semibold text-lg">No projects yet</h2>
            <p className="mt-2 text-muted-foreground text-sm">Create one to start editing a cell.</p>
            <div className="mt-5 flex justify-center">
              <CreateProjectButton />
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((project) => (
              <li key={project.id}>
                <Link
                  className="group block rounded-lg border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-[#facc15]/45 hover:bg-[#facc15]/8"
                  href={`/project/${project.id}`}
                >
                  <div className="flex aspect-video items-center justify-center rounded-md border border-white/10 bg-[linear-gradient(135deg,rgba(250,204,21,0.18),rgba(129,140,248,0.10)),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]">
                    <div className="h-8 w-32 rounded-full border border-white/20 bg-white/16 shadow-2xl" />
                  </div>
                  <div className="mt-4">
                    <h2 className="truncate font-semibold text-sm text-white group-hover:text-[#fde68a]">
                      {project.name}
                    </h2>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <span className="truncate">{project.id.slice(0, 8)}</span>
                      <time dateTime={project.updated_at}>{formatDate(project.updated_at)}</time>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
