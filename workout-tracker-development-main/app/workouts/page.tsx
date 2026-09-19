import { getExercises } from "@/app/actions/exercises"
import { getWorkoutLogs } from "@/app/actions/workouts"
import { AppShell } from "@/components/app-shell"
import { WorkoutsView } from "@/components/workouts/workouts-view"
import { requireUser } from "@/lib/get-user"

export default async function WorkoutsPage() {
  const user = await requireUser()
  const [workouts, exercises] = await Promise.all([getWorkoutLogs(), getExercises()])

  return (
    <AppShell user={user}>
      <WorkoutsView
        workouts={workouts}
        exerciseNames={exercises.map((e) => e.name)}
      />
    </AppShell>
  )
}
