import { notFound, redirect } from 'next/navigation'
import { CellEditorShell } from '@/components/cell-editor-shell'
import { createClient } from '@/src/lib/supabase/server'
import type { ProjectRecord } from '@/src/lib/projects/types'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/project/${id}`)

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) notFound()

  const project = data as ProjectRecord
  return (
    <CellEditorShell
      initialScene={project.cell_design}
      projectId={project.id}
      projectName={project.name}
    />
  )
}
