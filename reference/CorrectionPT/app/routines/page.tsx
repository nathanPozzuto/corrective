import { getExercises } from "@/app/actions/exercises"
import { getRoutines } from "@/app/actions/routines"
import { AppShell } from "@/components/app-shell"
import { RoutinesView } from "@/components/routines/routines-view"
import { requireUser } from "@/lib/get-user"

export default async function RoutinesPage() {
  const user = await requireUser()
  const [routines, exercises] = await Promise.all([getRoutines(), getExercises()])

  return (
    <AppShell user={user}>
      <RoutinesView routines={routines} exercises={exercises} />
    </AppShell>
  )
}
