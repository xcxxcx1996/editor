import { CellEditorShell } from '@/components/cell-editor-shell'
import { createClient } from '@/src/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    redirect('/login?next=/')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/')

  return <CellEditorShell />
}
